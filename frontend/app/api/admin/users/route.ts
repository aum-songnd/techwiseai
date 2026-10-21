import { NextRequest, NextResponse } from "next/server";
import {
  listAllServerProfiles,
  readServerProfiles,
} from "@/lib/server-user-profiles";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || "0");
  const size = Number(searchParams.get("size") || "10");
  const keyword = (searchParams.get("keyword") || "").toLowerCase().trim();
  const authHeader = req.headers.get("authorization");

  let backendUsers: any[] = [];
  let total = 0;
  let totalPages = 1;
  let backendOk = false;

  if (authHeader) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users?${searchParams.toString()}`, {
        cache: "no-store",
        headers: {
          Authorization: authHeader,
        },
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        if (Array.isArray(data)) {
          backendUsers = data;
          total = data.length;
        } else if (data && typeof data === "object") {
          backendUsers = data.content || data.items || [];
          total = data.totalElements ?? data.total ?? backendUsers.length;
          totalPages = data.totalPages ?? Math.max(1, Math.ceil(total / size));
        }
        backendOk = true;
      }
    } catch {}
  }

  // Read local server user profile overrides (e.g. locked/active status)
  const serverProfiles = readServerProfiles();
  const allProfiles = listAllServerProfiles();

  if (backendOk && backendUsers.length > 0) {
    // Enrich backend users with local status overrides
    const merged = backendUsers.map((u) => {
      const key = (u.username || "").toLowerCase();
      const p = serverProfiles[key];
      const isLocked = p?.locked === true || p?.active === false;
      return {
        ...u,
        active: isLocked ? false : (u.active !== false && !u.locked),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        content: merged,
        totalElements: total,
        totalPages,
      },
    });
  }

  // Fallback to server profiles
  let filtered = allProfiles;
  if (keyword) {
    filtered = filtered.filter(
      (u) =>
        u.username.toLowerCase().includes(keyword) ||
        (u.fullName && u.fullName.toLowerCase().includes(keyword)) ||
        (u.email && u.email.toLowerCase().includes(keyword)) ||
        (u.phoneNumber && u.phoneNumber.includes(keyword))
    );
  }

  const start = page * size;
  const paged = filtered.slice(start, start + size);

  return NextResponse.json({
    success: true,
    data: {
      content: paged,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / size)),
    },
  });
}
