"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingBag, ExternalLink } from "lucide-react";
import type { Product } from "@/app/data/types";
import { useCart, setPendingBundleItems, type PendingCartItem } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface ComboItem {
  id: string;
  name: string;
  originalPrice: number;
  comboPrice: number;
  image: string;
  href: string;
  rawProduct: Product;
}

interface TechCombo {
  id: string;
  tabLabel: string;
  badge: string;
  title: string;
  tagline: string;
  discountPercent: number;
  items: ComboItem[];
}

interface HomeTechCombosProps {
  laptops?: Product[];
  accessories?: Product[];
  audio?: Product[];
  components?: Product[];
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const HomeTechCombos = ({
  laptops = [],
  accessories = [],
  audio = [],
  components = [],
}: HomeTechCombosProps) => {
  const [activeComboIndex, setActiveComboIndex] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const { addToCart, addMultipleToCart, requiresLogin } = useCart();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // Build combos dynamically from REAL database products
  const combos: TechCombo[] = useMemo(() => {
    const list: TechCombo[] = [];

    // Combo 1: Văn Phòng & Làm việc di động
    const officeLaptop =
      laptops.find(
        (p) =>
          (p.price < 26000000 && !p.name.toLowerCase().includes("gaming")) ||
          p.brand?.toLowerCase().includes("asus") ||
          p.brand?.toLowerCase().includes("dell")
      ) || laptops[0];

    const officeAccessory =
      accessories.find(
        (p) =>
          p.name.toLowerCase().includes("sạc") ||
          p.name.toLowerCase().includes("cáp") ||
          p.name.toLowerCase().includes("chuột")
      ) || accessories[0];

    const officeAudio =
      audio.find(
        (p) =>
          p.name.toLowerCase().includes("true wireless") ||
          p.name.toLowerCase().includes("freebuds") ||
          p.name.toLowerCase().includes("wf-")
      ) || audio[0];

    if (officeLaptop && officeAccessory && officeAudio) {
      list.push({
        id: "combo-office",
        tabLabel: "Văn Phòng",
        badge: "Ưu đãi -15%",
        title: "Combo Văn Phòng & Làm Việc Di Động",
        tagline: "Laptop mỏng nhẹ, củ sạc đa cổng GaN và tai nghe chống ồn đàm thoại",
        discountPercent: 15,
        items: [
          {
            id: officeLaptop.id,
            name: officeLaptop.name,
            originalPrice: officeLaptop.price,
            comboPrice: Math.round(officeLaptop.price * 0.95),
            image: officeLaptop.thumbnailUrl || "/laptop.webp",
            href: `/product/${officeLaptop.id}`,
            rawProduct: officeLaptop,
          },
          {
            id: officeAccessory.id,
            name: officeAccessory.name,
            originalPrice: officeAccessory.price,
            comboPrice: Math.round(officeAccessory.price * 0.8),
            image: officeAccessory.thumbnailUrl || "/accessory.webp",
            href: `/product/${officeAccessory.id}`,
            rawProduct: officeAccessory,
          },
          {
            id: officeAudio.id,
            name: officeAudio.name,
            originalPrice: officeAudio.price,
            comboPrice: Math.round(officeAudio.price * 0.85),
            image: officeAudio.thumbnailUrl || "/earphone.webp",
            href: `/product/${officeAudio.id}`,
            rawProduct: officeAudio,
          },
        ],
      });
    }

    // Combo 2: Chiến Hạm Gaming & Nâng Cấp Tốc Độ
    const gamingLaptop =
      laptops.find(
        (p) =>
          p.name.toLowerCase().includes("gaming") ||
          p.name.toLowerCase().includes("rtx") ||
          p.name.toLowerCase().includes("legion") ||
          p.name.toLowerCase().includes("nitro") ||
          p.price > 25000000
      ) || (laptops.length > 1 ? laptops[1] : laptops[0]);

    const gamingAudio =
      audio.find(
        (p) =>
          p.name.toLowerCase().includes("chụp tai") ||
          p.name.toLowerCase().includes("wh-") ||
          p.name.toLowerCase().includes("jbl")
      ) || (audio.length > 1 ? audio[1] : audio[0]);

    const fastStorage =
      components.find(
        (p) =>
          p.name.toLowerCase().includes("ssd") ||
          p.name.toLowerCase().includes("nvme") ||
          p.name.toLowerCase().includes("samsung")
      ) || components[0];

    if (gamingLaptop && gamingAudio && fastStorage) {
      list.push({
        id: "combo-gaming",
        tabLabel: "Gaming",
        badge: "Tiết kiệm 1.500.000đ",
        title: "Chiến Hạm Gaming & Đồ Họa Đỉnh Cao",
        tagline: "Laptop hiệu năng cao, tai nghe âm vòm và ổ cứng SSD siêu tốc",
        discountPercent: 15,
        items: [
          {
            id: gamingLaptop.id,
            name: gamingLaptop.name,
            originalPrice: gamingLaptop.price,
            comboPrice: Math.round(gamingLaptop.price * 0.95),
            image: gamingLaptop.thumbnailUrl || "/laptop.webp",
            href: `/product/${gamingLaptop.id}`,
            rawProduct: gamingLaptop,
          },
          {
            id: gamingAudio.id,
            name: gamingAudio.name,
            originalPrice: gamingAudio.price,
            comboPrice: Math.round(gamingAudio.price * 0.85),
            image: gamingAudio.thumbnailUrl || "/earphone.webp",
            href: `/product/${gamingAudio.id}`,
            rawProduct: gamingAudio,
          },
          {
            id: fastStorage.id,
            name: fastStorage.name,
            originalPrice: fastStorage.price,
            comboPrice: Math.round(fastStorage.price * 0.85),
            image: fastStorage.thumbnailUrl || "/ssd.webp",
            href: `/product/${fastStorage.id}`,
            rawProduct: fastStorage,
          },
        ],
      });
    }

    // Combo 3: Sinh viên - Học tập
    const studentLaptop =
      laptops.find(
        (p) =>
          p.price < 20000000 ||
          p.name.toLowerCase().includes("inspiron") ||
          p.name.toLowerCase().includes("vivobook")
      ) || (laptops.length > 2 ? laptops[2] : laptops[0]);

    const studentAccessory =
      accessories.find(
        (p) =>
          p.name.toLowerCase().includes("chuột") ||
          p.name.toLowerCase().includes("hub")
      ) || (accessories.length > 1 ? accessories[1] : accessories[0]);

    const studentAudio =
      audio.find(
        (p) =>
          p.name.toLowerCase().includes("anker") ||
          p.name.toLowerCase().includes("r50i")
      ) || (audio.length > 2 ? audio[2] : audio[0]);

    if (studentLaptop && studentAccessory && studentAudio && list.length < 3) {
      list.push({
        id: "combo-student",
        tabLabel: "Học Tập",
        badge: "Giá sinh viên",
        title: "Combo Học Tập & Sinh Viên Tiết Kiệm",
        tagline: "Laptop bền bỉ, chuột không dây và tai nghe học tập giá tốt",
        discountPercent: 12,
        items: [
          {
            id: studentLaptop.id,
            name: studentLaptop.name,
            originalPrice: studentLaptop.price,
            comboPrice: Math.round(studentLaptop.price * 0.95),
            image: studentLaptop.thumbnailUrl || "/laptop.webp",
            href: `/product/${studentLaptop.id}`,
            rawProduct: studentLaptop,
          },
          {
            id: studentAccessory.id,
            name: studentAccessory.name,
            originalPrice: studentAccessory.price,
            comboPrice: Math.round(studentAccessory.price * 0.8),
            image: studentAccessory.thumbnailUrl || "/accessory.webp",
            href: `/product/${studentAccessory.id}`,
            rawProduct: studentAccessory,
          },
          {
            id: studentAudio.id,
            name: studentAudio.name,
            originalPrice: studentAudio.price,
            comboPrice: Math.round(studentAudio.price * 0.85),
            image: studentAudio.thumbnailUrl || "/earphone.webp",
            href: `/product/${studentAudio.id}`,
            rawProduct: studentAudio,
          },
        ],
      });
    }

    return list;
  }, [laptops, accessories, audio, components]);

  // Initialize selected items for all combo items
  useEffect(() => {
    if (combos.length > 0) {
      const initialMap: Record<string, boolean> = {};
      combos.forEach((c) => {
        c.items.forEach((item) => {
          initialMap[item.id] = true;
        });
      });
      setSelectedItems(initialMap);
    }
  }, [combos]);

  if (combos.length === 0) {
    return null;
  }

  const combo = combos[activeComboIndex] || combos[0];

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const currentTotal = combo.items
    .filter((item) => selectedItems[item.id])
    .reduce((sum, item) => sum + item.comboPrice, 0);

  const currentOriginalTotal = combo.items
    .filter((item) => selectedItems[item.id])
    .reduce((sum, item) => sum + item.originalPrice, 0);

  const totalSavings = Math.max(0, currentOriginalTotal - currentTotal);
  const activeCount = combo.items.filter((item) => selectedItems[item.id]).length;

  const handleBuyCombo = () => {
    const activeList = combo.items.filter((item) => selectedItems[item.id]);
    if (activeList.length === 0) return;

    const itemsToAdd: PendingCartItem[] = activeList.map((item) => ({
      productId: item.id,
      quantity: 1,
      optimisticItem: {
        id: `temp-${item.id}`,
        productId: item.id,
        name: item.name,
        unitPrice: item.comboPrice,
        originalPrice: item.originalPrice,
        quantity: 1,
        subtotal: item.comboPrice,
        stockQuantity: item.rawProduct.stock || 10,
        available: true,
        thumbnailUrl: item.image,
      },
    }));

    if (!isSignedIn || requiresLogin) {
      setPendingBundleItems(itemsToAdd);
      router.push(`/sign-in?redirect=${encodeURIComponent("/cart")}`);
      return;
    }

    addMultipleToCart(itemsToAdd);
    router.push("/cart");
  };

  return (
    <section className="my-8 font-sans">
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 sm:p-5 shadow-2xs">
        {/* Header Row (Tối giản theo chuẩn Flash Sale) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 pb-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-sans text-xl font-bold uppercase tracking-tight text-shop_dark_green">
              Combo Tiết Kiệm
            </span>
            <span className="bg-emerald-50 text-shop_dark_green font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200">
              {combo.badge}
            </span>
          </div>

          {/* Right: Switcher Tabs */}
          {combos.length > 1 && (
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl self-start sm:self-auto">
              {combos.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveComboIndex(idx)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeComboIndex === idx
                    ? "bg-white text-shop_dark_green shadow-xs font-bold"
                    : "text-neutral-500 hover:text-neutral-900"
                    }`}
                >
                  {c.tabLabel}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Combo Items & Pricing Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Products (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col sm:flex-row items-center gap-2.5">
            {combo.items.map((item, idx) => {
              const isSelected = !!selectedItems[item.id];
              return (
                <React.Fragment key={item.id}>
                  {idx > 0 && (
                    <div className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-neutral-100 text-neutral-400 font-bold text-sm shrink-0 select-none">
                      +
                    </div>
                  )}

                  <div
                    onClick={() => toggleItem(item.id)}
                    className={`flex-1 w-full bg-white border border-neutral-200 rounded-xl p-3 transition-all cursor-pointer group relative flex flex-col ${isSelected
                      ? "shadow-2xs"
                      : "opacity-60 hover:opacity-90"
                      }`}
                  >
                    {/* Checkbox indicator */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${isSelected
                          ? "bg-shop_dark_green text-white"
                          : "border border-neutral-300 bg-white"
                          }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Image Box */}
                    <div className="relative aspect-square w-full rounded-lg bg-[#f1f5f9] overflow-hidden mb-2.5">
                      <Image
                        src={item.image || "/laptop.webp"}
                        alt={item.name}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.src = "/laptop.webp";
                        }}
                      />
                    </div>

                    {/* Product Name */}
                    <h4 className="text-xs sm:text-sm font-medium text-neutral-800 line-clamp-2 min-h-[2.5em] group-hover:text-shop_dark_green transition-colors">
                      {item.name}
                    </h4>

                    {/* Price Row */}
                    <div className="flex items-baseline gap-1.5 mt-2 flex-wrap">
                      <span className="text-sm sm:text-base font-bold text-shop_dark_green">
                        {formatPrice(item.comboPrice)}
                      </span>
                      <span className="text-xs text-neutral-400 line-through">
                        {formatPrice(item.originalPrice)}
                      </span>
                    </div>

                    {/* Bottom Link */}
                    <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                      <Link
                        href={item.href}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-shop_dark_green inline-flex items-center gap-1 transition-colors"
                      >
                        Chi tiết <ExternalLink className="w-3 h-3" />
                      </Link>
                      <span className="text-[10px] font-semibold text-emerald-700  px-1.5 py-0.5 ">
                        Giá combo
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Pricing & CTA Card (4 cols on lg) */}
          <div className="lg:col-span-4 bg-[#f8fafc] border border-neutral-200/90 rounded-xl p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                Tổng giá trị gói ({activeCount}/{combo.items.length} món)
              </div>

              {/* Price comparison */}
              <div className="space-y-1 mb-3.5">
                <div className="text-2xl sm:text-3xl font-black text-shop_dark_green">
                  {formatPrice(currentTotal)}
                </div>
                {totalSavings > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400 line-through">
                      {formatPrice(currentOriginalTotal)}
                    </span>
                    <span className="text-xs font-bold text-[#ea580c] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                      Tiết kiệm {formatPrice(totalSavings)}
                    </span>
                  </div>
                )}
              </div>

              {/* Fast trust features */}
              <div className="space-y-1.5 py-2.5 border-y border-neutral-200/80 text-xs text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Sản phẩm chính hãng TechWise AI</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Ưu đãi áp dụng thẳng vào giỏ hàng</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Miễn phí vận chuyển toàn quốc</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBuyCombo}
              disabled={activeCount === 0}
              className="mt-4 w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-shop_dark_green hover:bg-shop_dark_green/90 text-white shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Mua {activeCount} sản phẩm ({formatPrice(currentTotal)})</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeTechCombos;
