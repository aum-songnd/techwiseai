"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
  Flame,
  ArrowUpDown,
} from "lucide-react";
import type { Product, Category } from "../app/data/types";
import { getAllProductsByCategory } from "../lib/api";
import ProductCard from "./ProductCard";

type ShopProps = {
  products: Product[];
  categories: Category[];
};

type SortValue =
  | "default"
  | "price-asc"
  | "price-desc"
  | "discount-asc"
  | "discount-desc"
  | "rating-desc";

const PAGE_SIZE = 28;

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "default", label: "Phổ biến nhất" },
  { value: "price-asc", label: "Giá: Thấp đến cao" },
  { value: "price-desc", label: "Giá: Cao đến thấp" },
  { value: "discount-desc", label: "Giảm giá nhiều nhất" },
  { value: "rating-desc", label: "Đánh giá cao nhất" },
];

// Dynamic DB spec extractors
function extractProductCpu(p: Product): string | null {
  const s = p.specifications || {};
  const text = `${p.name} ${s["Loại CPU"] || ""} ${s["CPU"] || ""} ${s["Chipset"] || ""}`.toLowerCase();
  if (/ultra 9/i.test(text)) return "Intel Core Ultra 9";
  if (/ultra 7/i.test(text)) return "Intel Core Ultra 7";
  if (/ultra 5/i.test(text)) return "Intel Core Ultra 5";
  if (/core\s*ultra/i.test(text)) return "Intel Core Ultra";
  if (/i9[-\s]|core i9/i.test(text)) return "Intel Core i9";
  if (/i7[-\s]|core i7/i.test(text)) return "Intel Core i7";
  if (/i5[-\s]|core i5/i.test(text)) return "Intel Core i5";
  if (/i3[-\s]|core i3/i.test(text)) return "Intel Core i3";
  if (/core\s*(3|5|7)\b/i.test(text)) return "Intel Core Series";
  if (/ryzen\s*(ai)?\s*(max\+?\s*)?9/i.test(text)) return "AMD Ryzen 9";
  if (/ryzen\s*(ai)?\s*7/i.test(text)) return "AMD Ryzen 7";
  if (/ryzen\s*(ai)?\s*5/i.test(text)) return "AMD Ryzen 5";
  if (/ryzen\s*(ai)?\s*3/i.test(text)) return "AMD Ryzen 3";
  if (/apple\s*m|m[12345]\s*(pro|max)?/i.test(text)) return "Apple M-Series";
  if (/snapdragon\s*8/i.test(text)) return "Snapdragon 8 Series";
  if (/snapdragon\s*7/i.test(text)) return "Snapdragon 7 Series";
  if (/snapdragon\s*6/i.test(text)) return "Snapdragon 6 Series";
  if (/snapdragon\s*4/i.test(text)) return "Snapdragon 4 Series";
  if (/snapdragon\s*x/i.test(text)) return "Snapdragon X";
  if (/snapdragon/i.test(text)) return "Snapdragon Series";
  if (/chip\s*a\d+|apple\s*a\d+|a\d+\s*pro|bionic/i.test(text)) return "Apple A-Series";
  if (/dimensity|d\d{4}/i.test(text)) return "MediaTek Dimensity";
  if (/helio/i.test(text)) return "MediaTek Helio";
  if (/exynos/i.test(text)) return "Samsung Exynos";
  if (/unisoc/i.test(text)) return "Unisoc";
  return null;
}

function extractProductRam(p: Product): string | null {
  const s = p.specifications || {};
  const text = `${s["Dung lượng RAM"] || ""} ${s["RAM"] || ""} ${p.name}`.toLowerCase();
  const m = text.match(/\b(4|6|8|12|16|24|32|64|128)\s*gb\b/i);
  return m ? `${m[1]}GB` : null;
}

function extractProductStorage(p: Product): string | null {
  const s = p.specifications || {};
  const text = `${s["Ổ cứng"] || ""} ${s["SSD"] || ""} ${s["Bộ nhớ trong"] || ""} ${p.name}`.toLowerCase();
  const m = text.match(/\b(64|128|256|512)\s*gb\b/i) || text.match(/\b(1|2|4)\s*tb\b/i);
  return m ? m[0].toUpperCase().replace(/\s+/, "") : null;
}

function extractProductGpu(p: Product): string | null {
  const s = p.specifications || {};
  const text = `${s["Loại card đồ họa"] || ""} ${s["Card đồ họa"] || ""} ${s["VGA"] || ""}`.toLowerCase();
  if (/rtx\s*50\d0/i.test(text)) return "NVIDIA RTX 50 Series";
  if (/rtx\s*40\d0/i.test(text)) return "NVIDIA RTX 40 Series";
  if (/rtx\s*30\d0|rtx 3050/i.test(text)) return "NVIDIA RTX 30 Series";
  if (/rtx\s*20\d0/i.test(text)) return "NVIDIA RTX 20 Series";
  if (/arc/i.test(text)) return "Intel Arc Graphics";
  if (/iris|uhd|intel graphics/i.test(text)) return "Intel Graphics";
  if (/radeon/i.test(text)) return "AMD Radeon Graphics";
  if (/apple|gpu\s*\d+\s*lõi/i.test(text)) return "Apple GPU";
  return null;
}

function extractProductScreen(p: Product): string | null {
  const s = p.specifications || {};
  const text = `${s["Kích thước màn hình"] || ""} ${p.name}`.toLowerCase();
  const m = text.match(/\b(6\.\d|12|13(?:\.[0-9])?|14(?:\.[0-9])?|15(?:\.[0-9])?|16(?:\.[0-9])?|17(?:\.[0-9])?)\s*(?:inches|inch|"|”)?\b/);
  if (m) {
    const val = parseFloat(m[1]);
    if (val >= 6.0 && val <= 7.0) return `${val}"`;
    if (val >= 12.0 && val < 14.0) return "13 inch";
    if (val >= 14.0 && val < 15.0) return "14 inch";
    if (val >= 15.0 && val < 16.0) return "15 inch";
    if (val >= 16.0 && val < 17.0) return "16 inch";
    if (val >= 17.0) return "17 inch";
  }
  return null;
}

const formatShortVND = (value: number) => {
  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(n);
  if (value >= 1_000_000_000) return `${fmt(value / 1_000_000_000)} tỷ`;
  if (value >= 1_000_000) return `${fmt(value / 1_000_000)} triệu`;
  if (value >= 1_000) return `${fmt(value / 1_000)}k`;
  return fmt(value);
};

const getFinalPrice = (p: Product) => p.finalPrice || (p.price - (p.discount ?? 0));
const getDiscountPercent = (p: Product) =>
  p.price > 0 && (p.discount ?? 0) > 0 ? ((p.discount ?? 0) / p.price) * 100 : 0;
const isOnSale = (p: Product) => (p.discount ?? 0) > 0 || p.status === "sale";

const FilterTag = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-emerald-50/70 pl-3 pr-1.5 py-1 text-xs text-shop_dark_green font-semibold">
    {label}
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Xoá bộ lọc ${label}`}
      className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-emerald-200 transition-colors cursor-pointer"
    >
      <X size={10} />
    </button>
  </span>
);

const AccordionSection = ({
  title,
  open,
  onToggle,
  badgeCount,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  badgeCount?: number;
  children: React.ReactNode;
}) => (
  <section className="border-t border-neutral-200 py-4">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between text-left cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <h3 className="text-xs sm:text-sm font-bold text-neutral-900">{title}</h3>
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-shop_dark_green text-white text-[10px] font-bold flex items-center justify-center">
            {badgeCount}
          </span>
        )}
      </div>
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 text-neutral-500">
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </span>
    </button>

    <div
      className={`grid transition-all duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
        }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  </section>
);

const Shop = ({ products: productsProp, categories: categoriesProp }: ShopProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialProducts = Array.isArray(productsProp) ? productsProp : [];
  const categories = (Array.isArray(categoriesProp) ? categoriesProp : []).filter(
    (c) =>
      c.slug !== "man-hinh" &&
      !c.title?.toLowerCase().includes("quân ka") &&
      !c.title?.toLowerCase().includes("quan ka")
  );

  // Read URL search params
  const categoryParam = searchParams.get("category");
  const brandParam = searchParams.get("brand");
  const saleParam = searchParams.get("sale");
  const minPriceParam = searchParams.get("minPrice") || searchParams.get("priceMin");
  const maxPriceParam = searchParams.get("maxPrice") || searchParams.get("priceMax");
  const cpuParam = searchParams.get("cpu");
  const ramParam = searchParams.get("ram");
  const storageParam = searchParams.get("storage");
  const gpuParam = searchParams.get("gpu");
  const screenParam = searchParams.get("screen");
  const sortParam = (searchParams.get("sort") as SortValue) || "default";
  const inStockParam = searchParams.get("inStock") === "1" || searchParams.get("inStock") === "true";

  // Filter States
  const [activeCategory, setActiveCategory] = useState<string | null>(categoryParam);
  const [activeBrands, setActiveBrands] = useState<string[]>(
    brandParam ? brandParam.split(",") : []
  );
  const [activeCpus, setActiveCpus] = useState<string[]>(
    cpuParam ? cpuParam.split(",") : []
  );
  const [activeRams, setActiveRams] = useState<string[]>(
    ramParam ? ramParam.split(",") : []
  );
  const [activeStorages, setActiveStorages] = useState<string[]>(
    storageParam ? storageParam.split(",") : []
  );
  const [activeGpus, setActiveGpus] = useState<string[]>(
    gpuParam ? gpuParam.split(",") : []
  );
  const [activeScreens, setActiveScreens] = useState<string[]>(
    screenParam ? screenParam.split(",") : []
  );

  const [priceMin, setPriceMin] = useState(minPriceParam || "");
  const [priceMax, setPriceMax] = useState(maxPriceParam || "");
  const [saleOnly, setSaleOnly] = useState(saleParam === "1" || saleParam === "true");
  const [inStockOnly, setInStockOnly] = useState(inStockParam);
  const [sortBy, setSortBy] = useState<SortValue>(sortParam);
  const [brandSearch, setBrandSearch] = useState("");
  const [page, setPage] = useState(0);

  // Accordion open states
  const [openSections, setOpenSections] = useState({
    price: true,
    brand: true,
    cpu: true,
    ram: true,
    storage: false,
    gpu: false,
    screen: false,
  });

  // Listen for searchParams changes (e.g. navigation from MegaMenu, browser Back/Forward, or direct URL changes)
  const lastUrlQueryRef = useRef<string>(searchParams.toString());

  useEffect(() => {
    const currentQuery = searchParams.toString();
    if (currentQuery === lastUrlQueryRef.current) return;
    lastUrlQueryRef.current = currentQuery;

    const cat = searchParams.get("category");
    const brand = searchParams.get("brand");
    const sale = searchParams.get("sale");
    const minP = searchParams.get("minPrice") || searchParams.get("priceMin");
    const maxP = searchParams.get("maxPrice") || searchParams.get("priceMax");
    const cpu = searchParams.get("cpu");
    const ram = searchParams.get("ram");
    const storage = searchParams.get("storage");
    const gpu = searchParams.get("gpu");
    const screen = searchParams.get("screen");
    const sort = (searchParams.get("sort") as SortValue) || "default";
    const inStock = searchParams.get("inStock") === "1" || searchParams.get("inStock") === "true";

    setActiveCategory(cat);
    setActiveBrands(brand ? brand.split(",") : []);
    setActiveCpus(cpu ? cpu.split(",") : []);
    setActiveRams(ram ? ram.split(",") : []);
    setActiveStorages(storage ? storage.split(",") : []);
    setActiveGpus(gpu ? gpu.split(",") : []);
    setActiveScreens(screen ? screen.split(",") : []);
    setPriceMin(minP || "");
    setPriceMax(maxP || "");
    setSaleOnly(sale === "1" || sale === "true");
    setInStockOnly(inStock);
    setSortBy(sort);
    setPage(0);
  }, [searchParams]);

  const filterProductsByCategory = useCallback(
    (items: Product[], catSlug: string | null) => {
      if (!catSlug) return items;
      const target = categories.find((c) => c.slug === catSlug);
      return items.filter((p) => {
        if (target && p.categoryId === target.id) return true;
        if (
          target &&
          p.categories?.some(
            (cName) => cName.toLowerCase() === target.title.toLowerCase()
          )
        ) {
          return true;
        }
        if (
          p.categories?.some(
            (cName) =>
              cName.toLowerCase() === catSlug.toLowerCase() ||
              cName.toLowerCase().replace(/\s+/g, "-") === catSlug.toLowerCase()
          )
        ) {
          return true;
        }
        return false;
      });
    },
    [categories]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of categories) {
      counts[c.slug] = 0;
    }
    for (const p of initialProducts) {
      for (const c of categories) {
        if (
          p.categoryId === c.id ||
          p.categories?.some(
            (cName) => cName.toLowerCase() === c.title.toLowerCase()
          )
        ) {
          counts[c.slug] = (counts[c.slug] || 0) + 1;
          break;
        }
      }
    }
    return counts;
  }, [categories, initialProducts]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>(() => {
    if (!categoryParam) return initialProducts;
    const filtered = filterProductsByCategory(initialProducts, categoryParam);
    return filtered.length > 0 ? filtered : initialProducts;
  });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const categoryProductsCache = useRef(
    new Map<string, Product[]>([
      ["", initialProducts],
      ...(categoryParam
        ? ([[categoryParam, filterProductsByCategory(initialProducts, categoryParam)]] as [string, Product[]][])
        : []),
    ])
  );

  // Sync products when category changes
  useEffect(() => {
    const key = activeCategory ?? "";
    const cached = categoryProductsCache.current.get(key);
    if (cached) {
      setCategoryProducts(cached);
      return;
    }

    if (initialProducts.length > 0) {
      const filtered = filterProductsByCategory(initialProducts, activeCategory);
      if (filtered.length > 0 || !activeCategory) {
        categoryProductsCache.current.set(key, filtered);
        setCategoryProducts(filtered);
        return;
      }
    }

    let ignore = false;
    async function load() {
      setLoadingProducts(true);
      try {
        const items = await getAllProductsByCategory(activeCategory ?? undefined);
        if (!ignore) {
          categoryProductsCache.current.set(key, items);
          setCategoryProducts(items);
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) setLoadingProducts(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [activeCategory, filterProductsByCategory, initialProducts]);

  // Sync state to URL search parameters
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    if (activeBrands.length > 0) params.set("brand", activeBrands.join(","));
    if (priceMin) params.set("minPrice", priceMin);
    if (priceMax) params.set("maxPrice", priceMax);
    if (saleOnly) params.set("sale", "1");
    if (inStockOnly) params.set("inStock", "1");
    if (activeCpus.length > 0) params.set("cpu", activeCpus.join(","));
    if (activeRams.length > 0) params.set("ram", activeRams.join(","));
    if (activeStorages.length > 0) params.set("storage", activeStorages.join(","));
    if (activeGpus.length > 0) params.set("gpu", activeGpus.join(","));
    if (activeScreens.length > 0) params.set("screen", activeScreens.join(","));
    if (sortBy !== "default") params.set("sort", sortBy);

    const queryString = params.toString();
    const currentQuery = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    if (queryString !== currentQuery) {
      lastUrlQueryRef.current = queryString;
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      window.history.replaceState(null, "", newUrl);
    }
  }, [
    activeCategory,
    activeBrands,
    priceMin,
    priceMax,
    saleOnly,
    inStockOnly,
    activeCpus,
    activeRams,
    activeStorages,
    activeGpus,
    activeScreens,
    sortBy,
    pathname,
  ]);

  useEffect(() => {
    const timer = setTimeout(updateUrlParams, 300);
    return () => clearTimeout(timer);
  }, [updateUrlParams]);

  // Brand Options derived from DB products
  const brandOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const p of categoryProducts) {
      const raw = p.brand?.trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label: raw, count: 1 });
      }
    }
    return Array.from(counts.entries())
      .map(([key, { label, count }]) => ({ key, label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [categoryProducts]);

  const visibleBrandOptions = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return brandOptions;
    return brandOptions.filter(
      (b) => b.key.includes(q) || b.label.toLowerCase().includes(q)
    );
  }, [brandOptions, brandSearch]);

  // CPU Options derived from DB products
  const cpuOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of categoryProducts) {
      const val = extractProductCpu(p);
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [categoryProducts]);

  // RAM Options derived from DB products
  const ramOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of categoryProducts) {
      const val = extractProductRam(p);
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => parseInt(a.label, 10) - parseInt(b.label, 10));
  }, [categoryProducts]);

  // Storage Options derived from DB products
  const storageOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of categoryProducts) {
      const val = extractProductStorage(p);
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    }
    const order = ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB", "4TB"];
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => {
        const ia = order.indexOf(a.label);
        const ib = order.indexOf(b.label);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.label.localeCompare(b.label);
      });
  }, [categoryProducts]);

  // GPU Options derived from DB products
  const gpuOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of categoryProducts) {
      const val = extractProductGpu(p);
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [categoryProducts]);

  // Screen Options derived from DB products
  const screenOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of categoryProducts) {
      const val = extractProductScreen(p);
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [categoryProducts]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Multi-Condition Filter Logic from DB
  const filteredProducts = useMemo(() => {
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;
    const activeBrandSet = new Set(activeBrands.map((b) => b.toLowerCase()));

    return categoryProducts.filter((product) => {
      // 1. Sale condition
      if (saleOnly && !isOnSale(product)) return false;

      // 2. In Stock condition
      if (inStockOnly && product.stock <= 0) return false;

      // 3. Brand condition
      if (activeBrandSet.size > 0) {
        const brandKey = (product.brand || "").trim().toLowerCase();
        if (!brandKey) return false;
        const matches = Array.from(activeBrandSet).some(
          (b) =>
            brandKey === b ||
            brandKey.startsWith(b + " ") ||
            b.startsWith(brandKey + " ")
        );
        if (!matches) return false;
      }

      // 4. Price range condition
      const price = getFinalPrice(product);
      if (min !== null && !Number.isNaN(min) && price < min) return false;
      if (max !== null && !Number.isNaN(max) && price > max) return false;

      // 5. CPU condition (from DB)
      if (activeCpus.length > 0) {
        const cpu = extractProductCpu(product);
        if (!cpu) return false;
        const matches = activeCpus.some(
          (c) =>
            cpu.toLowerCase() === c.toLowerCase() ||
            cpu.toLowerCase().startsWith(c.toLowerCase()) ||
            c.toLowerCase().startsWith(cpu.toLowerCase())
        );
        if (!matches) return false;
      }

      // 6. RAM condition (from DB)
      if (activeRams.length > 0) {
        const ram = extractProductRam(product);
        if (!ram || !activeRams.some((r) => r.toLowerCase() === ram.toLowerCase())) return false;
      }

      // 7. Storage condition (from DB)
      if (activeStorages.length > 0) {
        const storage = extractProductStorage(product);
        if (!storage || !activeStorages.some((s) => s.toLowerCase() === storage.toLowerCase())) return false;
      }

      // 8. GPU condition (from DB)
      if (activeGpus.length > 0) {
        const gpu = extractProductGpu(product);
        if (!gpu) return false;
        const matches = activeGpus.some(
          (g) =>
            gpu.toLowerCase() === g.toLowerCase() ||
            gpu.toLowerCase().startsWith(g.toLowerCase()) ||
            g.toLowerCase().startsWith(gpu.toLowerCase())
        );
        if (!matches) return false;
      }

      // 9. Screen condition (from DB)
      if (activeScreens.length > 0) {
        const screen = extractProductScreen(product);
        if (!screen || !activeScreens.some((sc) => sc.toLowerCase() === screen.toLowerCase())) return false;
      }

      return true;
    });
  }, [
    categoryProducts,
    saleOnly,
    inStockOnly,
    activeBrands,
    priceMin,
    priceMax,
    activeCpus,
    activeRams,
    activeStorages,
    activeGpus,
    activeScreens,
  ]);

  // Sorting
  const sortedFilteredProducts = useMemo(() => {
    if (sortBy === "default") return filteredProducts;
    const list = [...filteredProducts];
    switch (sortBy) {
      case "price-asc":
        list.sort((a, b) => getFinalPrice(a) - getFinalPrice(b));
        break;
      case "price-desc":
        list.sort((a, b) => getFinalPrice(b) - getFinalPrice(a));
        break;
      case "discount-desc":
        list.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
        break;
      case "rating-desc":
        list.sort((a, b) => (b.ratingAverage || 5) - (a.ratingAverage || 5));
        break;
    }
    return list;
  }, [filteredProducts, sortBy]);

  // Pagination
  const totalElements = sortedFilteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
  const paginatedProducts = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedFilteredProducts.slice(start, start + PAGE_SIZE);
  }, [sortedFilteredProducts, page]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(0, page - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons);
    start = Math.max(0, end - maxButtons);
    return Array.from({ length: end - start }, (_, i) => start + i);
  }, [page, totalPages]);

  const activeCategoryTitle = useMemo(() => {
    if (!activeCategory) return null;
    return categories.find((c) => c.slug === activeCategory)?.title || activeCategory;
  }, [activeCategory, categories]);

  // Active filter count
  const activeFiltersCount =
    (activeCategory ? 1 : 0) +
    activeBrands.length +
    (priceMin || priceMax ? 1 : 0) +
    (saleOnly ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    activeCpus.length +
    activeRams.length +
    activeStorages.length +
    activeGpus.length +
    activeScreens.length;

  const handleResetFilters = () => {
    setActiveCategory(null);
    setActiveBrands([]);
    setPriceMin("");
    setPriceMax("");
    setSaleOnly(false);
    setInStockOnly(false);
    setActiveCpus([]);
    setActiveRams([]);
    setActiveStorages([]);
    setActiveGpus([]);
    setActiveScreens([]);
    setSortBy("default");
    setPage(0);
  };

  const toggleArrayFilter = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
    setPage(0);
  };

  const toggleBrandFilter = (item: string) => {
    setActiveBrands((prev) => {
      const itemLow = item.toLowerCase();
      const existing = prev.find((b) => {
        const bLow = b.toLowerCase();
        return (
          bLow === itemLow ||
          bLow.startsWith(itemLow + " ") ||
          itemLow.startsWith(bLow + " ")
        );
      });
      if (existing) {
        return prev.filter((b) => b !== existing);
      }
      return [...prev, item];
    });
    setPage(0);
  };

  // Reusable Filter Sidebar Content
  const filterSidebarContent = (
    <div className="flex flex-col gap-1 text-sm text-neutral-800">
      {/* Category List */}
      <div className="pb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
          Danh mục sản phẩm
        </h3>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveCategory(null);
              setPage(0);
            }}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${!activeCategory
              ? "bg-shop_dark_green text-white shadow-xs"
              : "text-neutral-700 hover:bg-neutral-100"
              }`}
          >
            <span>Tất cả thiết bị</span>
            <span className="text-[10px] opacity-75 font-medium">
              {!activeCategory ? sortedFilteredProducts.length : initialProducts.length}
            </span>
          </button>
          {categories.map((c) => {
            const isSelected = activeCategory === c.slug;
            const count = isSelected
              ? sortedFilteredProducts.length
              : (categoryCounts[c.slug] ?? 0);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveCategory(c.slug);
                  setPage(0);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${isSelected
                  ? "bg-shop_dark_green text-white shadow-xs"
                  : "text-neutral-700 hover:bg-neutral-100"
                  }`}
              >
                <span>{c.title}</span>
                <span className="text-[10px] opacity-75 font-medium">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Status Toggles (Sale, Stock) */}
      <section className="border-t border-neutral-200 py-3.5 space-y-2.5">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-semibold text-neutral-800">
          <span className="flex items-center gap-1.5 text-orange-600">
            <Flame className="w-3.5 h-3.5 fill-orange-500" />
            <span>Chỉ xem đang giảm giá</span>
          </span>
          <input
            type="checkbox"
            checked={saleOnly}
            onChange={(e) => {
              setSaleOnly(e.target.checked);
              setPage(0);
            }}
            className="w-4 h-4 rounded text-shop_dark_green focus:ring-shop_dark_green border-neutral-300"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-semibold text-neutral-800">
          <span className="flex items-center gap-1.5 text-emerald-600">
            <Check className="w-3.5 h-3.5" />
            <span>Chỉ xem còn hàng</span>
          </span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => {
              setInStockOnly(e.target.checked);
              setPage(0);
            }}
            className="w-4 h-4 rounded text-shop_dark_green focus:ring-shop_dark_green border-neutral-300"
          />
        </label>
      </section>

      {/* Price Range Filter */}
      <AccordionSection
        title="Khoảng giá"
        open={openSections.price}
        onToggle={() => toggleSection("price")}
        badgeCount={priceMin || priceMax ? 1 : 0}
      >
        <div className="space-y-2">
          {/* Preset Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "< 10 triệu", min: "", max: "10000000" },
              { label: "10 - 15 triệu", min: "10000000", max: "15000000" },
              { label: "15 - 20 triệu", min: "15000000", max: "20000000" },
              { label: "20 - 30 triệu", min: "20000000", max: "30000000" },
              { label: "> 30 triệu", min: "30000000", max: "" },
            ].map((p, idx) => {
              const isSelected = priceMin === p.min && priceMax === p.max;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setPriceMin("");
                      setPriceMax("");
                    } else {
                      setPriceMin(p.min);
                      setPriceMax(p.max);
                    }
                    setPage(0);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${isSelected
                    ? "border-shop_dark_green bg-emerald-50 text-shop_dark_green"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                    }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              inputMode="numeric"
              value={priceMin}
              onChange={(e) => {
                setPriceMin(e.target.value.replace(/\D/g, ""));
                setPage(0);
              }}
              placeholder="Từ (đ)"
              className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-shop_dark_green"
            />
            <span className="text-neutral-400">–</span>
            <input
              type="text"
              inputMode="numeric"
              value={priceMax}
              onChange={(e) => {
                setPriceMax(e.target.value.replace(/\D/g, ""));
                setPage(0);
              }}
              placeholder="Đến (đ)"
              className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-shop_dark_green"
            />
          </div>
        </div>
      </AccordionSection>

      {/* Brand Filter */}
      <AccordionSection
        title="Thương hiệu"
        open={openSections.brand}
        onToggle={() => toggleSection("brand")}
        badgeCount={activeBrands.length}
      >
        <div className="space-y-2">
          {brandOptions.length > 6 && (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Tìm hãng..."
                className="w-full rounded-lg border border-neutral-200 py-1.5 pl-8 pr-2 text-xs text-neutral-900 focus:outline-none focus:border-shop_dark_green"
              />
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {visibleBrandOptions.map((brand) => {
              const isChecked = activeBrands.some((b) => {
                const bLow = b.toLowerCase();
                return (
                  bLow === brand.key ||
                  brand.key.startsWith(bLow + " ") ||
                  bLow.startsWith(brand.key + " ")
                );
              });
              return (
                <label
                  key={brand.key}
                  className="flex items-center justify-between text-xs text-neutral-700 hover:text-neutral-900 cursor-pointer select-none py-0.5"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleBrandFilter(brand.label)}
                      className="w-3.5 h-3.5 rounded text-shop_dark_green focus:ring-shop_dark_green border-neutral-300"
                    />
                    <span>{brand.label}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium">({brand.count})</span>
                </label>
              );
            })}
          </div>
        </div>
      </AccordionSection>

      {/* CPU Filter (extracted from DB) */}
      {cpuOptions.length > 0 && (
        <AccordionSection
          title="Vi xử lý (CPU)"
          open={openSections.cpu}
          onToggle={() => toggleSection("cpu")}
          badgeCount={activeCpus.length}
        >
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {cpuOptions.map((cpu) => {
              const isChecked = activeCpus.includes(cpu.label);
              return (
                <label
                  key={cpu.label}
                  className="flex items-center justify-between text-xs text-neutral-700 hover:text-neutral-900 cursor-pointer select-none py-0.5"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayFilter(setActiveCpus, cpu.label)}
                      className="w-3.5 h-3.5 rounded text-shop_dark_green focus:ring-shop_dark_green border-neutral-300"
                    />
                    <span>{cpu.label}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium">({cpu.count})</span>
                </label>
              );
            })}
          </div>
        </AccordionSection>
      )}

      {/* RAM Filter (extracted from DB) */}
      {ramOptions.length > 0 && (
        <AccordionSection
          title="Dung lượng RAM"
          open={openSections.ram}
          onToggle={() => toggleSection("ram")}
          badgeCount={activeRams.length}
        >
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {ramOptions.map((ram) => {
              const isChecked = activeRams.includes(ram.label);
              return (
                <label
                  key={ram.label}
                  className="flex items-center justify-between text-xs text-neutral-700 hover:text-neutral-900 cursor-pointer select-none py-0.5"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayFilter(setActiveRams, ram.label)}
                      className="w-3.5 h-3.5 rounded text-shop_dark_green focus:ring-shop_dark_green border-neutral-300"
                    />
                    <span>{ram.label}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium">({ram.count})</span>
                </label>
              );
            })}
          </div>
        </AccordionSection>
      )}

      {/* Storage Filter (extracted from DB) */}
      {storageOptions.length > 0 && (
        <AccordionSection
          title="Ổ cứng / Bộ nhớ"
          open={openSections.storage}
          onToggle={() => toggleSection("storage")}
          badgeCount={activeStorages.length}
        >
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {storageOptions.map((st) => {
              const isChecked = activeStorages.includes(st.label);
              return (
                <label
                  key={st.label}
                  className="flex items-center justify-between text-xs text-neutral-700 hover:text-neutral-900 cursor-pointer select-none py-0.5"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayFilter(setActiveStorages, st.label)}
                      className="w-3.5 h-3.5 rounded text-shop_dark_green focus:ring-shop_dark_green border-neutral-300"
                    />
                    <span>{st.label}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium">({st.count})</span>
                </label>
              );
            })}
          </div>
        </AccordionSection>
      )}

      {/* GPU Filter (extracted from DB) */}
      {gpuOptions.length > 0 && (
        <AccordionSection
          title="Card đồ họa (VGA)"
          open={openSections.gpu}
          onToggle={() => toggleSection("gpu")}
          badgeCount={activeGpus.length}
        >
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {gpuOptions.map((gpu) => {
              const isChecked = activeGpus.includes(gpu.label);
              return (
                <label
                  key={gpu.label}
                  className="flex items-center justify-between text-xs text-neutral-700 hover:text-neutral-900 cursor-pointer select-none py-0.5"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayFilter(setActiveGpus, gpu.label)}
                      className="w-3.5 h-3.5 rounded text-shop_dark_green focus:ring-shop_dark_green border-neutral-300"
                    />
                    <span>{gpu.label}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium">({gpu.count})</span>
                </label>
              );
            })}
          </div>
        </AccordionSection>
      )}

      {/* Screen Filter (extracted from DB) */}
      {screenOptions.length > 0 && (
        <AccordionSection
          title="Màn hình"
          open={openSections.screen}
          onToggle={() => toggleSection("screen")}
          badgeCount={activeScreens.length}
        >
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {screenOptions.map((screen) => {
              const isChecked = activeScreens.includes(screen.label);
              return (
                <label
                  key={screen.label}
                  className="flex items-center justify-between text-xs text-neutral-700 hover:text-neutral-900 cursor-pointer select-none py-0.5"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayFilter(setActiveScreens, screen.label)}
                      className="w-3.5 h-3.5 rounded text-shop_dark_green focus:ring-shop_dark_green border-neutral-300"
                    />
                    <span>{screen.label}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-medium">({screen.count})</span>
                </label>
              );
            })}
          </div>
        </AccordionSection>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-sans">
      {/* Top Banner / Heading */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <Link href="/" className="hover:text-shop_dark_green transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-shop_dark_green font-bold">
              {activeCategoryTitle || "Tất cả sản phẩm"}
            </span>
          </div>
        </div>

        {/* View mode & Sort toolbar */}
        <div className="flex items-center gap-3">
          {/* Mobile Filter Drawer trigger */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold"
          >
            <SlidersHorizontal className="w-4 h-4 text-shop_dark_green" />
            <span>Bộ lọc {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
          </button>

          {/* Sort Selector */}
          <div className="relative flex items-center">
            <div className="relative flex items-center bg-neutral-100/80 rounded-xl border border-neutral-200/80 px-2.5 py-1.5 text-xs font-semibold">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 mr-1.5" />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortValue);
                  setPage(0);
                }}
                className="bg-transparent text-neutral-800 font-bold focus:outline-none cursor-pointer pr-4"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Left Sidebar (Filters) + Right Content (Products) */}
      <div className="flex gap-8 items-start">
        {/* Desktop Sidebar (Left) - Cố định tại 1 vị trí ban đầu, không cuộn theo page */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-shop_dark_green" />
                <span>Bộ lọc nâng cao</span>
              </span>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  Xoá tất cả
                </button>
              )}
            </div>

            {filterSidebarContent}
          </div>
        </aside>

        {/* Products Column (Right) */}
        <main className="flex-1 min-w-0">
          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 p-3 bg-neutral-50/80 rounded-2xl border border-neutral-200/60">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mr-1">
                Đang lọc ({activeFiltersCount}):
              </span>

              {activeCategoryTitle && (
                <FilterTag
                  label={`Danh mục: ${activeCategoryTitle}`}
                  onRemove={() => setActiveCategory(null)}
                />
              )}

              {saleOnly && (
                <FilterTag label="Đang giảm giá" onRemove={() => setSaleOnly(false)} />
              )}

              {inStockOnly && (
                <FilterTag label="Còn hàng" onRemove={() => setInStockOnly(false)} />
              )}

              {(priceMin || priceMax) && (
                <FilterTag
                  label={`Giá: ${priceMin ? formatShortVND(Number(priceMin)) : "0"} - ${priceMax ? formatShortVND(Number(priceMax)) : "Không giới hạn"
                    }`}
                  onRemove={() => {
                    setPriceMin("");
                    setPriceMax("");
                  }}
                />
              )}

              {activeBrands.map((b) => (
                <FilterTag
                  key={`brand-${b}`}
                  label={`Hãng: ${b}`}
                  onRemove={() =>
                    setActiveBrands((prev) => prev.filter((x) => x !== b))
                  }
                />
              ))}

              {activeCpus.map((cpu) => (
                <FilterTag
                  key={`cpu-${cpu}`}
                  label={`CPU: ${cpu}`}
                  onRemove={() =>
                    setActiveCpus((prev) => prev.filter((x) => x !== cpu))
                  }
                />
              ))}

              {activeRams.map((ram) => (
                <FilterTag
                  key={`ram-${ram}`}
                  label={`RAM: ${ram}`}
                  onRemove={() =>
                    setActiveRams((prev) => prev.filter((x) => x !== ram))
                  }
                />
              ))}

              {activeStorages.map((st) => (
                <FilterTag
                  key={`st-${st}`}
                  label={`Ổ cứng: ${st}`}
                  onRemove={() =>
                    setActiveStorages((prev) => prev.filter((x) => x !== st))
                  }
                />
              ))}

              {activeGpus.map((gpu) => (
                <FilterTag
                  key={`gpu-${gpu}`}
                  label={`GPU: ${gpu}`}
                  onRemove={() =>
                    setActiveGpus((prev) => prev.filter((x) => x !== gpu))
                  }
                />
              ))}

              {activeScreens.map((screen) => (
                <FilterTag
                  key={`screen-${screen}`}
                  label={`Màn hình: ${screen}`}
                  onRemove={() =>
                    setActiveScreens((prev) => prev.filter((x) => x !== screen))
                  }
                />
              ))}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-red-500 hover:text-red-700 ml-2 underline cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>
          )}

          {/* Product Listing */}
          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl bg-neutral-100 animate-pulse border border-neutral-200"
                />
              ))}
            </div>
          ) : paginatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-neutral-50 rounded-3xl border border-neutral-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-shop_dark_green flex items-center justify-center mb-3">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-800">
                Không tìm thấy sản phẩm phù hợp
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mt-1 mb-4">
                Hãy thử điều chỉnh lại mức giá, bỏ chọn một số bộ lọc CPU/RAM hoặc xóa bớt tiêu chí tìm kiếm.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-shop_dark_green text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-800 transition-colors shadow-xs"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
              <span>
                Trang {page + 1}/{totalPages} — {totalElements} sản phẩm
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0}
                  aria-label="Trang trước"
                  className="p-1.5 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {pageNumbers[0] > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePageChange(0)}
                      className="min-w-[28px] h-7 px-1 border border-neutral-200 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                      1
                    </button>
                    <span className="px-1 text-xs text-neutral-400">…</span>
                  </>
                )}

                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePageChange(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={`min-w-[28px] h-7 px-1 border text-xs transition-colors ${p === page
                      ? "bg-shop_dark_green text-white border-shop_dark_green font-bold"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      }`}
                  >
                    {p + 1}
                  </button>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <>
                    <span className="px-1 text-xs text-neutral-400">…</span>
                    <button
                      type="button"
                      onClick={() => handlePageChange(totalPages - 1)}
                      className="min-w-[28px] h-7 px-1 border border-neutral-200 text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages - 1}
                  aria-label="Trang sau"
                  className="p-1.5 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filter Drawer Modal */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-4/5 max-w-sm h-full bg-white p-5 overflow-y-auto flex flex-col justify-between shadow-2xl animate-in slide-in-from-left">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-3">
                <span className="text-sm font-bold text-neutral-900 uppercase">
                  Bộ lọc sản phẩm
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {filterSidebarContent}
            </div>

            <div className="pt-4 border-t border-neutral-200 mt-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full py-3 rounded-xl bg-shop_dark_green text-white text-xs font-bold uppercase tracking-wider"
              >
                Xem {sortedFilteredProducts.length} kết quả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;