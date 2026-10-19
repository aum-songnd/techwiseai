import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Blog } from "@/app/data/types";

const DB_PATH = path.join(process.cwd(), "app/api/blogs/db.json");

type BlogDB = {
  blogs: Blog[];
  blogCategories: { id: string; title: string; slug: string; description?: string }[];
  authors: { id: string; name: string; slug: string; imageUrl?: string; bio?: string }[];
};

async function readDB(): Promise<BlogDB> {
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeDB(data: BlogDB): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const db = await readDB();
    const blog = db.blogs.find((b) => b.id === id || b.slug === id);
    if (!blog) {
      return NextResponse.json({ success: false, message: "Không tìm thấy bài viết" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: blog });
  } catch {
    return NextResponse.json({ success: false, message: "Lỗi đọc dữ liệu" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = await readDB();

    const index = db.blogs.findIndex((b) => b.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, message: "Không tìm thấy bài viết" }, { status: 404 });
    }

    // Check slug uniqueness (excluding the current blog)
    if (body.slug && body.slug !== db.blogs[index].slug) {
      if (db.blogs.some((b) => b.slug === body.slug && b.id !== id)) {
        return NextResponse.json(
          { success: false, message: "Slug đã tồn tại, vui lòng chọn slug khác" },
          { status: 400 }
        );
      }
    }

    db.blogs[index] = {
      ...db.blogs[index],
      ...body,
      id, // ensure id is not overwritten
    };

    await writeDB(db);
    return NextResponse.json({ success: true, data: db.blogs[index] });
  } catch {
    return NextResponse.json({ success: false, message: "Lỗi cập nhật bài viết" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const db = await readDB();

    const index = db.blogs.findIndex((b) => b.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, message: "Không tìm thấy bài viết" }, { status: 404 });
    }

    db.blogs.splice(index, 1);
    await writeDB(db);

    return NextResponse.json({ success: true, message: "Đã xóa bài viết" });
  } catch {
    return NextResponse.json({ success: false, message: "Lỗi xóa bài viết" }, { status: 500 });
  }
}
