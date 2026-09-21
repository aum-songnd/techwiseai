"use client";

import { Search, X, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SearchBar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isSearchOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isSearchOpen]);

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
              className="relative h-[calc(100dvh-5rem)] w-full max-w-5xl rounded-lg bg-white p-6 shadow-2xl"
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
                  type="button"
                  title="Tìm kiếm"
                  aria-label="Tìm kiếm"
                  className="flex w-12 items-center justify-center transition-colors hover:bg-gray-200"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
                <div className="flex items-center gap-2 bg-gray-100 px-4 py-5 text-gray-600">
                  <Search className="h-5 w-5" />

                  <p className="font-medium">
                    Search and explore your products from{" "}
                    <span className="font-bold text-shop_light_green">
                      TECHWISE
                    </span>
                  </p>
                </div>

                {/* Khu vực kết quả để trống */}
                <div className="h-[55vh] bg-white" />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default SearchBar;
