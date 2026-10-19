/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Calendar,
  User,
  Clock,
  ArrowLeft,
  Tag,
  ShieldCheck,
  RotateCcw,
  Truck,
} from "lucide-react";
import {
  getAllBlogs,
  getBlogBySlug,
  getAllBlogSlugs,
  getBlogCategories,
  getAuthors,
} from "../../../../constants/queriesBlogPage";

type Props = { params: Promise<{ slug: string }> };

type CategoryFields = { id: string; name?: string; title?: string };
type AuthorFields = { id: string; name?: string };

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await getAllBlogSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
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
  const readingTime = Math.max(1, Math.ceil(blog.body.split(/\s+/).length / 200));

  const categoryCounts = allCategories.map((c) => ({
    id: c.id,
    name: categoryName(c),
    count: allBlogs.filter((b) => b.blogCategoryIds.includes(c.id)).length,
  }));

  const latestBlogs = allBlogs
    .filter((b) => b.slug !== blog.slug)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation - Styled exactly like Cart page */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-shop_dark_green transition-colors">
            Blog & Tin tức
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium line-clamp-1 max-w-[200px] sm:max-w-md">
            {blog.title}
          </span>
        </nav>

        {/* Top Header Bar - Matching Cart page style */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="space-y-2 min-w-0">
            {postCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {postCategories.map((c) => (
                  <span
                    key={c.id}
                    className="inline-block bg-shop_dark_green text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5"
                  >
                    {categoryName(c)}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-tight text-neutral-900 leading-tight">
              {blog.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 shrink-0">
            {author?.name && (
              <span className="flex items-center gap-1.5 text-neutral-700 font-medium">
                <User size={13} className="text-shop_dark_green" />
                {author.name}
              </span>
            )}
            <span className="flex items-center gap-1.5 font-mono text-neutral-500">
              <Calendar size={13} className="text-shop_dark_green" />
              {formatDate(blog.publishedAt)}
            </span>
            <span className="hidden sm:flex items-center gap-1.5 font-mono text-neutral-500">
              <Clock size={13} className="text-shop_dark_green" />
              [ ~{readingTime} phút đọc ]
            </span>
          </div>
        </div>

        {/* Main 2-Column Content Grid - Width strictly preserved */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main Article Content */}
          <article className="border border-neutral-200 bg-white p-5 sm:p-7 space-y-6">
            {/* Featured Image */}
            {blog.mainImageUrl && (
              <div className="overflow-hidden border border-neutral-200 bg-neutral-50">
                <img
                  src={blog.mainImageUrl}
                  alt={blog.title}
                  className="aspect-[16/9] w-full object-cover transition-transform duration-500 hover:scale-[1.01]"
                />
              </div>
            )}

            {/* Quick Meta Subbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3 text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                <Tag size={13} className="text-shop_dark_green" />
                <span className="font-semibold uppercase tracking-wider text-neutral-700">
                  Chủ đề:
                </span>
                <span>
                  {postCategories.map(categoryName).join(", ") || "Tin tức công nghệ"}
                </span>
              </div>
              <span className="font-mono text-[11px] text-neutral-400">
                [ slug: {blog.slug} ]
              </span>
            </div>

            {/* Paragraphs with cart-aligned typography */}
            <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-neutral-700">
              {paragraphs.map((p, i) => {
                if (i === 0) {
                  return (
                    <p
                      key={i}
                      className="border-l-2 border-shop_dark_green bg-neutral-50/70 p-4 text-sm sm:text-base font-normal leading-relaxed text-neutral-900 italic"
                    >
                      {p}
                    </p>
                  );
                }
                return (
                  <p key={i} className="text-neutral-700 leading-relaxed">
                    {p}
                  </p>
                );
              })}
            </div>

            {/* Footer Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200 pt-6 mt-8">
              <Link
                href="/blog"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 border border-neutral-300 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Quay lại Blog</span>
              </Link>

              <Link
                href="/shop"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-shop_dark_green px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-shop_dark_green/90 transition-colors shadow-sm"
              >
                <span>Khám phá sản phẩm &rarr;</span>
              </Link>
            </div>
          </article>

          {/* Right Column / Aside */}
          <aside className="space-y-6">
            {/* Widget 1: Categories */}
            <section className="border border-neutral-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Danh mục bài viết
                </h2>
                <span className="font-mono text-xs text-neutral-500">
                  [ {categoryCounts.length} ]
                </span>
              </div>
              <ul className="divide-y divide-neutral-100">
                {categoryCounts.map((c) => (
                  <li key={c.id}>
                    <Link
                      href="/blog"
                      className="flex items-center justify-between py-2 text-xs text-neutral-600 hover:text-shop_dark_green transition-colors group"
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform">
                        {c.name}
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400 group-hover:text-shop_dark_green">
                        ({c.count})
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Widget 2: Latest Articles */}
            <section className="border border-neutral-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Bài viết mới nhất
                </h2>
                <span className="font-mono text-xs text-neutral-500">
                  [ {latestBlogs.length} ]
                </span>
              </div>
              <ul className="divide-y divide-neutral-100">
                {latestBlogs.map((b) => (
                  <li key={b.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/blog/${b.slug}`}
                      className="group flex items-start gap-3"
                    >
                      <img
                        src={b.mainImageUrl}
                        alt={b.title}
                        className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 border border-neutral-200 bg-neutral-50 object-cover"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-2 text-xs font-semibold text-neutral-900 group-hover:text-shop_dark_green transition-colors">
                          {b.title}
                        </p>
                        <span className="mt-1 block font-mono text-[10px] text-neutral-400">
                          {formatDate(b.publishedAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Widget 3: Guarantees / Service Notes (Matching Cart style) */}
            <div className="border border-neutral-200 p-5 space-y-3 bg-neutral-50/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-2">
                Techwise AI Tin tức
              </h3>
              <div className="space-y-2.5 text-[11px] text-neutral-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>Nội dung chính xác & cập nhật xu hướng công nghệ mới</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>Đánh giá khách quan các giải pháp & thiết bị AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>Tư vấn và giải đáp kỹ thuật chuyên sâu 24/7</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BlogPostPage;