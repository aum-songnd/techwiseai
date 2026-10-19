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

export async function GET() {
  try {
    const db = await readDB();
    return NextResponse.json({ success: true, data: db.blogs });
  } catch {
    return NextResponse.json({ success: false, message: "Lỗi đọc dữ liệu blog" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await readDB();

    const newBlog: Blog = {
      id: `blog-${Date.now()}`,
      title: body.title ?? "",
      slug: body.slug ?? "",
      authorId: body.authorId ?? "",
      mainImageUrl: body.mainImageUrl ?? "",
      blogCategoryIds: body.blogCategoryIds ?? [],
      publishedAt: body.publishedAt ?? new Date().toISOString(),
      isLatest: body.isLatest ?? false,
      body: body.body ?? "",
    };

    // Validate required fields
    if (!newBlog.title || !newBlog.slug || !newBlog.body) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin bắt buộc: tiêu đề, slug, nội dung" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    if (db.blogs.some((b) => b.slug === newBlog.slug)) {
      return NextResponse.json(
        { success: false, message: "Slug đã tồn tại, vui lòng chọn slug khác" },
        { status: 400 }
      );
    }

    db.blogs.unshift(newBlog);
    await writeDB(db);

    return NextResponse.json({ success: true, data: newBlog }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "Lỗi tạo bài viết" }, { status: 500 });
  }
}
