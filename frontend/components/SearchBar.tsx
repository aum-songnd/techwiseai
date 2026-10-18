"use client";

import { searchProducts, searchProductsByImage } from "@/lib/api";
import {
  Search,
  X,
  Camera,
  Clock,
  Trash2,
  ShoppingCart,
  PackageSearch,
  Minus,
  Plus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import type { Product } from "@/app/data/types";
import { productImages } from "@/images";
import type { StaticImageData } from "next/image";
import Loading from "@/app/(client)/loading";

const SEARCH_HISTORY_KEY = "techwise_search_history";
const MAX_HISTORY_ITEMS = 10;

const POPULAR_SEARCHES = [
  "Laptop Gaming",
  "MacBook",
  "iPhone 16",
  "Tai nghe Bluetooth",
  "Bàn phím cơ",
  "Màn hình 4K",
  "Chuột không dây",
  "iPad",
];

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const resolveProductImage = (
  fileName?: string
): StaticImageData | string | null => {
  if (!fileName) return null;
  const localImage = (
    productImages as Record<string, StaticImageData | undefined>
  )[fileName];
  return localImage ?? fileName;
};

const SearchBar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [hasSearched, setHasSearched] = useState(false);
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [searchMode, setSearchMode] = useState<"keyword" | "image">("keyword");

  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const { addToCart, updateQuantity, getItemByProductId, requiresLogin } =
    useCart();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Read search history from localStorage when search modal opens
  useEffect(() => {
    if (!isSearchOpen || typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSearchHistory(parsed);
        }
      }
    } catch {
      // Ignore localStorage parse error
    }
  }, [isSearchOpen]);

  useEffect(() => {
    document.body.style.overflow = isSearchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSearchOpen]);

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
        // Ignore localStorage write error
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
        // Ignore localStorage write error
      }
      return next;
    });
  }, []);

  const clearAllHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignore localStorage remove error
    }
  }, []);

  const handleSelectTerm = (term: string) => {
    setSearchMode("keyword");
    setKeyword(term);
    saveToHistory(term);
  };

  useEffect(() => {
    if (searchMode !== "keyword") {
      return;
    }
    const searchKeyword = keyword.trim();

    if (!searchKeyword) {
      setSearchResults([]);
      setError("");
      setIsLoading(false);
      setSearchedKeyword("");
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError("");

        const results = await searchProducts(searchKeyword, controller.signal);

        setSearchResults(results);
        setSearchedKeyword(searchKeyword);
        setHasSearched(true);

        if (results.length > 0) {
          saveToHistory(searchKeyword);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Đã xảy ra lỗi khi tìm kiếm.";

        setError(message);
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [keyword, searchMode, saveToHistory]);

  const handleImageSearch = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP.");
      input.value = "";
      return;
    }

    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
      setError("Dung lượng ảnh không được vượt quá 10 MB.");
      input.value = "";
      return;
    }

    try {
      setSearchMode("image");
      setKeyword("");
      setIsLoading(true);
      setError("");
      setHasSearched(false);
      setSearchResults([]);
      setSearchedKeyword(file.name);

      const results = await searchProductsByImage(file, 10);

      setSearchResults(results);
      setHasSearched(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi tìm kiếm bằng hình ảnh.";

      setError(message);
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
      input.value = "";
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = keyword.trim();
    if (!clean) return;
    saveToHistory(clean);
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product?.stock === 0) return;

    if (!isSignedIn || requiresLogin) {
      closeSearch();
      const redirectTo =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/shop";
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

  const handleDecreaseQuantity = (
    item: { id: string; quantity: number },
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(item.id, item.quantity - 1);
  };

  const handleIncreaseQuantity = (
    item: { id: string; quantity: number },
    stockLimit: number,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.quantity >= stockLimit) return;
    updateQuantity(item.id, item.quantity + 1);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSearchOpen(true)}
        aria-label="Mở tìm kiếm"
        className="cursor-pointer"
      >
        <Search className="h-5 w-5 hover:text-shop_light_green transition-colors" />
      </button>

      {mounted &&
        isSearchOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-8 sm:py-10"
            onClick={closeSearch}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="font-sans antialiased text-neutral-900 relative flex flex-col h-[calc(100dvh-4rem)] sm:h-[640px] max-h-[720px] w-full max-w-4xl overflow-hidden rounded-2xl bg-white p-5 sm:p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between pb-3">
                <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-neutral-900">
                  Tìm kiếm sản phẩm
                </h2>
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Đóng tìm kiếm"
                  className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Bar Form */}
              <form
                onSubmit={handleSubmit}
                className="flex shrink-0 h-12 w-full overflow-hidden border border-neutral-300 bg-white transition-all focus-within:border-shop_dark_green focus-within:ring-2 focus-within:ring-shop_dark_green/15"
              >
                <div className="flex shrink-0 items-center pl-3.5 text-neutral-400">
                  <Search className="h-5 w-5" />
                </div>

                <div className="relative flex-1 flex items-center min-w-0 h-full">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(event) => {
                      setSearchMode("keyword");
                      setKeyword(event.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Tìm kiếm sản phẩm, thương hiệu (VD: Laptop Gaming, MacBook, iPhone)..."
                    autoFocus
                    className="h-full w-full pl-3 pr-9 text-xs sm:text-sm text-neutral-900 outline-none placeholder:text-neutral-400 bg-transparent"
                  />

                  {keyword && (
                    <button
                      type="button"
                      onClick={() => {
                        setKeyword("");
                        setHasSearched(false);
                        setSearchResults([]);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
                      title="Xóa từ khóa"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <input
                  id="image-search-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSearch}
                  disabled={isLoading}
                  className="hidden"
                />

                <label
                  htmlFor="image-search-input"
                  title="Tìm kiếm bằng hình ảnh AI"
                  className="flex shrink-0 w-12 cursor-pointer items-center justify-center border-l border-neutral-200 bg-neutral-50 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-shop_dark_green"
                >
                  <Camera className="h-5 w-5" />
                  <span className="sr-only">Tìm kiếm bằng hình ảnh</span>
                </label>

                <button
                  disabled={isLoading}
                  type="submit"
                  title="Tìm kiếm"
                  className="flex shrink-0 w-12 items-center justify-center border-l border-neutral-200 bg-shop_dark_green text-white hover:bg-shop_dark_green/90 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <Search className="h-5 w-5" />
                </button>
              </form>

              {/* Main Content Area */}
              <div className="mt-4 flex-1 min-h-0 overflow-y-auto overscroll-contain  border border-neutral-200 bg-white">
                {/* 1. INITIAL STATE: Search History & Popular Suggestions */}
                {!hasSearched && !isLoading && !keyword.trim() && (
                  <div className="p-4 sm:p-5 space-y-5">
                    {/* Search History */}
                    {searchHistory.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-900">
                            <Clock className="h-4 w-4 text-shop_dark_green" />
                            <span>Lịch sử tìm kiếm</span>
                          </div>
                          <button
                            type="button"
                            onClick={clearAllHistory}
                            className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Xóa tất cả</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {searchHistory.map((item) => (
                            <div
                              key={item}
                              onClick={() => handleSelectTerm(item)}
                              className="group inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-shop_dark_green/40 pl-3 pr-2 py-1.5 text-xs text-neutral-700 transition cursor-pointer"
                            >
                              <Clock className="h-3 w-3 text-neutral-400 group-hover:text-shop_dark_green transition-colors" />
                              <span className="font-medium">{item}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeHistoryItem(item);
                                }}
                                className="ml-0.5 rounded-full p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-red-600 transition-colors cursor-pointer"
                                aria-label={`Xóa "${item}" khỏi lịch sử`}
                                title="Xóa"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gợi ý tìm kiếm */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2.5">
                        Gợi ý tìm kiếm
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_SEARCHES.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => handleSelectTerm(term)}
                            className="rounded-full border border-neutral-200 bg-white hover:border-shop_dark_green hover:text-shop_dark_green hover:bg-shop_light_green/5 px-3.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors cursor-pointer"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Banner đơn giản giống giỏ hàng */}
                    <div className="rounded-xl bg-neutral-100 px-4 py-3.5 text-xs sm:text-sm text-neutral-600">
                      <p className="font-medium">
                        Tìm kiếm và khám phá các sản phẩm từ{" "}
                        <span className="font-bold text-shop_light_green">
                          TECHWISE
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. LOADING STATE */}
                {isLoading && (
                  <Loading
                    message="Đang tìm kiếm sản phẩm..."
                    className="h-full min-h-[300px] py-12"
                  />
                )}

                {/* 3. ERROR STATE */}
                {!isLoading && error && (
                  <div className="flex flex-col h-64 items-center justify-center p-6 text-center text-xs text-red-500">
                    <p>{error}</p>
                  </div>
                )}

                {/* 4. EMPTY RESULTS */}
                {!isLoading &&
                  !error &&
                  hasSearched &&
                  searchResults.length === 0 && (
                    <div className="flex flex-col h-64 items-center justify-center gap-2 p-6 text-center">
                      <PackageSearch className="h-10 w-10 text-neutral-300" />
                      <p className="text-sm font-bold uppercase tracking-tight text-neutral-900">
                        Không tìm thấy sản phẩm nào
                      </p>
                      <p className="text-xs text-neutral-500 max-w-md">
                        {searchMode === "image" ? (
                          `Không tìm thấy sản phẩm tương đồng với ảnh "${searchedKeyword}".`
                        ) : (
                          <>
                            Không tìm thấy kết quả phù hợp cho &ldquo;
                            <strong className="text-neutral-900 font-semibold">
                              {searchedKeyword}
                            </strong>
                            &rdquo;. Hãy thử kiểm tra lỗi chính tả hoặc tìm kiếm bằng từ khóa khác.
                          </>
                        )}
                      </p>
                    </div>
                  )}

                {/* 5. SEARCH RESULTS LIST */}
                {!isLoading && !error && searchResults.length > 0 && (
                  <div>
                    <div className="border-b border-neutral-200 bg-neutral-50/60 px-4 py-2.5 text-xs text-neutral-500">
                      Tìm thấy{" "}
                      <strong className="text-neutral-900 font-semibold">
                        {searchResults.length}
                      </strong>{" "}
                      sản phẩm phù hợp
                    </div>

                    <div className="divide-y divide-neutral-100">
                      {searchResults.map((product) => {
                        const image = resolveProductImage(product.images?.[0]);
                        const imgSrc =
                          typeof image === "string" ? image : image?.src;
                        const hasDiscount =
                          product.discount > 0 ||
                          (product.finalPrice &&
                            product.finalPrice < product.price);

                        const itemInCart = getItemByProductId(product.id);
                        const quantityInCart = itemInCart?.quantity ?? 0;
                        const isOutOfStock = product?.stock === 0;
                        const stockLimit =
                          itemInCart?.stockQuantity ??
                          product.stock ??
                          Infinity;

                        return (
                          <div
                            key={product.id}
                            className="flex items-center gap-4 px-4 py-3.5 hover:bg-neutral-50/60 transition-colors"
                          >
                            <Link
                              href={`/product/${product.slug ?? product.id}`}
                              onClick={closeSearch}
                              className="shrink-0"
                            >
                              {imgSrc ? (
                                <img
                                  src={imgSrc}
                                  alt={product.name}
                                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg border border-neutral-200 bg-white object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-400">
                                  <PackageSearch className="h-6 w-6" />
                                </div>
                              )}
                            </Link>

                            <div className="flex flex-1 items-center justify-between gap-4 min-w-0">
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/product/${product.slug ?? product.id}`}
                                  onClick={closeSearch}
                                  className="text-xs sm:text-sm font-semibold text-neutral-900 hover:text-shop_dark_green transition-colors line-clamp-2"
                                >
                                  {product.name}
                                </Link>

                                {product.brand && (
                                  <span className="mt-0.5 inline-block text-[11px] text-neutral-500">
                                    Hãng:{" "}
                                    <strong className="text-neutral-700 font-medium">
                                      {product.brand}
                                    </strong>
                                  </span>
                                )}

                                <div className="mt-1 flex items-baseline gap-2">
                                  <span className="text-sm sm:text-base font-bold text-shop_dark_green">
                                    {formatPrice(
                                      product.finalPrice || product.price
                                    )}
                                  </span>
                                  {hasDiscount && (
                                    <span className="text-[11px] text-neutral-400 line-through">
                                      {formatPrice(product.price)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {itemInCart && quantityInCart > 0 ? (
                                <div className="shrink-0 flex items-center gap-2">
                                  <div className="flex items-center border border-neutral-300 bg-white">
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleDecreaseQuantity(itemInCart, e)
                                      }
                                      aria-label="Giảm số lượng"
                                      className="flex h-6 w-6 items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-shop_dark_green transition-colors cursor-pointer"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="w-6 text-center text-xs font-semibold tabular-nums text-neutral-900">
                                      {quantityInCart}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleIncreaseQuantity(
                                          itemInCart,
                                          stockLimit,
                                          e
                                        )
                                      }
                                      disabled={quantityInCart >= stockLimit}
                                      aria-label="Tăng số lượng"
                                      className="flex h-6 w-6 items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-shop_dark_green transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <Link
                                    href="/cart"
                                    onClick={closeSearch}
                                    className="hidden sm:inline-flex items-center text-xs font-medium text-shop_dark_green hover:underline whitespace-nowrap"
                                  >
                                    Giỏ hàng
                                  </Link>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleAddToCart(product, e)}
                                  disabled={isOutOfStock}
                                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg bg-shop_dark_green text-white hover:bg-shop_dark_green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">
                                    {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
