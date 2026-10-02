"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  Heart,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import type { Product, Category, Brand } from "../app/data/types";
import { productImages } from "../images";
import { getAllProductsByCategory } from "../lib/api";

type ShopProps = {
  products: Product[];
  categories: Category[];
  brands: Brand[];
};

type SortValue =
  | "default"
  | "price-asc"
  | "price-desc"
  | "discount-asc"
  | "discount-desc";

const PAGE_SIZE = 15;

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "default", label: "Mặc định" },
  { value: "price-asc", label: "Giá: Thấp đến cao" },
  { value: "price-desc", label: "Giá: Cao đến thấp" },
  { value: "discount-asc", label: "Giảm giá: Thấp đến cao" },
  { value: "discount-desc", label: "Giảm giá: Cao đến thấp" },
];

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);

const resolveProductImage = (
  fileName?: string
): StaticImageData | string | null => {
  if (!fileName) return null;

  const localImage = (
    productImages as Record<string, StaticImageData | undefined>
  )[fileName];

  // Nếu không có trong map ảnh local (vd fileName là URL đầy đủ
  // như "https://placehold.co/..."), dùng luôn chuỗi đó làm src.
  return localImage ?? fileName;
};

const getFinalPrice = (p: Product) => p.price - (p.discount ?? 0);

// % giảm giá (0 nếu không giảm) - dùng để sắp xếp theo mức giảm.
const getDiscountPercent = (p: Product) =>
  p.price > 0 && (p.discount ?? 0) > 0
    ? ((p.discount ?? 0) / p.price) * 100
    : 0;

// Sản phẩm đang sale: có giảm giá, hoặc backend gắn status "sale".
const isOnSale = (p: Product) =>
  (p.discount ?? 0) > 0 || p.status === "sale";

/* ------------------------------------------------------------------ */
/* Mức giá gợi ý (tự sinh từ giá thấp nhất / cao nhất của backend)     */
/* ------------------------------------------------------------------ */

type PriceRange = { from: number; to: number };

// 1200000 -> "1,2 triệu", 100000000 -> "100 triệu"
const formatShortVND = (value: number) => {
  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n);
  if (value >= 1_000_000_000) return `${fmt(value / 1_000_000_000)} tỷ`;
  if (value >= 1_000_000) return `${fmt(value / 1_000_000)} triệu`;
  if (value >= 1_000) return `${fmt(value / 1_000)} nghìn`;
  return fmt(value);
};

// Tạo các khoảng giá "đẹp": làm tròn xuống min, làm tròn lên max,
// các mốc ở giữa theo thang 1-2-5 (vd 1tr, 2tr, 5tr, 10tr, 20tr, 50tr, 100tr).
const buildPriceRanges = (prices: number[]): PriceRange[] => {
  const valid = prices.filter((n) => Number.isFinite(n) && n > 0);
  if (valid.length === 0) return [];

  const rawMin = Math.min(...valid);
  const rawMax = Math.max(...valid);

  const magMin = Math.pow(10, Math.floor(Math.log10(rawMin)));
  const magMax = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const lo = Math.floor(rawMin / magMin) * magMin; // 1.200.000 -> 1.000.000
  const hi = Math.ceil(rawMax / magMax) * magMax; // 99.000.000 -> 100.000.000

  if (lo === hi) return [{ from: lo, to: hi }];

  const buildBoundaries = (steps: number[]) => {
    const out = new Set<number>([lo, hi]);
    for (let mag = magMin; mag <= hi; mag *= 10) {
      for (const s of steps) {
        const v = s * mag;
        if (v > lo && v < hi) out.add(v);
      }
    }
    return Array.from(out).sort((a, b) => a - b);
  };

  let boundaries = buildBoundaries([1, 2, 5]);
  if (boundaries.length > 8) boundaries = buildBoundaries([1]);

  // Khoảng giá quá hẹp (ít mốc, vd 1,2tr–1,9tr) -> chia đều ~4 khoảng với
  // bước "đẹp" (1, 2, 2,5, 5 x 10^n). Luôn có bước tối thiểu > 0 và giới hạn
  // số vòng lặp để không bao giờ lặp vô hạn / sinh hàng nghìn ô.
  if (boundaries.length < 3) {
    const rawStep = (hi - lo) / 4;
    const stepMag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const niceStep =
      [1, 2, 2.5, 5, 10].map((m) => m * stepMag).find((st) => st >= rawStep) ??
      rawStep;

    const linear: number[] = [lo];
    for (let i = 1; i <= 8; i++) {
      const v = lo + niceStep * i;
      if (v >= hi) break;
      linear.push(v);
    }
    linear.push(hi);
    boundaries = linear;
  }

  const ranges: PriceRange[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    ranges.push({ from: boundaries[i], to: boundaries[i + 1] });
  }
  return ranges;
};

/* ------------------------------------------------------------------ */
/* Component nhỏ dùng lại                                              */
/* ------------------------------------------------------------------ */

const FilterTag = ({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-shop_light_bg pl-3 pr-1.5 py-1 text-xs text-darkColor">
    {label}
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Xoá bộ lọc ${label}`}
      className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 hoverEffect"
    >
      <X size={10} />
    </button>
  </span>
);

const AccordionSection = ({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <section className="border-t border-gray-100 py-5">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between text-left"
    >
      <h3 className="text-base font-semibold text-darkColor">{title}</h3>
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200">
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </span>
    </button>

    <div
      className={`grid transition-all duration-200 ease-out ${
        open ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* Shop                                                                */
/* ------------------------------------------------------------------ */

const Shop = ({
  products: productsProp,
  categories: categoriesProp,
  // brandsProp đến từ /brands API cũ (object id/slug), nhưng dữ liệu brand
  // thật của product là string thô (vd "Microsoft") nên không dùng prop
  // này để lọc nữa - brand list được tự dựng trực tiếp từ sản phẩm.
  brands: _brandsProp,
}: ShopProps) => {
  // Phòng hộ: nếu API trả về sai kiểu (không phải mảng) hoặc undefined,
  // luôn fallback về mảng rỗng thay vì để .filter/.find/.map ném lỗi.
  const initialProducts = Array.isArray(productsProp) ? productsProp : [];
  const categories = Array.isArray(categoriesProp) ? categoriesProp : [];

  const searchParams = useSearchParams();
  const categorySlugParam = searchParams.get("category");
  const brandParam = searchParams.get("brand");
  // ?sale=1 (hoặc true) -> chỉ hiện sản phẩm đang giảm giá (link từ khối Flash Sale)
  const saleParam = searchParams.get("sale");
  const saleFromUrl = saleParam === "1" || saleParam === "true";

  // activeCategory: SLUG, vẫn lọc ở SERVER qua query param `category`.
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categorySlugParam
  );
  // activeBrands: các chuỗi brand thô của API (vd "Microsoft"). Cho phép
  // chọn nhiều brand (checkbox). Lọc brand hoàn toàn ở CLIENT.
  const [activeBrands, setActiveBrands] = useState<string[]>(
    brandParam ? [brandParam] : []
  );
  const [saleOnly, setSaleOnly] = useState(saleFromUrl);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("default");

  // UI state
  const [brandSearch, setBrandSearch] = useState("");
  const [openSections, setOpenSections] = useState({ price: true, brand: true });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string | number>>(new Set());
  const sortRef = useRef<HTMLDivElement>(null);

  // ---------- Nạp toàn bộ sản phẩm theo category ----------
  const [page, setPage] = useState(0);
  const [categoryProducts, setCategoryProducts] =
    useState<Product[]>(initialProducts);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCategoryProducts() {
      setLoadingProducts(true);
      setProductsError(null);
      try {
        const items = await getAllProductsByCategory(
          activeCategory ?? undefined
        );
        if (ignore) return;
        setCategoryProducts(items);
      } catch (err) {
        if (!ignore) {
          setProductsError(
            err instanceof Error ? err.message : "Lỗi không xác định"
          );
        }
      } finally {
        if (!ignore) setLoadingProducts(false);
      }
    }

    loadCategoryProducts();
    return () => {
      ignore = true;
    };
  }, [activeCategory]);

  // Đóng dropdown sort khi click ra ngoài
  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [sortOpen]);

  // Khoá scroll nền khi mở drawer mobile
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // ---------- Dữ liệu dẫn xuất ----------
  const brandOptions = useMemo(() => {
    const seen = new Map<string, string>(); // key (lowercase) -> label gốc
    for (const p of categoryProducts) {
      const raw = (p as unknown as { brand?: string }).brand;
      const label = raw?.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (!seen.has(key)) seen.set(key, label);
    }
    return Array.from(seen.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categoryProducts]);

  // Mức giá gợi ý: dựa trên giá thấp nhất / cao nhất của sản phẩm backend
  // (theo category, không phụ thuộc brand/giá đang lọc để các ô không nhảy).
  const priceRanges = useMemo(
    () => buildPriceRanges(categoryProducts.map(getFinalPrice)),
    [categoryProducts]
  );

  const visibleBrandOptions = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return brandOptions;
    return brandOptions.filter((b) => b.key.includes(q));
  }, [brandOptions, brandSearch]);

  const activeBrandKeys = useMemo(
    () => new Set(activeBrands.map((b) => b.toLowerCase())),
    [activeBrands]
  );

  // Lọc brand + giá ở client
  const filteredProducts = useMemo(() => {
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;

    return categoryProducts.filter((p) => {
      if (saleOnly && !isOnSale(p)) return false;
      if (activeBrandKeys.size > 0) {
        const raw = (p as unknown as { brand?: string }).brand;
        if (!raw || !activeBrandKeys.has(raw.trim().toLowerCase())) {
          return false;
        }
      }
      const price = getFinalPrice(p);
      if (min !== null && !Number.isNaN(min) && price < min) return false;
      if (max !== null && !Number.isNaN(max) && price > max) return false;
      return true;
    });
  }, [categoryProducts, activeBrandKeys, priceMin, priceMax, saleOnly]);

  const sortedFilteredProducts = useMemo(() => {
    if (sortBy === "default") return filteredProducts;
    const result = [...filteredProducts];
    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => getFinalPrice(a) - getFinalPrice(b));
        break;
      case "price-desc":
        result.sort((a, b) => getFinalPrice(b) - getFinalPrice(a));
        break;
      case "discount-asc":
        result.sort((a, b) => getDiscountPercent(a) - getDiscountPercent(b));
        break;
      case "discount-desc":
        result.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
        break;
    }
    return result;
  }, [filteredProducts, sortBy]);

  const totalElements = sortedFilteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

  const sortedProducts = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedFilteredProducts.slice(start, start + PAGE_SIZE);
  }, [sortedFilteredProducts, page]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [totalPages, page]);

  // Đồng bộ state khi query param trên URL thay đổi
  useEffect(() => {
    setActiveCategory(categorySlugParam ?? null);
    setPage(0);
  }, [categorySlugParam]);

  useEffect(() => {
    setActiveBrands(brandParam ? [brandParam] : []);
    setPage(0);
  }, [brandParam]);

  useEffect(() => {
    setSaleOnly(saleFromUrl);
    setPage(0);
  }, [saleFromUrl]);

  // ---------- Handlers ----------
  const handlePageChange = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= totalPages || nextPage === page) return;
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectCategory = (slug: string | null) => {
    setActiveCategory(slug);
    setActiveBrands([]);
    setBrandSearch("");
    setPage(0);
  };

  const toggleBrand = (label: string) => {
    const key = label.toLowerCase();
    setActiveBrands((prev) =>
      prev.some((b) => b.toLowerCase() === key)
        ? prev.filter((b) => b.toLowerCase() !== key)
        : [...prev, label]
    );
    setPage(0);
  };

  const removeBrand = (label: string) => {
    setActiveBrands((prev) =>
      prev.filter((b) => b.toLowerCase() !== label.toLowerCase())
    );
    setPage(0);
  };

  const handlePriceMin = (v: string) => {
    setPriceMin(v.replace(/\D/g, ""));
    setPage(0);
  };
  const handlePriceMax = (v: string) => {
    setPriceMax(v.replace(/\D/g, ""));
    setPage(0);
  };

  // Chọn 1 mức giá gợi ý -> tự nhập vào 2 ô Từ/Đến. Bấm lại mức đang chọn -> bỏ.
  const handleSelectPriceRange = (range: PriceRange) => {
    const isActive =
      priceMin === String(range.from) && priceMax === String(range.to);
    if (isActive) {
      setPriceMin("");
      setPriceMax("");
    } else {
      setPriceMin(String(range.from));
      setPriceMax(String(range.to));
    }
    setPage(0);
  };

  const clearPrice = () => {
    setPriceMin("");
    setPriceMax("");
    setPage(0);
  };

  const toggleSaleOnly = () => {
    setSaleOnly((v) => !v);
    setPage(0);
  };

  const handleResetFilters = () => {
    setActiveCategory(null);
    setSaleOnly(false);
    setActiveBrands([]);
    setBrandSearch("");
    setPriceMin("");
    setPriceMax("");
    setSortBy("default");
    setPage(0);
  };

  const toggleWishlist = (id: string | number) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (key: "price" | "brand") =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(0, page - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons);
    start = Math.max(0, end - maxButtons);
    return Array.from({ length: end - start }, (_, i) => start + i);
  }, [page, totalPages]);

  // ---------- Tag đang chọn ----------
  const activeCategoryTitle = categories.find(
    (c) => c.slug === activeCategory
  )?.title;
  const hasPriceFilter = priceMin !== "" || priceMax !== "";
  const hasAnyFilter =
    !!activeCategory ||
    activeBrands.length > 0 ||
    hasPriceFilter ||
    saleOnly ||
    sortBy !== "default";

  const priceTagLabel = hasPriceFilter
    ? `${priceMin ? formatVND(Number(priceMin)) : "0"} – ${
        priceMax ? formatVND(Number(priceMax)) : "∞"
      }`
    : "";

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sắp xếp";

  /* ---------------------------------------------------------------- */
  /* Nội dung sidebar (dùng chung cho desktop + drawer mobile)        */
  /* ---------------------------------------------------------------- */
  const filterPanel = (
    <div>
      {/* Reset + tag đang chọn */}
      <div className="pb-5">
        <button
          type="button"
          onClick={handleResetFilters}
          disabled={!hasAnyFilter}
          className="inline-flex items-center gap-2 text-sm font-medium text-darkColor hoverEffect hover:text-shop_light_green disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-darkColor"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-shop_light_bg">
            <X size={12} />
          </span>
          Xoá bộ lọc
        </button>

        {(activeCategoryTitle ||
          activeBrands.length > 0 ||
          hasPriceFilter ||
          saleOnly) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeCategoryTitle && (
              <FilterTag
                label={activeCategoryTitle}
                onRemove={() => handleSelectCategory(null)}
              />
            )}
            {saleOnly && (
              <FilterTag label="Đang giảm giá" onRemove={toggleSaleOnly} />
            )}
            {activeBrands.map((b) => (
              <FilterTag key={b} label={b} onRemove={() => removeBrand(b)} />
            ))}
            {hasPriceFilter && (
              <FilterTag label={priceTagLabel} onRemove={clearPrice} />
            )}
          </div>
        )}
      </div>

      {/* Lọc sản phẩm đang sale */}
      <section className="border-t border-gray-100 py-5">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-base font-semibold text-darkColor">
            Đang giảm giá
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={saleOnly}
            onChange={toggleSaleOnly}
            className="peer sr-only"
          />
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full hoverEffect peer-focus-visible:ring-2 peer-focus-visible:ring-shop_light_green ${
              saleOnly ? "bg-shop_light_green" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                saleOnly ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </label>
      </section>

      {/* Giá */}
      <AccordionSection
        title="Giá"
        open={openSections.price}
        onToggle={() => toggleSection("price")}
      >
        {priceRanges.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 p-0.5">
            {priceRanges.map((range) => {
              const active =
                priceMin === String(range.from) &&
                priceMax === String(range.to);
              return (
                <button
                  key={`${range.from}-${range.to}`}
                  type="button"
                  onClick={() => handleSelectPriceRange(range)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-xs hoverEffect ${
                    active
                      ? "border-shop_light_green bg-shop_light_green text-white"
                      : "border-gray-200 text-darkColor hover:border-shop_light_green"
                  }`}
                >
                  {formatShortVND(range.from)} – {formatShortVND(range.to)}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 p-0.5">
          <input
            type="text"
            inputMode="numeric"
            value={priceMin}
            onChange={(e) => handlePriceMin(e.target.value)}
            placeholder="Từ"
            aria-label="Giá thấp nhất"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-shop_light_green hoverEffect"
          />
          <span className="text-gray-400">–</span>
          <input
            type="text"
            inputMode="numeric"
            value={priceMax}
            onChange={(e) => handlePriceMax(e.target.value)}
            placeholder="Đến"
            aria-label="Giá cao nhất"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-shop_light_green hoverEffect"
          />
        </div>
      </AccordionSection>

      {/* Thương hiệu */}
      <AccordionSection
        title="Thương hiệu"
        open={openSections.brand}
        onToggle={() => toggleSection("brand")}
      >
        <div className="p-0.5">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              placeholder="Tìm thương hiệu"
              aria-label="Tìm thương hiệu"
              className="w-full rounded-full bg-shop_light_bg py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-shop_light_green"
            />
          </div>

          <ul className="mt-4 space-y-3">
            {visibleBrandOptions.length === 0 && (
              <li className="text-sm text-lightColor">
                Không có thương hiệu phù hợp.
              </li>
            )}
            {visibleBrandOptions.map((brand) => {
              const checked = activeBrandKeys.has(brand.key);
              return (
                <li key={brand.key}>
                  <label className="flex cursor-pointer items-center gap-3 text-sm text-darkColor">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBrand(brand.label)}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border hoverEffect peer-focus-visible:ring-2 peer-focus-visible:ring-shop_light_green ${
                        checked
                          ? "border-shop_light_green bg-shop_light_green text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {checked && <Check size={14} strokeWidth={3} />}
                    </span>
                    {brand.label}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </AccordionSection>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8 lg:py-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-x-10">
        {/* Cột trái: tiêu đề + breadcrumb + bộ lọc (desktop) */}
        <div className="lg:col-span-1 lg:self-start">
          <nav aria-label="Breadcrumb" className="mt-4 text-xs text-lightColor">
            <Link href="/" className="hover:text-darkColor hoverEffect">
              Trang chủ
            </Link>
            <span className="mx-2">·</span>
            <span>Cửa hàng</span>
          </nav>

          <div className="mt-8 hidden lg:block">{filterPanel}</div>
        </div>

        {/* Cột phải */}
        <div className="lg:col-span-3">
          {/* Thanh danh mục + sort */}
          <div className="mb-6 flex items-center justify-between gap-3 lg:pt-2">
            <div className="flex min-w-0 flex-1 items-center gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ id: "__all", slug: null, title: "Tất cả" }, ...categories.map((c) => ({ id: c.id, slug: c.slug, title: c.title }))].map(
                (c) => {
                  const active = activeCategory === c.slug;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCategory(c.slug)}
                      aria-current={active ? "true" : undefined}
                      className={`relative shrink-0 whitespace-nowrap py-3 text-sm hoverEffect ${
                        active
                          ? "font-medium text-shop_light_green"
                          : "text-lightColor hover:text-darkColor"
                      }`}
                    >
                      {c.title}
                      <span
                        className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-shop_light_green transition-transform duration-200 origin-left ${
                          active ? "scale-x-100" : "scale-x-0"
                        }`}
                      />
                    </button>
                  );
                }
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* Nút mở bộ lọc (mobile/tablet) */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-darkColor hoverEffect hover:border-shop_light_green lg:hidden"
              >
                <SlidersHorizontal size={16} />
                Bộ lọc
              </button>

              {/* Sort dropdown */}
              <div ref={sortRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSortOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-darkColor hoverEffect hover:border-shop_light_green"
                >
                  <SlidersHorizontal size={16} className="hidden sm:block" />
                  <span className="hidden sm:inline">{currentSortLabel}</span>
                  <span className="sm:hidden">Sắp xếp</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${
                      sortOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {sortOpen && (
                  <ul
                    role="listbox"
                    className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <li key={opt.value} role="option" aria-selected={sortBy === opt.value}>
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy(opt.value);
                            setSortOpen(false);
                            setPage(0);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-shop_light_bg ${
                            sortBy === opt.value
                              ? "font-medium text-shop_light_green"
                              : "text-darkColor"
                          }`}
                        >
                          {opt.label}
                          {sortBy === opt.value && <Check size={14} />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>


          {/* Lưới sản phẩm */}
          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-gray-200">
                  <div className="aspect-[5/4] w-full bg-gray-200" />
                  <div className="space-y-2 px-3 pb-3 pt-3">
                    <div className="h-3 w-1/3 rounded bg-gray-200" />
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : productsError ? (
            <p className="text-sm text-red-600">
              Không tải được sản phẩm: {productsError}
            </p>
          ) : sortedProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center">
              <p className="text-sm text-lightColor">
                Không có sản phẩm nào phù hợp với bộ lọc.
              </p>
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 text-sm font-medium text-shop_light_green underline"
                >
                  Xoá bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
              {sortedProducts.map((product) => {
                const finalPrice = getFinalPrice(product);
                const extra = product as unknown as {
                  brand?: string;
                  categories?: string[];
                  rating?: number;
                };
                const brandLabel = extra.brand ?? extra.categories?.[0];
                const rating =
                  typeof extra.rating === "number" ? extra.rating : null;
                const discountPercent =
                  product.discount && product.price > 0
                    ? Math.round((product.discount / product.price) * 100)
                    : 0;
                const imageSrc = resolveProductImage(product.images?.[0]);
                const liked = wishlist.has(product.id);

                return (
                  <article
                    key={product.id}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white hoverEffect hover:shadow-md"
                  >
                    {/* Khung ảnh */}
                    <div className="relative aspect-[5/4] w-full overflow-hidden bg-shop_light_bg">
                      <Link
                        href={`/product/${product.id}`}
                        aria-label={product.name}
                        className="absolute inset-0 block"
                      >
                        {imageSrc && (
                          <Image
                            src={imageSrc}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        )}
                      </Link>

                      {discountPercent > 0 ? (
                        <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg bg-shop_light_green px-2.5 py-1 text-xs font-medium text-white">
                          Sale {discountPercent}%
                        </span>
                      ) : product.status ? (
                        <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg bg-darkColor px-2.5 py-1 text-xs font-medium uppercase text-white">
                          {product.status}
                        </span>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => toggleWishlist(product.id)}
                        aria-label={
                          liked ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"
                        }
                        aria-pressed={liked}
                        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white/80 backdrop-blur hoverEffect hover:border-shop_light_green"
                      >
                        <Heart
                          size={16}
                          strokeWidth={1.5}
                          className={
                            liked
                              ? "fill-red-500 text-red-500"
                              : "text-darkColor"
                          }
                        />
                      </button>
                    </div>

                    {/* Thông tin: dòng 1 brand + sao, dòng 2 giá, dòng 3 tên */}
                    <Link
                      href={`/product/${product.id}`}
                      className="block px-3 pb-3 pt-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs uppercase tracking-wide text-lightColor">
                          {brandLabel}
                        </span>
                        {rating !== null && (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-darkColor">
                            <Star
                              size={13}
                              className="fill-yellow-400 text-yellow-400"
                            />
                            {rating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                        <span className="text-base font-semibold text-shop_dark_green">
                          {formatVND(finalPrice)}
                        </span>
                        {!!product.discount && (
                          <span className="text-xs text-lightColor line-through">
                            {formatVND(product.price)}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-1 line-clamp-1 text-sm text-darkColor">
                        {product.name}
                      </h2>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}

          {/* Phân trang */}
          {!loadingProducts &&
            !productsError &&
            sortedProducts.length > 0 &&
            totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hoverEffect hover:border-shop_light_green disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trước
                </button>

                {pageNumbers[0] > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePageChange(0)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hoverEffect hover:border-shop_light_green"
                    >
                      1
                    </button>
                    <span className="px-1 text-sm text-lightColor">…</span>
                  </>
                )}

                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePageChange(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={`rounded-lg border px-3 py-1.5 text-sm hoverEffect ${
                      p === page
                        ? "border-shop_light_green bg-shop_light_green text-white"
                        : "border-gray-200 hover:border-shop_light_green"
                    }`}
                  >
                    {p + 1}
                  </button>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <>
                    <span className="px-1 text-sm text-lightColor">…</span>
                    <button
                      type="button"
                      onClick={() => handlePageChange(totalPages - 1)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hoverEffect hover:border-shop_light_green"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hoverEffect hover:border-shop_light_green disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Drawer bộ lọc (mobile / tablet) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          drawerOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bộ lọc sản phẩm"
          className={`absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white shadow-xl transition-transform duration-300 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 className="text-base font-semibold text-darkColor">Bộ lọc</h2>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Đóng bộ lọc"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-shop_light_bg"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">{filterPanel}</div>

          <div className="border-t border-gray-200 p-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="w-full rounded-full bg-shop_dark_green py-3 text-sm font-medium text-white hoverEffect hover:opacity-90"
            >
              Xem {totalElements} sản phẩm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;