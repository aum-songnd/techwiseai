"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Laptop,
  Smartphone,
  Headphones,
  Camera,
  Cpu,
  Keyboard,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Flame,
  Layers,
} from "lucide-react";
import { getAllProductsByCategory, getCategories } from "@/lib/api";

export interface MegaMenuItem {
  id: string;
  slug: string;
  title: string;
  totalCount: number;
  icon: React.ReactNode;
  brands: { name: string; count: number; href: string }[];
  highlights: { name: string; href: string; tag?: string }[];
  priceRanges: { name: string; href: string }[];
  featuredPromo?: {
    id: string;
    title: string;
    subtitle: string;
    price: number;
    originalPrice?: number;
    tag: string;
    href: string;
    image: string;
  };
}

const getCategoryIcon = (slug: string) => {
  switch (slug) {
    case "laptop":
      return <Laptop className="w-4 h-4 text-emerald-600" />;
    case "dien-thoai":
      return <Smartphone className="w-4 h-4 text-emerald-600" />;
    case "tai-nghe":
      return <Headphones className="w-4 h-4 text-emerald-600" />;
    case "may-anh":
      return <Camera className="w-4 h-4 text-emerald-600" />;
    case "linh-kien":
      return <Cpu className="w-4 h-4 text-emerald-600" />;
    case "phu-kien":
      return <Keyboard className="w-4 h-4 text-emerald-600" />;
    default:
      return <Layers className="w-4 h-4 text-emerald-600" />;
  }
};

const formatPriceVND = (price: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

// Real DB Data Structure
const INITIAL_MEGA_MENU_DATA: MegaMenuItem[] = [
  {
    id: "877b8ab0-52db-4479-863a-d2a3ad371fb5",
    slug: "laptop",
    title: "Laptop",
    totalCount: 399,
    icon: <Laptop className="w-4 h-4 text-emerald-600" />,
    brands: [
      { name: "ASUS", count: 80, href: "/shop?category=laptop&brand=ASUS" },
      { name: "Lenovo", count: 73, href: "/shop?category=laptop&brand=Lenovo" },
      { name: "Acer", count: 62, href: "/shop?category=laptop&brand=Acer" },
      { name: "HP", count: 55, href: "/shop?category=laptop&brand=HP" },
      { name: "Dell", count: 46, href: "/shop?category=laptop&brand=Dell" },
      { name: "MSI", count: 42, href: "/shop?category=laptop&brand=MSI" },
      { name: "Apple", count: 30, href: "/shop?category=laptop&brand=Apple" },
      { name: "Gigabyte", count: 9, href: "/shop?category=laptop&brand=Gigabyte" },
    ],
    highlights: [
      { name: "Intel Core Ultra (AI)", href: "/shop?category=laptop&cpu=Intel+Core+Ultra", tag: "Mới 2026" },
      { name: "Intel Core i7", href: "/shop?category=laptop&cpu=Intel+Core+i7" },
      { name: "Intel Core i5", href: "/shop?category=laptop&cpu=Intel+Core+i5" },
      { name: "AMD Ryzen 7", href: "/shop?category=laptop&cpu=AMD+Ryzen+7" },
      { name: "Apple M-Series (MacBook)", href: "/shop?category=laptop&cpu=Apple+M-Series" },
      { name: "Card đồ họa RTX 50 Series", href: "/shop?category=laptop&gpu=NVIDIA+RTX+50+Series", tag: "Hot" },
      { name: "RAM 16GB / 32GB", href: "/shop?category=laptop&ram=16GB" },
      { name: "Ổ cứng SSD 512GB / 1TB", href: "/shop?category=laptop&storage=512GB" },
    ],
    priceRanges: [
      { name: "< 15 triệu", href: "/shop?category=laptop&maxPrice=15000000" },
      { name: "15 - 20 triệu", href: "/shop?category=laptop&minPrice=15000000&maxPrice=20000000" },
      { name: "20 - 30 triệu", href: "/shop?category=laptop&minPrice=20000000&maxPrice=30000000" },
      { name: "> 30 triệu", href: "/shop?category=laptop&minPrice=30000000" },
    ],
    featuredPromo: {
      id: "0c28966f-607b-416a-9a17-c8317a218812",
      title: "Laptop MSI Raider 16 Max HX",
      subtitle: "Hiệu năng Gaming đỉnh chóp, RTX cực mạnh",
      price: 127990000,
      originalPrice: 147190000,
      tag: "Siêu phẩm Gaming",
      href: "/product/0c28966f-607b-416a-9a17-c8317a218812",
      image: "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:0/q:100/plain/https://cellphones.com.vn/media/wysiwyg/laptop/MSI/Raider/laptop-msi-raider-16-max-hx-b2wi-095vn-1.jpg",
    },
  },
  {
    id: "c431189c-a61a-46a5-b074-9c86f7969a97",
    slug: "dien-thoai",
    title: "Điện thoại",
    totalCount: 49,
    icon: <Smartphone className="w-4 h-4 text-emerald-600" />,
    brands: [
      { name: "Apple (iPhone)", count: 16, href: "/shop?category=dien-thoai&brand=Apple" },
      { name: "Samsung Galaxy", count: 9, href: "/shop?category=dien-thoai&brand=Samsung" },
      { name: "OPPO", count: 8, href: "/shop?category=dien-thoai&brand=OPPO" },
      { name: "Xiaomi", count: 6, href: "/shop?category=dien-thoai&brand=Xiaomi" },
      { name: "Meizu", count: 4, href: "/shop?category=dien-thoai&brand=Meizu" },
      { name: "HONOR", count: 3, href: "/shop?category=dien-thoai&brand=HONOR" },
    ],
    highlights: [
      { name: "Chip Apple A-Series", href: "/shop?category=dien-thoai&cpu=Apple+A-Series", tag: "Apple" },
      { name: "Snapdragon 8 Series", href: "/shop?category=dien-thoai&cpu=Snapdragon+8+Series", tag: "Flagship" },
      { name: "MediaTek Dimensity", href: "/shop?category=dien-thoai&cpu=MediaTek+Dimensity" },
      { name: "Bộ nhớ trong 128GB", href: "/shop?category=dien-thoai&storage=128GB" },
      { name: "Bộ nhớ trong 256GB", href: "/shop?category=dien-thoai&storage=256GB" },
      { name: "Bộ nhớ trong 512GB", href: "/shop?category=dien-thoai&storage=512GB" },
      { name: "RAM 8GB / 12GB", href: "/shop?category=dien-thoai&ram=8GB" },
    ],
    priceRanges: [
      { name: "< 5 triệu", href: "/shop?category=dien-thoai&maxPrice=5000000" },
      { name: "5 - 10 triệu", href: "/shop?category=dien-thoai&minPrice=5000000&maxPrice=10000000" },
      { name: "10 - 20 triệu", href: "/shop?category=dien-thoai&minPrice=10000000&maxPrice=20000000" },
      { name: "> 20 triệu", href: "/shop?category=dien-thoai&minPrice=20000000" },
    ],
    featuredPromo: {
      id: "537baa69-15d5-470e-ae13-4c1dc522ad01",
      title: "iPhone 18 Pro Max 2TB",
      subtitle: "Titanium đẳng cấp, dung lượng cực khủng",
      price: 80990000,
      tag: "Flagship đỉnh cao",
      href: "/product/537baa69-15d5-470e-ae13-4c1dc522ad01",
      image: "https://cdn2.cellphones.com.vn/200x/media/catalog/product/i/p/iphone-18-pro-01_2_1_1_1.jpg",
    },
  },
  {
    id: "d8ca17e9-8cc8-4b55-a1c5-d17c53a1c61f",
    slug: "tai-nghe",
    title: "Tai nghe",
    totalCount: 37,
    icon: <Headphones className="w-4 h-4 text-emerald-600" />,
    brands: [
      { name: "Anker", count: 7, href: "/shop?category=tai-nghe&brand=Anker" },
      { name: "Samsung", count: 6, href: "/shop?category=tai-nghe&brand=Samsung" },
      { name: "Sony", count: 5, href: "/shop?category=tai-nghe&brand=Sony" },
      { name: "JBL", count: 4, href: "/shop?category=tai-nghe&brand=JBL" },
      { name: "Apple", count: 3, href: "/shop?category=tai-nghe&brand=Apple" },
      { name: "Bose", count: 3, href: "/shop?category=tai-nghe&brand=Bose" },
      { name: "Xiaomi", count: 3, href: "/shop?category=tai-nghe&brand=Xiaomi" },
    ],
    highlights: [
      { name: "Tai nghe Apple AirPods", href: "/shop?category=tai-nghe&brand=Apple", tag: "Apple" },
      { name: "Sony Hi-Res Audio", href: "/shop?category=tai-nghe&brand=Sony" },
      { name: "Samsung Galaxy Buds", href: "/shop?category=tai-nghe&brand=Samsung" },
      { name: "Bose Âm thanh cao cấp", href: "/shop?category=tai-nghe&brand=Bose" },
      { name: "JBL Âm trầm mạnh mẽ", href: "/shop?category=tai-nghe&brand=JBL" },
      { name: "Anker Soundcore Giá tốt", href: "/shop?category=tai-nghe&brand=Anker" },
    ],
    priceRanges: [
      { name: "< 1 triệu", href: "/shop?category=tai-nghe&maxPrice=1000000" },
      { name: "1 - 3 triệu", href: "/shop?category=tai-nghe&minPrice=1000000&maxPrice=3000000" },
      { name: "3 - 5 triệu", href: "/shop?category=tai-nghe&minPrice=3000000&maxPrice=5000000" },
      { name: "> 5 triệu", href: "/shop?category=tai-nghe&minPrice=5000000" },
    ],
    featuredPromo: {
      id: "9bd9b913-f618-496b-90ac-a2219babbc23",
      title: "Bose QuietComfort Ultra Gen 2",
      subtitle: "Chống ồn thông minh, âm trường đắm chìm",
      price: 9900000,
      tag: "Chống ồn cao cấp",
      href: "/product/9bd9b913-f618-496b-90ac-a2219babbc23",
      image: "https://cdn2.cellphones.com.vn/200x/media/catalog/product/t/a/tai-nghe-chup-tai-bose-quietcomfort-ultra-gen-2_21_.png",
    },
  },
  {
    id: "214e23ca-0395-4bfb-937a-052037e58163",
    slug: "may-anh",
    title: "Máy ảnh",
    totalCount: 32,
    icon: <Camera className="w-4 h-4 text-emerald-600" />,
    brands: [
      { name: "Sony", count: 16, href: "/shop?category=may-anh&brand=Sony" },
      { name: "Fujifilm", count: 6, href: "/shop?category=may-anh&brand=Fujifilm" },
      { name: "Canon", count: 6, href: "/shop?category=may-anh&brand=Canon" },
      { name: "Ulanzi", count: 2, href: "/shop?category=may-anh&brand=Ulanzi" },
    ],
    highlights: [
      { name: "Sony Alpha Mirrorless", href: "/shop?category=may-anh&brand=Sony", tag: "Chuyên nghiệp" },
      { name: "Canon EOS Series", href: "/shop?category=may-anh&brand=Canon" },
      { name: "Fujifilm X-Series", href: "/shop?category=may-anh&brand=Fujifilm", tag: "Màu phim" },
      { name: "Thiết bị quay Ulanzi", href: "/shop?category=may-anh&brand=Ulanzi" },
    ],
    priceRanges: [
      { name: "< 10 triệu", href: "/shop?category=may-anh&maxPrice=10000000" },
      { name: "10 - 25 triệu", href: "/shop?category=may-anh&minPrice=10000000&maxPrice=25000000" },
      { name: "> 25 triệu", href: "/shop?category=may-anh&minPrice=25000000" },
    ],
    featuredPromo: {
      id: "18ac348a-4397-4e08-9bca-c77b2c722f8f",
      title: "Máy ảnh Canon EOS R6 Mark III",
      subtitle: "Cảm biến Full-frame, quay phim 4K 120fps",
      price: 60500000,
      originalPrice: 75630000,
      tag: "Nhiếp ảnh gia",
      href: "/product/18ac348a-4397-4e08-9bca-c77b2c722f8f",
      image: "https://cdn2.cellphones.com.vn/200x/media/catalog/product/m/_/m_y_nh_9_62.png",
    },
  },
  {
    id: "e3758c55-0fcd-4449-ad5c-1132dffb5f4e",
    slug: "linh-kien",
    title: "Linh kiện",
    totalCount: 25,
    icon: <Cpu className="w-4 h-4 text-emerald-600" />,
    brands: [
      { name: "Kingston", count: 10, href: "/shop?category=linh-kien&brand=Kingston" },
      { name: "Transcend", count: 6, href: "/shop?category=linh-kien&brand=Transcend" },
      { name: "Sandisk", count: 2, href: "/shop?category=linh-kien&brand=Sandisk" },
      { name: "ASUS", count: 1, href: "/shop?category=linh-kien&brand=ASUS" },
      { name: "MSI", count: 1, href: "/shop?category=linh-kien&brand=MSI" },
      { name: "Intel", count: 1, href: "/shop?category=linh-kien&brand=Intel" },
    ],
    highlights: [
      { name: "Ổ cứng SSD NVMe Kingston", href: "/shop?category=linh-kien&brand=Kingston", tag: "Bán chạy" },
      { name: "SSD & Thẻ nhớ Transcend", href: "/shop?category=linh-kien&brand=Transcend" },
      { name: "Card đồ họa VGA ASUS", href: "/shop?category=linh-kien&brand=ASUS" },
      { name: "Linh kiện MSI Gaming", href: "/shop?category=linh-kien&brand=MSI" },
      { name: "Vi xử lý Intel", href: "/shop?category=linh-kien&brand=Intel" },
    ],
    priceRanges: [
      { name: "< 1 triệu", href: "/shop?category=linh-kien&maxPrice=1000000" },
      { name: "1 - 3 triệu", href: "/shop?category=linh-kien&minPrice=1000000&maxPrice=3000000" },
      { name: "> 3 triệu", href: "/shop?category=linh-kien&minPrice=3000000" },
    ],
    featuredPromo: {
      id: "ec785752-2bc7-419c-a1a5-df8c95fa7086",
      title: "VGA ASUS Dual RTX 3060 12GB",
      subtitle: "Chiến game mượt mà, tản nhiệt kép yên tĩnh",
      price: 12990000,
      tag: "VGA Đồ họa",
      href: "/product/ec785752-2bc7-419c-a1a5-df8c95fa7086",
      image: "https://cdn2.cellphones.com.vn/200x/media/catalog/product/v/g/vga-asus-dual-geforce-rtx-3060-oc-12gb-dual-rtx3060_1_.png",
    },
  },
  {
    id: "89b38ddf-bcd5-45b6-9b23-068ef9f681c6",
    slug: "phu-kien",
    title: "Phụ kiện",
    totalCount: 40,
    icon: <Keyboard className="w-4 h-4 text-emerald-600" />,
    brands: [
      { name: "Anker", count: 9, href: "/shop?category=phu-kien&brand=Anker" },
      { name: "Baseus", count: 4, href: "/shop?category=phu-kien&brand=Baseus" },
      { name: "Cuktech", count: 4, href: "/shop?category=phu-kien&brand=Cuktech" },
      { name: "StarGO", count: 4, href: "/shop?category=phu-kien&brand=StarGO" },
      { name: "Mophie", count: 3, href: "/shop?category=phu-kien&brand=Mophie" },
      { name: "Belkin", count: 3, href: "/shop?category=phu-kien&brand=Belkin" },
      { name: "Aukey", count: 3, href: "/shop?category=phu-kien&brand=Aukey" },
      { name: "Ugreen", count: 3, href: "/shop?category=phu-kien&brand=Ugreen" },
    ],
    highlights: [
      { name: "Sạc nhanh Anker GaN", href: "/shop?category=phu-kien&brand=Anker", tag: "Phổ biến" },
      { name: "Phụ kiện cao cấp Belkin", href: "/shop?category=phu-kien&brand=Belkin" },
      { name: "Cáp sạc & Hub Baseus", href: "/shop?category=phu-kien&brand=Baseus" },
      { name: "Củ sạc Cuktech 55W - 120W", href: "/shop?category=phu-kien&brand=Cuktech" },
      { name: "Pin dự phòng Mophie Magsafe", href: "/shop?category=phu-kien&brand=Mophie" },
      { name: "Cáp & Củ sạc Ugreen", href: "/shop?category=phu-kien&brand=Ugreen" },
    ],
    priceRanges: [
      { name: "< 500 nghìn", href: "/shop?category=phu-kien&maxPrice=500000" },
      { name: "500k - 1 triệu", href: "/shop?category=phu-kien&minPrice=500000&maxPrice=1000000" },
      { name: "> 1 triệu", href: "/shop?category=phu-kien&minPrice=1000000" },
    ],
    featuredPromo: {
      id: "76a14a7d-d51a-4606-841a-351b8bbe5890",
      title: "Pin sạc Anker Maggo 2 Pro 25W",
      subtitle: "Chuẩn Qi2 từ tính, sạc nhanh công suất cao",
      price: 2850000,
      tag: "Chuẩn Qi2",
      href: "/product/76a14a7d-d51a-4606-841a-351b8bbe5890",
      image: "https://cdn2.cellphones.com.vn/200x/media/catalog/product/p/i/pin-sac-du-phong-khong-day-anker-maggo-2-pro-a110r-10000mah-qi2-25w-type-c-pd-45w_11_.png",
    },
  },
];

const MegaMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MegaMenuItem[]>(INITIAL_MEGA_MENU_DATA);
  const [activeCategory, setActiveCategory] = useState<MegaMenuItem>(INITIAL_MEGA_MENU_DATA[0]);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with live DB categories and products
  useEffect(() => {
    let ignore = false;
    async function loadDbData() {
      try {
        const [categories, products] = await Promise.all([
          getCategories().catch(() => []),
          getAllProductsByCategory(undefined, false).catch(() => []),
        ]);

        if (ignore || !categories || categories.length === 0) return;

        const dynamicItems = categories.map((cat) => {
          const prods = products.filter(
            (p) =>
              p.categoryId === cat.id ||
              p.categories?.some(
                (cName) => cName.toLowerCase() === cat.title.toLowerCase()
              )
          );

          // Extract brands with actual count from DB, grouping canonical brand names
          const brandCounts = new Map<string, number>();
          for (const p of prods) {
            let b = p.brand?.trim();
            if (!b) continue;
            if (/^apple\b/i.test(b)) b = "Apple";
            else if (/^samsung\b/i.test(b)) b = "Samsung";
            brandCounts.set(b, (brandCounts.get(b) || 0) + 1);
          }
          const sortedBrands = Array.from(brandCounts.entries())
            .map(([name, count]) => ({
              name,
              count,
              href: `/shop?category=${cat.slug}&brand=${encodeURIComponent(name)}`,
            }))
            .sort((a, b) => b.count - a.count);

          // Find existing template highlights & price ranges
          const template = INITIAL_MEGA_MENU_DATA.find((m) => m.slug === cat.slug);

          // Top product for promo
          const topProduct =
            prods
              .filter((p) => p.thumbnailUrl && p.thumbnailUrl.startsWith("http"))
              .sort((a, b) => (b.price || 0) - (a.price || 0))[0] || prods[0];

          return {
            id: cat.id,
            slug: cat.slug,
            title: cat.title,
            totalCount: prods.length,
            icon: getCategoryIcon(cat.slug),
            brands: sortedBrands.length > 0 ? sortedBrands.slice(0, 8) : template?.brands || [],
            highlights: template?.highlights || [
              { name: `Toàn bộ ${cat.title}`, href: `/shop?category=${cat.slug}` },
            ],
            priceRanges: template?.priceRanges || [
              { name: "Dưới 1 triệu", href: `/shop?category=${cat.slug}&maxPrice=1000000` },
              { name: "1 - 5 triệu", href: `/shop?category=${cat.slug}&minPrice=1000000&maxPrice=5000000` },
              { name: "Trên 5 triệu", href: `/shop?category=${cat.slug}&minPrice=5000000` },
            ],
            featuredPromo: topProduct
              ? {
                id: topProduct.id,
                title: topProduct.name,
                subtitle: `${topProduct.brand || cat.title} chính hãng`,
                price: topProduct.finalPrice || topProduct.price,
                originalPrice: topProduct.originalPrice || topProduct.price,
                tag: topProduct.discount ? "Đang giảm giá" : "Nổi bật",
                href: `/product/${topProduct.id}`,
                image: topProduct.thumbnailUrl || template?.featuredPromo?.image || "",
              }
              : template?.featuredPromo,
          } as MegaMenuItem;
        });

        if (dynamicItems.length > 0) {
          setMenuItems(dynamicItems);
          setActiveCategory((prev) => {
            const match = dynamicItems.find((d) => d.slug === prev.slug);
            return match || dynamicItems[0];
          });
        }
      } catch {
        // Fallback to INITIAL_MEGA_MENU_DATA
      }
    }

    loadDbData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Mega Menu Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-neutral-800  transition-all cursor-pointer border border-neutral-200/80 shadow-2xs"
      >
        <span className="flex flex-col gap-0.5">
          <span className="w-3.5 h-0.5 bg-current rounded-full" />
          <span className="w-2.5 h-0.5 bg-current rounded-full" />
          <span className="w-3.5 h-0.5 bg-current rounded-full" />
        </span>
        <span className="hidden sm:inline">Danh mục</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-shop_dark_green" : "text-neutral-500"
            }`}
        />
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[820px] lg:w-[980px] bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="flex min-h-[440px]">
            {/* Left Sidebar: Categories List from DB */}
            <div className="w-60 bg-neutral-50/90 border-r border-neutral-200/80 p-2.5 flex flex-col gap-1 shrink-0">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Nhóm sản phẩm
              </div>
              {menuItems.map((item) => {
                const isActive = activeCategory.slug === item.slug;
                return (
                  <Link
                    key={item.id}
                    href={`/shop?category=${item.slug}`}
                    onMouseEnter={() => setActiveCategory(item)}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer group ${isActive
                      ? "bg-white text-shop_dark_green shadow-xs border border-neutral-200/60 font-bold"
                      : "text-neutral-700 hover:bg-neutral-100/80 hover:text-neutral-900"
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? "text-shop_dark_green" : "text-neutral-500"}>
                        {item.icon}
                      </span>
                      <span>{item.title}</span>
                    </div>
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition-transform ${isActive
                        ? "text-shop_dark_green translate-x-0.5 opacity-100"
                        : "text-neutral-300 opacity-0 group-hover:opacity-70 group-hover:translate-x-0.5"
                        }`}
                    />
                  </Link>
                );
              })}
            </div>

            {/* Right Pane: Submenu Content from DB */}
            <div className="flex-1 p-6 grid grid-cols-3 gap-6 bg-white">
              {/* Col 1: Brands & Price Ranges */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>Thương hiệu chính hãng</span>
                </h4>
                <ul className="space-y-1.5">
                  {activeCategory.brands.map((b) => (
                    <li key={b.name}>
                      <Link
                        href={b.href}
                        onClick={() => setIsOpen(false)}
                        className="text-xs text-neutral-700 hover:text-shop_dark_green transition-colors flex items-center justify-between group py-0.5"
                      >
                        <span className="font-medium group-hover:font-semibold">{b.name}</span>
                        <ArrowRight className="w-3 h-3 text-neutral-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Price Brackets */}
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mt-5 mb-2.5">
                  Khoảng giá phổ biến
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeCategory.priceRanges.map((pr) => (
                    <Link
                      key={pr.name}
                      href={pr.href}
                      onClick={() => setIsOpen(false)}
                      className="px-2 py-1 rounded-md bg-neutral-100 text-[11px] text-neutral-600 hover:bg-emerald-50 hover:text-shop_dark_green transition-colors font-medium"
                    >
                      {pr.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Col 2: Specifications & Highlights */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  Cấu hình & Dòng nổi bật
                </h4>
                <ul className="space-y-2">
                  {activeCategory.highlights.map((h) => (
                    <li key={h.name}>
                      <Link
                        href={h.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between text-xs text-neutral-700 hover:text-shop_dark_green font-medium transition-colors group py-0.5"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 group-hover:bg-shop_dark_green transition-colors" />
                          <span>{h.name}</span>
                        </span>
                        {h.tag && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-shop_dark_green font-semibold">
                            {h.tag}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-4 border-t border-neutral-100">
                  <Link
                    href={`/shop?category=${activeCategory.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-shop_dark_green hover:underline"
                  >
                    <span>Khám phá toàn bộ {activeCategory.title}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Col 3: Real DB Featured Product */}
              {activeCategory.featuredPromo && (
                <div className="flex flex-col justify-between p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-neutral-50 border border-emerald-100 shadow-2xs">
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-shop_dark_green text-white mb-2">
                      {activeCategory.featuredPromo.tag}
                    </span>
                    <h5 className="text-xs font-bold text-neutral-900 leading-snug line-clamp-2">
                      {activeCategory.featuredPromo.title}
                    </h5>
                    <p className="text-[11px] text-neutral-500 mt-1 line-clamp-1">
                      {activeCategory.featuredPromo.subtitle}
                    </p>
                  </div>

                  {/* Product Image */}
                  <div className="relative aspect-4/3 w-full my-3 flex items-center justify-center p-2">
                    {activeCategory.featuredPromo.image ? (
                      <Image
                        src={activeCategory.featuredPromo.image}
                        alt={activeCategory.featuredPromo.title}
                        fill
                        sizes="200px"
                        className="object-contain hover:scale-105 transition-transform"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        {activeCategory.icon}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2.5">
                      <div className="text-sm font-extrabold text-shop_dark_green">
                        {formatPriceVND(activeCategory.featuredPromo.price)}
                      </div>
                      {activeCategory.featuredPromo.originalPrice &&
                        activeCategory.featuredPromo.originalPrice >
                        activeCategory.featuredPromo.price && (
                          <div className="text-[10px] text-neutral-400 line-through">
                            {formatPriceVND(activeCategory.featuredPromo.originalPrice)}
                          </div>
                        )}
                    </div>

                    <Link
                      href={activeCategory.featuredPromo.href}
                      onClick={() => setIsOpen(false)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-shop_dark_green text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs"
                    >
                      <span>Xem sản phẩm</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MegaMenu;
