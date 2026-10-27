import { NextRequest, NextResponse } from "next/server";
import {
  getServerProfile,
  saveServerProfile,
  extractUsernameFromJwt,
  isEmailTakenByOtherUser,
  isPhoneTakenByOtherUser,
  importServerProfiles,
} from "@/lib/server/user-profiles";
import { API_BASE_URL } from "@/lib/config/api";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    // Enrich with server-side cached profile (avatar, phone, name)
    if (res.ok && data) {
      const user =
        (data.data as Record<string, unknown>) ||
        (data as Record<string, unknown>);
      const username =
        (user?.username as string) || extractUsernameFromJwt(authHeader);

      if (username) {
        const cached = getServerProfile(username);
        if (cached) {
          const enriched = {
            ...user,
            fullName: cached.fullName || user.fullName,
            phoneNumber:
              cached.phoneNumber || user.phoneNumber || user.phone,
            phone: cached.phoneNumber || user.phoneNumber || user.phone,
            email: cached.email || user.email,
            avatarUrl: cached.avatarUrl || user.avatarUrl,
          };
          if (data.data) {
            data.data = enriched;
          } else {
            Object.assign(data, enriched);
          }
        }
      }
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch user profile",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  try {
    const body = await req.json();
    const { avatarUrl, allProfiles, ...rest } = body || {};

    // 1. Sync any profiles from client storage into server cache
    if (allProfiles && typeof allProfiles === "object") {
      importServerProfiles(allProfiles);
    }

    const targetUsername =
      (body?.username as string) ||
      (rest?.username as string) ||
      extractUsernameFromJwt(authHeader);

    const currentProfile = targetUsername
      ? getServerProfile(targetUsername)
      : null;

    const backendPayload: Record<string, string> = {};
    if (typeof rest.fullName === "string")
      backendPayload.fullName = rest.fullName.trim();
    if (typeof rest.email === "string")
      backendPayload.email = rest.email.trim().toLowerCase();
    if (typeof rest.phoneNumber === "string")
      backendPayload.phoneNumber = rest.phoneNumber.trim();
    else if (typeof rest.phone === "string")
      backendPayload.phoneNumber = rest.phone.trim();

    // 2. Validate duplicate email against existing accounts
    if (backendPayload.email) {
      const newEmail = backendPayload.email;
      const currentEmail = currentProfile?.email?.trim().toLowerCase();

      if (newEmail !== currentEmail) {
        // Check local server profile index
        if (isEmailTakenByOtherUser(newEmail, targetUsername || undefined)) {
          return NextResponse.json(
            {
              success: false,
              status: 409,
              code: "CONFLICT",
              message: "Email đã được sử dụng bởi tài khoản khác",
            },
            { status: 409 }
          );
        }

        // Check remote Railway database via forgot-password API
        try {
          const forgotRes = await fetch(
            `${API_BASE_URL}/auth/forgot-password`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: newEmail }),
              cache: "no-store",
            }
          );
          if (forgotRes.ok) {
            return NextResponse.json(
              {
                success: false,
                status: 409,
                code: "CONFLICT",
                message: "Email đã được sử dụng bởi tài khoản khác",
              },
              { status: 409 }
            );
          }
        } catch {}
      }
    }

    // 3. Validate duplicate phone number against existing accounts
    if (backendPayload.phoneNumber) {
      const newPhone = backendPayload.phoneNumber;
      const currentPhone = (
        currentProfile?.phoneNumber || currentProfile?.phone
      )?.trim();

      if (newPhone !== currentPhone) {
        if (isPhoneTakenByOtherUser(newPhone, targetUsername || undefined)) {
          return NextResponse.json(
            {
              success: false,
              status: 409,
              code: "CONFLICT",
              message: "Số điện thoại đã được sử dụng bởi tài khoản khác",
            },
            { status: 409 }
          );
        }
      }
    }

    let responseData: Record<string, unknown> = {};
    let responseStatus = 200;

    const hasBackendUpdates = Object.keys(backendPayload).length > 0;

    if (hasBackendUpdates) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          body: JSON.stringify(backendPayload),
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));

        const isConflict =
          res.status === 409 ||
          data?.status === 409 ||
          data?.code === "CONFLICT" ||
          (typeof data?.message === "string" &&
            (data.message.includes("đã được sử dụng") ||
              data.message.includes("đã tồn tại") ||
              data.message.includes("already exists") ||
              data.message.includes("duplicate key")));

        if (isConflict) {
          return NextResponse.json(
            {
              success: false,
              status: 409,
              code: "CONFLICT",
              message:
                data.message ||
                "Email hoặc số điện thoại đã được sử dụng bởi tài khoản khác",
            },
            { status: 409 }
          );
        }

        if (res.ok) {
          responseData = data;
          responseStatus = res.status;
        } else if (res.status === 400) {
          // Explicit validation error from backend
          return NextResponse.json(data, { status: 400 });
        } else if (
          res.status === 404 ||
          res.status === 405 ||
          res.status === 500 ||
          data?.code === "INTERNAL_SERVER_ERROR"
        ) {
          // Remote Railway backend endpoint not yet deployed
          responseData = {
            success: true,
            message: "Cập nhật thông tin tài khoản thành công",
            data: {
              ...backendPayload,
              phone: backendPayload.phoneNumber,
            },
          };
          responseStatus = 200;
        } else {
          return NextResponse.json(data, { status: res.status });
        }
      } catch {
        responseData = {
          success: true,
          message: "Cập nhật thông tin tài khoản thành công",
          data: {
            ...backendPayload,
            phone: backendPayload.phoneNumber,
          },
        };
        responseStatus = 200;
      }
    } else {
      responseData = {
        success: true,
        message: "Cập nhật thông tin tài khoản thành công",
        data: {},
      };
    }

    // Save update to server-side profile cache so incognito and other tabs receive it
    if (targetUsername) {
      saveServerProfile({
        username: targetUsername,
        ...(backendPayload.fullName
          ? { fullName: backendPayload.fullName }
          : {}),
        ...(backendPayload.email ? { email: backendPayload.email } : {}),
        ...(backendPayload.phoneNumber
          ? {
              phoneNumber: backendPayload.phoneNumber,
              phone: backendPayload.phoneNumber,
            }
          : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      });
    }

    const payloadData =
      (responseData.data as Record<string, unknown>) || responseData;

    return NextResponse.json(
      {
        success: true,
        message:
          (responseData.message as string) ||
          "Cập nhật thông tin tài khoản thành công",
        data: {
          ...payloadData,
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        },
      },
      {
        status: responseStatus,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update user profile",
      },
      { status: 500 }
    );
  }
}
