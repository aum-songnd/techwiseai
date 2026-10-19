import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "app/api/blogs/db.json");

export async function GET() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const db = JSON.parse(raw);
    return NextResponse.json({ success: true, data: db.authors });
  } catch {
    return NextResponse.json({ success: false, message: "Lỗi đọc tác giả" }, { status: 500 });
  }
}
