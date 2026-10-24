"use client";

import { searchProducts, searchProductsByImage } from "@/lib/api";
import {
  Search,
  X,
  Camera,
  Clock,
  ShoppingCart,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Tag,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import type { Product } from "@/app/data/types";

const SEARCH_HISTORY_KEY = "techwise_search_history";
const MAX_HISTORY_ITEMS = 8;

const POPULAR_SEARCHES = [
  "MacBook Air M3",
  "Laptop Gaming RTX 4060",
  "iPhone 16 Pro Max",
  "Tai nghe chống ồn",
  "Bàn phím cơ không dây",
  "SSD 1TB Kingston",
  "Dell XPS 13",
  "Chuột Logitech MX Master 3S",
];

const SUGGESTED_CATEGORIES = [
  { name: "Laptop & MacBook", slug: "laptop" },
  { name: "Điện thoại & Tablet", slug: "dien-thoai" },
  { name: "Tai nghe & Âm thanh", slug: "tai-nghe" },
  { name: "Máy ảnh & Flycam", slug: "may-anh" },
  { name: "Linh kiện PC", slug: "linh-kien" },
  { name: "Phụ kiện công nghệ", slug: "phu-kien" },
];

const SUGGESTED_BRANDS = [
  "Apple",
  "ASUS",
  "Dell",
  "Lenovo",
  "HP",
  "Acer",
  "MSI",
  "Samsung",
  "Sony",
  "Logitech",
];

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

interface SearchBarProps {
  variant?: "prominent" | "icon";
}

const SearchBar = ({ variant = "prominent" }: SearchBarProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // AI Image Search states
  const [searchImagePreview, setSearchImagePreview] = useState<string | null>(null);
  const [isSearchingByImage, setIsSearchingByImage] = useState(false);

  const { addToCart, getItemByProductId, requiresLogin } = useCart();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setSearchHistory(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const saveToHistory = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;
    setSearchHistory((prev) => {
      const next = [
        clean,
        ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase()),
      ].slice(0, MAX_HISTORY_ITEMS);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const removeHistoryItem = useCallback((termToRemove: string) => {
    setSearchHistory((prev) => {
      const next = prev.filter((item) => item !== termToRemove);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearAllHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const term = keyword.trim();
    if (!term) {
      setSearchResults([]);
      setIsLoading(false);
      setError("");
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError("");
        const results = await searchProducts(term, controller.signal);
        setSearchResults(results);
        setHasSearched(true);
        if (results.length > 0) {
          saveToHistory(term);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Lỗi tìm kiếm");
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [keyword, saveToHistory]);

  const handleImageSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP");
      input.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Dung lượng ảnh tối đa 10 MB");
      input.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setKeyword("");
    setError("");
    setSearchResults([]);
    setSearchImagePreview(previewUrl);
    setIsSearchingByImage(true);
    setIsLoading(true);
    setIsModalOpen(true);
    setIsDropdownOpen(false);

    try {
      const [results] = await Promise.all([
        searchProductsByImage(file, 10),
        new Promise<void>((r) => setTimeout(r, 1000)),
      ]);
      setSearchResults(results);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tìm kiếm bằng hình ảnh");
    } finally {
      setIsSearchingByImage(false);
      setIsLoading(false);
      input.value = "";
    }
  };

  const handleSelectTerm = (term: string) => {
    setKeyword(term);
    saveToHistory(term);
    setIsDropdownOpen(true);
  };

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    saveToHistory(keyword.trim());
    setIsDropdownOpen(false);
    setIsModalOpen(false);
    router.push(`/shop?keyword=${encodeURIComponent(keyword.trim())}`);
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  // Matched categories & brands for autocomplete
  const matchedCategories = SUGGESTED_CATEGORIES.filter((c) =>
    keyword.trim()
      ? c.name.toLowerCase().includes(keyword.toLowerCase().trim())
      : false
  );

  const matchedBrands = SUGGESTED_BRANDS.filter((b) =>
    keyword.trim()
      ? b.toLowerCase().includes(keyword.toLowerCase().trim())
      : false
  );

  return (
    <>
      {/* Hidden File Input for AI Image Search */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleImageSearch}
      />

      {/* AI Processing Overlay */}
      {mounted &&
        isSearchingByImage &&
        searchImagePreview &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in"
          >
            <div className="flex flex-col items-center gap-4 bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20">
              <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
                <img
                  src={searchImagePreview}
                  alt="Ảnh tìm kiếm"
                  className="h-64 w-64 rounded-xl object-contain animate-pulse"
                />
              </div>
              <div className="text-center text-white">
                <p className="text-base font-bold flex items-center gap-2 justify-center">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
                  <span>AI đang phân tích và tìm kiếm sản phẩm...</span>
                </p>
                <p className="text-xs text-neutral-300 mt-1">Đang so khớp vector hình ảnh catalog</p>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* PROMINENT INLINE SEARCH BAR */}
      {variant === "prominent" ? (
        <div ref={searchContainerRef} className="relative flex-1 max-w-xl mx-2 sm:mx-4">
          <form
            onSubmit={handleSubmitSearch}
            className={`relative flex items-center w-full rounded-2xl border transition-all duration-200 ${isDropdownOpen
                ? "border-shop_dark_green bg-white shadow-md"
                : "border-neutral-200/90 bg-neutral-100/70 hover:bg-white hover:border-neutral-300 hover:shadow-xs"
              }`}
          >
            <div className="pl-3.5 text-neutral-400">
              <Search className="w-4 h-4 text-neutral-500" />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                if (!isDropdownOpen) setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Bạn muốn tìm gì? Laptop, iPhone 16, RTX 4060, AI Chip..."
              className="w-full py-2.5 pl-2.5 pr-20 text-xs sm:text-sm text-neutral-900 bg-transparent placeholder-neutral-400 focus:outline-none"
            />

            <div className="absolute right-2 flex items-center gap-1">
              {keyword && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword("");
                    setSearchResults([]);
                  }}
                  className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-200/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* AI Camera Search Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 p-1.5 rounded-lg text-neutral-500 hover:text-shop_dark_green hover:bg-emerald-50 transition-colors cursor-pointer group"
                title="Tìm kiếm bằng ảnh chụp / hình ảnh AI"
              >
                <Camera className="w-4 h-4 text-shop_dark_green group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </form>

          {/* AUTOCOMPLETE POPUP DROPDOWN */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150 max-h-[520px] overflow-y-auto">
              {/* Category / Brand match suggestions */}
              {keyword.trim().length > 0 && (matchedCategories.length > 0 || matchedBrands.length > 0) && (
                <div className="p-3 bg-neutral-50/80 border-b border-neutral-100 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Gợi ý nhanh:
                  </span>
                  {matchedCategories.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/shop?category=${c.slug}`}
                      onClick={() => setIsDropdownOpen(false)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-xs font-semibold text-shop_dark_green hover:border-shop_dark_green transition-colors"
                    >
                      <Tag className="w-3 h-3 text-emerald-600" />
                      <span>{c.name}</span>
                    </Link>
                  ))}
                  {matchedBrands.map((b) => (
                    <Link
                      key={b}
                      href={`/shop?brand=${encodeURIComponent(b)}`}
                      onClick={() => setIsDropdownOpen(false)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-xs font-semibold text-neutral-700 hover:text-shop_dark_green hover:border-shop_dark_green transition-colors"
                    >
                      <span>Hãng {b}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Live search products results */}
              {keyword.trim().length > 0 ? (
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                      Sản phẩm khớp từ khoá ({searchResults.length})
                    </span>
                    {isLoading && (
                      <span className="text-xs text-shop_dark_green animate-pulse">
                        Đang tìm kiếm...
                      </span>
                    )}
                  </div>

                  {searchResults.length === 0 && !isLoading && hasSearched ? (
                    <div className="py-6 text-center text-xs text-neutral-500">
                      Không tìm thấy sản phẩm nào khớp với &ldquo;{keyword}&rdquo;.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {searchResults.slice(0, 6).map((product) => {
                        const itemInCart = getItemByProductId(product.id);
                        const qty = itemInCart?.quantity ?? 0;
                        const finalPrice = product.finalPrice || product.price;

                        return (
                          <div
                            key={product.id}
                            className="group flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-all"
                          >
                            <Link
                              href={`/product/${product.id}`}
                              onClick={() => {
                                setIsDropdownOpen(false);
                                saveToHistory(product.name);
                              }}
                              className="flex items-center gap-3 flex-1 min-w-0 pr-3"
                            >
                              <div className="relative w-12 h-12 bg-white rounded-lg border border-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {product.images?.[0] ? (
                                  <Image
                                    src={product.images[0]}
                                    alt={product.name}
                                    fill
                                    unoptimized
                                    sizes="48px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <span className="text-[9px] text-neutral-400">No pic</span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-neutral-800 group-hover:text-shop_dark_green transition-colors line-clamp-1">
                                  {product.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-bold text-shop_dark_green">
                                    {formatPrice(finalPrice)}
                                  </span>
                                  {product.discount > 0 && (
                                    <span className="text-[10px] text-neutral-400 line-through">
                                      {formatPrice(product.price)}
                                    </span>
                                  )}
                                  {product.brand && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-500 font-medium">
                                      {product.brand}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>

                            <button
                              type="button"
                              onClick={(e) => handleAddToCart(product, e)}
                              disabled={product.stock === 0}
                              className={`p-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${qty > 0
                                  ? "bg-emerald-100 text-shop_dark_green"
                                  : "bg-neutral-100 text-neutral-700 hover:bg-shop_dark_green hover:text-white"
                                }`}
                              title={qty > 0 ? `Đã có ${qty} trong giỏ` : "Thêm vào giỏ"}
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {searchResults.length > 6 && (
                    <div className="pt-2 mt-2 border-t border-neutral-100 text-center">
                      <button
                        type="button"
                        onClick={handleSubmitSearch}
                        className="inline-flex items-center gap-1 text-xs font-bold text-shop_dark_green hover:underline cursor-pointer"
                      >
                        <span>Xem tất cả {searchResults.length} sản phẩm phù hợp</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* History & Popular search default view */
                <div className="p-4 space-y-4">
                  {/* Recent searches */}
                  {searchHistory.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Lịch sử tìm kiếm</span>
                        </span>
                        <button
                          type="button"
                          onClick={clearAllHistory}
                          className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          Xoá lịch sử
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {searchHistory.map((term) => (
                          <span
                            key={term}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 hover:bg-emerald-50 text-xs text-neutral-700 transition-colors group"
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectTerm(term)}
                              className="hover:text-shop_dark_green font-medium"
                            >
                              {term}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeHistoryItem(term);
                              }}
                              className="text-neutral-400 hover:text-neutral-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Popular searches */}
                  <div>
                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                      <span>Xu hướng tìm kiếm</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {POPULAR_SEARCHES.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleSelectTerm(term)}
                          className="px-3 py-1.5 rounded-xl bg-neutral-50 hover:bg-emerald-50 text-xs font-medium text-neutral-700 hover:text-shop_dark_green border border-neutral-200/80 transition-all cursor-pointer"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ICON VARIANT (for mobile or compact button) */
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          aria-label="Mở tìm kiếm"
          className="p-2 rounded-xl text-neutral-700 hover:text-shop_dark_green hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          <Search className="w-5 h-5" />
        </button>
      )}

      {/* FULL SEARCH MODAL DIALOG (when triggered on mobile or from image search) */}
      {isModalOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col mt-12 animate-in zoom-in-95">
              <div className="p-4 border-b border-neutral-200 flex items-center gap-3">
                <Search className="w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  autoFocus
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Nhập tên sản phẩm, hãng hoặc cấu hình cần tìm..."
                  className="flex-1 text-sm font-medium text-neutral-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-neutral-500 hover:text-shop_dark_green hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  title="Tìm bằng ảnh"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.id}`}
                        onClick={() => setIsModalOpen(false)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-50 border border-neutral-100 transition-colors"
                      >
                        <div className="relative w-14 h-14 bg-white rounded-lg border border-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {product.images?.[0] ? (
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              fill
                              unoptimized
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-[9px] text-neutral-400">Không ảnh</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-800 line-clamp-1">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-shop_dark_green">
                              {formatPrice(product.finalPrice || product.price)}
                            </span>
                            {product.discount > 0 && (
                              <span className="text-xs text-neutral-400 line-through">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-neutral-500">
                    {keyword ? "Không tìm thấy sản phẩm" : "Nhập từ khoá để bắt đầu tìm kiếm"}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default SearchBar;
