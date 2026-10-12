"use client";

import { searchProducts } from "@/lib/api";
import { Search, X, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SearchBar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<
    Awaited<ReturnType<typeof searchProducts>>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [hasSearched, setHasSearched] = useState(false);
  const [searchedKeyword, setSearchedKeyword] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isSearchOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isSearchOpen]);

  useEffect(() => {
    const searchKeyword = keyword.trim();

    if (!searchKeyword) {
      setSearchResults([]);
      setError("");
      setIsLoading(false);
      setSearchedKeyword("");
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError("");

        const results = await searchProducts(searchKeyword);

        setSearchResults(results);
        setSearchedKeyword(searchKeyword);
        setHasSearched(true);

        console.log("Kết quả tìm kiếm:", results);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi tìm kiếm.";

        setError(message);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [keyword]);

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
        <Search className="h-5 w-5 hover:text-shop_light_green" />
      </button>

      {mounted &&
        isSearchOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-10"
            onClick={closeSearch}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="relative h-[calc(100dvh-5rem)] w-full max-w-5xl overflow-hidden rounded-lg bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Đóng tìm kiếm"
                className="absolute right-4 top-4 text-gray-500 hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="mb-1 text-lg font-semibold text-black">
                Product Searchbar
              </h2>

              <div className="flex h-11 overflow-hidden rounded-md border border-gray-500">
                {/* Tìm kiếm bằng từ khóa */}
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Search your product here..."
                  autoFocus
                  className="min-w-0 flex-1 px-3 text-sm outline-none"
                />

                {/* Input chọn ảnh, được ẩn đi */}
                <input
                  id="image-search-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                {/* Nút tìm kiếm bằng hình ảnh */}
                <label
                  htmlFor="image-search-input"
                  title="Tìm kiếm bằng hình ảnh"
                  className="flex w-12 cursor-pointer items-center justify-center bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-shop_light_green"
                >
                  <Camera className="h-5 w-5" />
                  <span className="sr-only">Tìm kiếm bằng hình ảnh</span>
                </label>

                {/* Nút tìm kiếm bằng từ khóa */}
                <button
                  disabled={isLoading}
                  type="button"
                  title="Tìm kiếm"
                  aria-label="Tìm kiếm"
                  className="flex w-12 items-center justify-center transition-colors hover:bg-gray-200"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
                {!hasSearched && (
                  <div className="flex items-center gap-2 bg-gray-100 px-4 py-5 text-gray-600">
                    <Search className="h-5 w-5" />
                    <p className="font-medium">
                      Search and explore your products from{" "}
                      <span className="font-bold text-shop_light_green">
                        TECHWISE
                      </span>
                    </p>
                  </div>
                )}
                <div
                  className={`bg-white ${
                    hasSearched || isLoading || error
                      ? "h-[75vh] overflow-y-auto overscroll-contain"
                      : "h-auto"
                  }`}
                >
                  {isLoading && (
                    <div className="flex h-full items-center justify-center text-gray-500">
                      Đang tìm kiếm...
                    </div>
                  )}

                  {!isLoading && error && (
                    <div className="flex h-full items-center justify-center text-red-500">
                      {error}
                    </div>
                  )}

                  {!isLoading &&
                    !error &&
                    hasSearched &&
                    searchResults.length === 0 && (
                      <div className="flex h-full items-center justify-center text-gray-500">
                        <p>
                          Nothing matches the keyword{" "}
                          <strong className="text-gray-800">
                            “{searchedKeyword}”
                          </strong>
                          . Please try something else.
                        </p>
                      </div>
                    )}
                  {!isLoading && !error && searchResults.length > 0 && (
                    <div className="divide-y">
                      {searchResults.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50"
                        >
                          {product.images?.[0] && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-24 w-24 rounded-md object-cover"
                            />
                          )}

                          <div className="flex justify-between w-full items-center gap-4">
                            <div>
                              <h3 className="text-sm md:text-lg font-semibold text-gray-800">
                                {product.name}
                              </h3>

                              <span className="text-sm font-semibold text-shop_dark_green md:text-lg">
                                {product.finalPrice.toLocaleString("vi-VN")} ₫
                              </span>
                            </div>
                            <div>
                              <button className="rounded-md bg-shop_light_green px-4 py-2 text-white hover:bg-shop_green">
                                Add to cart
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default SearchBar;
