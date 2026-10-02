"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Container from "./Container";
import FlashSaleCountdown from "./FlashSaleCountdown";
import { getProducts } from "../lib/api";
import { Product } from "../app/data/types";

const FETCH_SIZE = 60;
const FLASH_LIMIT = 10;

// Link tới trang shop: nhảy đúng category (theo SLUG) và bật bộ lọc "đang giảm giá".
// Slug phải khớp với field `slug` của category trả về từ backend.
const shopHref = (categorySlug?: string) => {
  const params = new URLSearchParams();
  if (categorySlug) params.set("category", categorySlug);
  params.set("sale", "1");
  return `/shop?${params.toString()}`;
};

// Hai ô xám bên phải (xếp dọc). Nội dung chữ/ảnh là placeholder, sửa theo khuyến mãi thật.
// reverse = true: chữ bên trái, ảnh bên phải (ô thứ 2 trong mẫu).
const SIDE_CARDS = [
  {
    eyebrow: "Ưu đãi phụ kiện đang diễn ra",
    headline: "Giảm đến 60%",
    image: "/accessory.webp",
    alt: "Phụ kiện giảm giá",
    href: shopHref("phu-kien"), // TODO: đổi đúng slug category Phụ kiện
    reverse: false,
  },
  {
    eyebrow: "Laptop và thiết bị làm việc mỗi ngày",
    headline: "Giảm đến 70%",
    image: "/laptop.webp",
    alt: "Laptop giảm giá",
    href: shopHref("laptop"), // TODO: đổi đúng slug category Laptop
    reverse: true,
  },
];

// Field phục vụ deal mà Product type gốc chưa khai báo (API không trả thì bỏ qua).
type ProductExtras = { flashSaleEndsAt?: string };

const getFlashEnd = (p: Product) => {
  const t = Date.parse((p as unknown as ProductExtras).flashSaleEndsAt ?? "");
  return Number.isNaN(t) ? undefined : t;
};

const getDiscountPercent = (p: Product) =>
  p.price > 0 && p.finalPrice < p.price
    ? Math.round(((p.price - p.finalPrice) / p.price) * 100)
    : 0;

// Deal không có hạn riêng thì đếm ngược tới 0h đêm nay (deal theo ngày).
const endOfToday = () => {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
};

// Nét cọ dưới tiêu đề; màu truyền qua className (text-white / text-blue-700).
const BrushStroke = ({
  className = "mx-auto",
}: {
  className?: string;
}) => (
  <svg
    viewBox="0 0 200 10"
    preserveAspectRatio="none"
    className={`h-2 w-36 ${className}`}
    aria-hidden="true"
  >
    <path
      d="M2 6 C 45 2, 120 2, 198 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

type FlashSaleProps = {
  /**
   * "full"   : bố cục bento đầy đủ (ô xanh cao + 2 ô xám) - dùng ở trang chủ.
   * "banner" : chỉ ô xanh có đếm ngược, hiển thị nằm ngang - dùng ở trang giỏ hàng.
   */
  variant?: "full" | "banner";
};

// Khối Flash Sale độc lập. Tự lấy dữ liệu, tự ẩn nếu không có deal nào.
const FlashSale = ({ variant = "full" }: FlashSaleProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const result = await getProducts({ size: FETCH_SIZE });
        if (!ignore) setProducts(result);
      } catch {
        // Lỗi API: ẩn khối thay vì làm hỏng trang.
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const { deals, endsAt, maxDiscount } = useMemo(() => {
    const now = Date.now();

    const list = products
      .filter((p) => {
        const end = getFlashEnd(p);
        return (
          (end !== undefined && end > now) ||
          getDiscountPercent(p) > 0 ||
          p.status === "sale"
        );
      })
      .sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a))
      .slice(0, FLASH_LIMIT);

    const upcomingEnds = list
      .map(getFlashEnd)
      .filter((t): t is number => t !== undefined && t > now);

    return {
      deals: list,
      endsAt: upcomingEnds.length ? Math.min(...upcomingEnds) : endOfToday(),
      maxDiscount: list.length ? getDiscountPercent(list[0]) : 0,
    };
  }, [products]);

  // Banner: luân phiên "Flash Sale" <-> "Giảm đến X%" mỗi 5 giây (bắt đầu bằng Flash Sale).
  const [showDiscount, setShowDiscount] = useState(false);
  useEffect(() => {
    if (maxDiscount <= 0) {
      setShowDiscount(false);
      return;
    }
    const id = setInterval(() => setShowDiscount((v) => !v), 5000);
    return () => clearInterval(id);
  }, [maxDiscount]);

  if (!loading && deals.length === 0) return null;

  /* ---------------- Banner ngang: chỉ ô xanh + đếm ngược ---------------- */
  if (variant === "banner") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-600 px-4 py-3 text-center sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
        {/* Trái: tiêu đề + mô tả */}
        <div className="min-w-0">
          <h2 className="grid text-xl font-extrabold uppercase leading-tight text-white sm:text-2xl">
            <span
              className={`col-start-1 row-start-1 transition-opacity duration-500 ${
                showDiscount ? "opacity-0" : "opacity-100"
              }`}
              aria-hidden={showDiscount}
            >
              Flash Sale
            </span>
            <span
              className={`col-start-1 row-start-1 transition-opacity duration-500 ${
                showDiscount ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={!showDiscount}
            >
              Giảm đến {maxDiscount}%
            </span>
          </h2>
          <p className="mt-0.5 text-[10px] uppercase text-white/90">
            Ưu đãi chớp nhoáng - Số lượng có hạn
          </p>
        </div>

        {/* Giữa: đếm ngược (thu nhỏ) */}
        <div className="shrink-0 origin-center scale-75">
          <FlashSaleCountdown endsAt={endsAt} />
        </div>

        {/* Phải: nút */}
        <Link
          href={shopHref()}
          className="shrink-0 rounded-full bg-white px-5 py-2 text-[11px] font-bold uppercase text-gray-900 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Mua ngay
        </Link>
      </div>
    );
  }

  /* ---------------- Bố cục bento đầy đủ (trang chủ) ---------------- */
  return (
    <Container className="my-10 lg:px-0">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
        {/* Ô xanh cao bên trái */}
        <div className="relative flex flex-col items-center overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 to-blue-600 px-4 pt-8 text-center md:px-6 md:pt-10 lg:col-span-1">
          <h2 className="text-5xl font-extrabold uppercase leading-[1.05] text-white md:text-6xl">
            {maxDiscount > 0 ? (
              <>
                Giảm đến
                <br />
                {maxDiscount}%
              </>
            ) : (
              <>
                Flash
                <br />
                Sale
              </>
            )}
          </h2>

          <BrushStroke className="mx-auto mt-5 text-white" />

          <p className="mt-4 max-w-[16rem] text-sm uppercase text-white">
            Ưu đãi chớp nhoáng - Số lượng có hạn
          </p>

          <div className="mt-5">
            <FlashSaleCountdown endsAt={endsAt} />
          </div>

          <Link
            href={shopHref()}
            className="mt-5 rounded-full bg-white px-7 py-2.5 text-xs font-bold uppercase text-gray-900 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Mua ngay
          </Link>

          {/* Ảnh sản phẩm ở đáy ô, tràn ra mép */}
          <div className="relative mt-4 h-60 w-full md:h-64">
            <div className="absolute -bottom-2 left-0 h-[75%] w-[52%]">
              <Image
                src="/earphone.webp"
                alt="Tai nghe"
                fill
                className="object-contain object-left-bottom mix-blend-multiply"
                sizes="(max-width: 1024px) 50vw, 18vw"
              />
            </div>
            <div className="absolute -bottom-3 -right-8 h-[100%] w-[50%]">
              <Image
                src="/mobile.webp"
                alt="Điện thoại"
                fill
                className="object-contain object-right-bottom mix-blend-multiply"
                sizes="(max-width: 1024px) 50vw, 18vw"
              />
            </div>
          </div>
        </div>

        {/* Cột phải (66%): flex-col, 2 ô xám chia đều chiều cao */}
        <div className="flex flex-col gap-3 lg:col-span-2 lg:gap-4">
          {SIDE_CARDS.map((card) => (
            <Link
              key={card.headline}
              href={card.href}
              className={`group flex flex-1 flex-col overflow-hidden rounded-3xl bg-[#f1f1f8] sm:min-h-[220px] sm:items-center ${
                card.reverse ? "sm:flex-row-reverse" : "sm:flex-row"
              }`}
            >
              <div className="relative h-44 w-full sm:h-full sm:min-h-[220px] sm:w-1/2">
                <Image
                  src={card.image}
                  alt={card.alt}
                  fill
                  className="object-contain p-6 mix-blend-multiply transition-transform duration-00 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>

              <div className="flex w-full flex-col items-center px-4 pb-6 text-center sm:w-1/2 sm:pb-0">
                <p className="max-w-[16rem] text-xs uppercase text-gray-600 md:text-sm">
                  {card.eyebrow}
                </p>
                <p className="mt-2 text-2xl font-extrabold uppercase text-gray-900 md:text-3xl">
                  {card.headline}
                </p>
                <BrushStroke className="mx-auto mt-3 text-blue-700" />
                <span className="mt-4 rounded-full bg-blue-700 px-6 py-2 text-xs font-bold uppercase text-white transition-colors group-hover:bg-blue-800">
                  Mua ngay
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Container>
  );
};

export default FlashSale;