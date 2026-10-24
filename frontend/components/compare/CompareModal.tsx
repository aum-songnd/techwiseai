"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ArrowLeftRight, Check, ShoppingCart, Star } from "lucide-react";
import { useCompare } from "@/context/CompareContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import type { Product } from "@/app/data/types";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const SPEC_ROWS: { key: string; label: string; aliases: string[] }[] = [
  { key: "brand", label: "Thương hiệu", aliases: ["brand", "Hãng sản xuất"] },
  { key: "cpu", label: "Vi xử lý (CPU)", aliases: ["CPU", "Loại CPU", "Chip xử lý (CPU)"] },
  { key: "ram", label: "Dung lượng RAM", aliases: ["RAM", "Dung lượng RAM", "Loại RAM"] },
  { key: "storage", label: "Ổ cứng / Lưu trữ", aliases: ["Ổ cứng", "SSD", "Bộ nhớ trong", "Dung lượng"] },
  { key: "gpu", label: "Card đồ họa (VGA)", aliases: ["VGA", "Loại card đồ họa", "Card đồ họa"] },
  { key: "screen", label: "Màn hình", aliases: ["Màn hình", "Kích thước màn hình", "Công nghệ màn hình", "Độ phân giải màn hình"] },
  { key: "battery", label: "Thời lượng pin", aliases: ["Pin", "Dung lượng pin", "Thời lượng sử dụng Pin"] },
  { key: "weight", label: "Trọng lượng", aliases: ["Trọng lượng", "Kích thước"] },
  { key: "audio", label: "Âm thanh / Kết nối", aliases: ["Công nghệ âm thanh", "Cổng kết nối", "Cổng giao tiếp", "Micro"] },
];

const getSpecValue = (product: Product, row: typeof SPEC_ROWS[0]): string => {
  if (row.key === "brand") return product.brand || "—";

  const specs = product.specifications || {};
  for (const alias of row.aliases) {
    if (specs[alias]) return specs[alias];
    // check case-insensitive match
    for (const [k, v] of Object.entries(specs)) {
      if (k.toLowerCase() === alias.toLowerCase() && v) {
        return v;
      }
    }
  }

  return "—";
};

const CompareModal = () => {
  const { compareProducts, removeFromCompare, clearCompare, setCompareModalOpen } = useCompare();
  const { addToCart, requiresLogin } = useCart();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [onlyDifferences, setOnlyDifferences] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCompareModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [setCompareModalOpen]);

  const handleAddToCart = (product: Product) => {
    if (requiresLogin && !isSignedIn) {
      const redirectTo =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/";
      router.push(`/sign-in?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }
    addToCart(product.id, 1, {
      id: `temp-${product.id}`,
      productId: product.id,
      name: product.name,
      unitPrice: product.finalPrice || product.price,
      originalPrice: product.price,
      quantity: 1,
      subtotal: product.finalPrice || product.price,
      stockQuantity: product.stock ?? 999,
      available: (product.stock ?? 1) > 0,
      thumbnailUrl: product.images?.[0],
    });
  };

  const filteredRows = SPEC_ROWS.filter((row) => {
    if (!onlyDifferences) return true;
    const values = compareProducts.map((p) => getSpecValue(p, row));
    const first = values[0];
    return values.some((v) => v !== first);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-shop_dark_green text-white flex items-center justify-center shadow-xs">
              <ArrowLeftRight className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                So sánh chi tiết thông số ({compareProducts.length} sản phẩm)
              </h2>
              <p className="text-xs text-neutral-500">
                Đối chiếu giá, cấu hình kỹ thuật và tính năng nổi bật
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="hidden sm:flex items-center gap-2 text-xs text-neutral-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyDifferences}
                onChange={(e) => setOnlyDifferences(e.target.checked)}
                className="rounded border-neutral-300 text-shop_dark_green focus:ring-shop_dark_green"
              />
              <span>Chỉ xem điểm khác biệt</span>
            </label>

            <button
              type="button"
              onClick={() => {
                clearCompare();
                setCompareModalOpen(false);
              }}
              className="text-xs text-neutral-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Xoá tất cả
            </button>

            <button
              type="button"
              onClick={() => setCompareModalOpen(false)}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-full transition-colors cursor-pointer"
              aria-label="Đóng so sánh"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {compareProducts.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 text-sm">
              Chưa có sản phẩm nào trong danh sách so sánh.
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-44 min-w-[150px] p-3 text-left text-xs font-semibold uppercase text-neutral-500 bg-neutral-100/60 rounded-l-xl">
                    Sản phẩm
                  </th>
                  {compareProducts.map((product) => (
                    <th
                      key={product.id}
                      className="p-3 text-left align-top min-w-[200px] max-w-[260px] bg-neutral-50/50 rounded-xl"
                    >
                      <div className="flex flex-col h-full justify-between">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => removeFromCompare(product.id)}
                            className="absolute -top-1 -right-1 p-1 text-neutral-400 hover:text-red-500 rounded-full hover:bg-white transition-colors cursor-pointer"
                            title="Bỏ khỏi so sánh"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div className="relative aspect-square w-full max-w-[140px] mx-auto bg-white rounded-xl border border-neutral-200 overflow-hidden mb-3">
                            {product.images?.[0] ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                unoptimized
                                sizes="140px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-neutral-400">
                                Không có ảnh
                              </div>
                            )}
                          </div>

                          <Link
                            href={`/product/${product.id}`}
                            onClick={() => setCompareModalOpen(false)}
                            className="text-xs sm:text-sm font-semibold text-neutral-900 hover:text-shop_dark_green line-clamp-2 transition-colors"
                          >
                            {product.name}
                          </Link>

                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-sm sm:text-base font-bold text-shop_dark_green">
                              {formatPrice(product.finalPrice || product.price)}
                            </span>
                            {product.discount > 0 && (
                              <span className="text-xs text-neutral-400 line-through">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                            <span className="font-semibold text-neutral-800">
                              {product.ratingAverage ? Number(product.ratingAverage).toFixed(1) : "5.0"}
                            </span>
                            <span>({product.reviewCount ?? 0})</span>
                          </div>
                        </div>

                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            disabled={product.stock === 0}
                            className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                              product.stock > 0
                                ? "bg-shop_dark_green text-white hover:bg-emerald-800"
                                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                            }`}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>{product.stock > 0 ? "Thêm vào giỏ" : "Hết hàng"}</span>
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-200">
                {/* General Status */}
                <tr>
                  <td className="p-3 text-xs font-medium text-neutral-600 bg-neutral-100/40">
                    Tình trạng kho
                  </td>
                  {compareProducts.map((p) => (
                    <td key={`stock-${p.id}`} className="p-3 text-xs font-semibold">
                      {p.stock > 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <Check className="w-3.5 h-3.5" />
                          Còn hàng ({p.stock})
                        </span>
                      ) : (
                        <span className="text-red-500">Hết hàng</span>
                      )}
                    </td>
                  ))}
                </tr>

                {filteredRows.map((row) => {
                  const values = compareProducts.map((p) => getSpecValue(p, row));
                  const isDiff = values.some((v) => v !== values[0]);

                  return (
                    <tr
                      key={row.key}
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        isDiff ? "bg-amber-50/30 font-medium" : ""
                      }`}
                    >
                      <td className="p-3 text-xs font-medium text-neutral-600 bg-neutral-100/40">
                        {row.label}
                      </td>
                      {compareProducts.map((product) => (
                        <td
                          key={`${row.key}-${product.id}`}
                          className="p-3 text-xs text-neutral-800 leading-relaxed"
                        >
                          {getSpecValue(product, row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompareModal;
