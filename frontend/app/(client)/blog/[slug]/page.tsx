// app/(client)/blog/[slug]/page.tsx
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getAllBlogs,
  getBlogBySlug,
  getAllBlogSlugs,
  getBlogCategories,
  getAuthors,
} from "../../../../constants/queriesBlogPage";

type Props = { params: Promise<{ slug: string }> };

// Chỉnh lại nếu BlogCategory / Author của bạn dùng tên field khác
type CategoryFields = { id: string; name?: string; title?: string };
type AuthorFields = { id: string; name?: string };

export async function generateStaticParams() {
  const slugs = await getAllBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) return { title: "Không tìm thấy bài viết" };
  return { title: blog.title, description: blog.body.slice(0, 160) };
}

const formatDate = (date?: string) =>
  date
    ? new Date(date).toLocaleDateString("vi-VN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

const categoryName = (c: CategoryFields) => c.name ?? c.title ?? "";

const PencilIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const BlogPostPage = async ({ params }: Props) => {
  const { slug } = await params;
  const [blog, allBlogs, categories, authors] = await Promise.all([
    getBlogBySlug(slug),
    getAllBlogs(),
    getBlogCategories(),
    getAuthors(),
  ]);

  if (!blog) notFound();

  const allCategories = categories as unknown as CategoryFields[];
  const postCategories = allCategories.filter((c) =>
    blog.blogCategoryIds.includes(c.id)
  );
  const author = (authors as unknown as AuthorFields[]).find(
    (a) => a.id === blog.authorId
  );
  const paragraphs = blog.body.split("\n").filter(Boolean);

  // Sidebar: số bài viết theo từng danh mục
  const categoryCounts = allCategories.map((c) => ({
    id: c.id,
    name: categoryName(c),
    count: allBlogs.filter((b) => b.blogCategoryIds.includes(c.id)).length,
  }));

  // Sidebar: 5 bài mới nhất (trừ bài đang xem)
  const latestBlogs = allBlogs
    .filter((b) => b.slug !== blog.slug)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Bài viết */}
          <article>
            {blog.mainImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={blog.mainImageUrl}
                alt={blog.title}
                className="aspect-[16/9] w-full rounded-lg object-cover"
              />
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
              {postCategories.length > 0 && (
                <span className="border-b border-gray-300 pb-1 font-semibold text-green-900">
                  {postCategories.map(categoryName).join(", ")}
                </span>
              )}
              {author?.name && (
                <span className="flex items-center gap-2 border-b border-gray-300 pb-1">
                  <PencilIcon />
                  {author.name}
                </span>
              )}
              <span className="flex items-center gap-2 border-b border-gray-300 pb-1">
                <CalendarIcon />
                {formatDate(blog.publishedAt)}
              </span>
            </div>

            <h1 className="mt-6 text-3xl font-bold leading-tight text-gray-900">
              {blog.title}
            </h1>

            <div className="mt-6 space-y-5 text-base leading-8 text-gray-600">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="mt-10 border-t border-gray-200 pt-6">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white"
              >
                ← Quay lại blog
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-8">
            <section className="rounded-md border border-gray-300 p-5">
              <h2 className="text-lg font-bold text-gray-900">Danh mục</h2>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                {categoryCounts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span>{c.name}</span>
                    <span className="font-medium text-gray-900">
                      ({c.count})
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-md border border-gray-300 p-5">
              <h2 className="text-lg font-bold text-gray-900">
                Bài viết mới nhất
              </h2>
              <ul className="mt-4 space-y-4">
                {latestBlogs.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/blog/${b.slug}`}
                      className="group flex items-center gap-4"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.mainImageUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-full object-cover"
                      />
                      <span className="line-clamp-2 text-sm text-gray-600 group-hover:text-gray-900">
                        {b.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BlogPostPage;