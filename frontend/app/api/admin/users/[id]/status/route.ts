import { NextRequest, NextResponse } from "next/server";
import { updateServerUserActive } from "@/lib/server/user-profiles";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization");
    const body = await req.json().catch(() => ({}));
    const active = Boolean(body.active);
    const username = body.username as string | undefined;

    // 1. Update server cache (.user-profiles-cache.json) immediately
    const updatedProfile = updateServerUserActive(username || id, active);

    // 2. Also try forwarding to Spring Boot backend on Railway
    let backendSuccess = false;
    let backendErrorMessage = "";

    if (authHeader) {
      try {
        // Try with body
        const res1 = await fetch(`${API_BASE_URL}/admin/users/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ active }),
        });

        if (res1.ok) {
          backendSuccess = true;
        } else {
          // Try with query parameter ?active=...
          const res2 = await fetch(
            `${API_BASE_URL}/admin/users/${id}/status?active=${active}`,
            {
              method: "PATCH",
              headers: {
                Authorization: authHeader,
              },
            }
          );
          if (res2.ok) {
            backendSuccess = true;
          } else {
            const errJson = await res2.json().catch(() => ({}));
            backendErrorMessage = errJson.message || `HTTP ${res2.status}`;
          }
        }
      } catch (beErr) {
        backendErrorMessage = beErr instanceof Error ? beErr.message : "Backend unreachable";
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id,
        active,
        backendSynced: backendSuccess,
        backendError: backendErrorMessage || undefined,
        profile: updatedProfile,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Lỗi cập nhật trạng thái người dùng",
      },
      { status: 500 }
    );
  }
}
