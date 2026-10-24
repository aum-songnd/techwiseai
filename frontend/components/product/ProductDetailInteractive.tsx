"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ArrowLeftRight, Check, Heart, Sparkles, ShoppingBag } from "lucide-react";
import type { Product } from "@/app/data/types";
import { useCompare } from "@/context/CompareContext";
import { useFavorite } from "@/context/FavoriteContext";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";
import { useCart, setPendingBundleItems, type PendingCartItem } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import AddToCart from "@/components/cart/AddToCart";

interface ProductDetailInteractiveProps {
  product: Product;
  siblingVariants?: Product[];
  compatibleAccessories?: Product[];
}

interface CompatibleAccessory {
  id: string;
  name: string;
  originalPrice: number;
  comboPrice: number;
  image: string;
  rawProduct: Product;
}

export interface ColorOption {
  name: string;
  hex: string;
  imgIndex: number;
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

function getVariantLabel(p: Product): string {
  const name = p.name;
  const specs = p.specifications || {};

  // 1. RAM + Storage in name, e.g. "12GB 512GB" or "16GB 1TB"
  const ramStorageMatch = name.match(
    /\b((?:[468]|12|16|24|32|64|128)\s*GB)\s+((?:64|128|256|512)\s*GB|(?:1|2|4)\s*TB)\b/i
  );
  if (ramStorageMatch) {
    return `${ramStorageMatch[1].toUpperCase()} • ${ramStorageMatch[2].toUpperCase()}`;
  }

  // 2. Storage in name, e.g. "256GB" or "1TB"
  const storageMatch = name.match(/\b(64|128|256|512)\s*GB\b|\b(1|2|4)\s*TB\b/i);
  if (storageMatch) {
    return storageMatch[0].toUpperCase();
  }

  // 3. From specs
  const ram = specs["RAM"] || specs["Dung lượng RAM"];
  const ssd = specs["Ổ cứng"] || specs["SSD"] || specs["Bộ nhớ trong"];
  if (ram && ssd) return `${ram} • ${ssd}`;
  if (ssd) return ssd;
  if (ram) return ram;

  return "Tiêu chuẩn";
}

function getProductColors(product: Product): ColorOption[] {
  const name = product.name.toLowerCase();
  const cat = (product.categories?.[0] || "").toLowerCase();
  const variant = product.variant;

  const colorMap = [
    { name: "Titan Sa Mạc", hex: "#d4b996", keywords: ["sa mạc", "desert", "gold"] },
    { name: "Titan Tự Nhiên", hex: "#9ca3af", keywords: ["titan tự nhiên", "natural titanium"] },
    { name: "Titan Đen", hex: "#1f2937", keywords: ["titan đen", "black titanium", "đen titan"] },
    { name: "Titan Trắng", hex: "#f8fafc", keywords: ["titan trắng", "white titanium", "trắng titan"] },
    { name: "Đen Huyền Bí", hex: "#18181b", keywords: ["đen", "black", "midnight", "tối"] },
    { name: "Trắng Tinh Khôi", hex: "#ffffff", keywords: ["trắng", "white", "starlight", "sáng"] },
    { name: "Xám Không Gian", hex: "#4b5563", keywords: ["xám", "gray", "grey", "space gray"] },
    { name: "Bạc Ánh Kim", hex: "#e5e7eb", keywords: ["bạc", "silver"] },
    { name: "Xanh Navy", hex: "#1e3a8a", keywords: ["xanh navy", "xanh dương", "blue"] },
    { name: "Hồng Pastel", hex: "#f472b6", keywords: ["hồng", "pink", "rose"] },
    { name: "Tím Huyền Ảo", hex: "#7c3aed", keywords: ["tím", "purple", "violet"] },
  ];

  const specificColor = colorMap.find((c) => c.keywords.some((kw) => name.includes(kw)));

  // If Phone:
  if (
    cat.includes("điện thoại") ||
    cat.includes("phone") ||
    variant === "phone" ||
    name.includes("iphone") ||
    name.includes("galaxy") ||
    name.includes("poco") ||
    name.includes("meizu") ||
    name.includes("oppo")
  ) {
    if (name.includes("iphone")) {
      const iphoneColors = [
        { name: "Titan Tự Nhiên", hex: "#9ca3af", imgIndex: 0 },
        { name: "Titan Sa Mạc", hex: "#d4b996", imgIndex: 1 },
        { name: "Titan Trắng", hex: "#f8fafc", imgIndex: 2 },
        { name: "Titan Đen", hex: "#18181b", imgIndex: 3 },
      ];
      if (specificColor) {
        return [
          { ...specificColor, imgIndex: 0 },
          ...iphoneColors.filter((c) => c.name !== specificColor.name),
        ].map((c, i) => ({ ...c, imgIndex: i }));
      }
      return iphoneColors;
    }
    return [
      { name: "Đen Titan", hex: "#18181b", imgIndex: 0 },
      { name: "Xám Titan", hex: "#6b7280", imgIndex: 1 },
      { name: "Bạc Ánh Kim", hex: "#e5e7eb", imgIndex: 2 },
      { name: "Xanh Titan", hex: "#2563eb", imgIndex: 3 },
    ];
  }

  // If Laptop:
  if (
    cat.includes("laptop") ||
    variant === "laptop" ||
    name.includes("laptop") ||
    name.includes("macbook") ||
    name.includes("surface")
  ) {
    return [
      { name: "Xám Không Gian", hex: "#4b5563", imgIndex: 0 },
      { name: "Bạc Ánh Kim", hex: "#e5e7eb", imgIndex: 1 },
      { name: "Đen Huyền Bí", hex: "#18181b", imgIndex: 2 },
    ];
  }

  // If Earphones:
  if (
    cat.includes("tai nghe") ||
    variant === "earphone" ||
    name.includes("tai nghe") ||
    name.includes("buds") ||
    name.includes("airpods") ||
    name.includes("freebuds")
  ) {
    return [
      { name: "Trắng Tinh Khôi", hex: "#ffffff", imgIndex: 0 },
      { name: "Đen Nhám", hex: "#18181b", imgIndex: 1 },
    ];
  }

  // If accessory/camera/component with explicit color
  if (specificColor) {
    return [{ name: specificColor.name, hex: specificColor.hex, imgIndex: 0 }];
  }

  // Không tự ý gán màu mặc định cho các linh kiện, cáp sạc, máy ảnh không có biến thể màu
  return [];
}

const ProductDetailInteractive = ({
  product,
  siblingVariants = [],
  compatibleAccessories = [],
}: ProductDetailInteractiveProps) => {
  const { isComparing, toggleCompare } = useCompare();
  const { isFavorite, toggleFavorite } = useFavorite();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const { addToCart, addMultipleToCart, requiresLogin } = useCart();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [currentProduct, setCurrentProduct] = useState<Product>(product);

  // Sync if prop changes
  useEffect(() => {
    setCurrentProduct(product);
  }, [product]);

  const isProductFavorite = isFavorite(currentProduct.id);
  const isProductComparing = isComparing(currentProduct.id);

  // Record to recently viewed on mount
  useEffect(() => {
    if (currentProduct) {
      addToRecentlyViewed(currentProduct);
    }
  }, [currentProduct, addToRecentlyViewed]);

  // Colors based on current product
  const colors = useMemo(() => getProductColors(currentProduct), [currentProduct]);
  const [selectedColor, setSelectedColor] = useState(colors[0]?.name || "");

  // Keep selectedColor valid when product/colors change
  useEffect(() => {
    if (colors.length > 0 && !colors.some((c) => c.name === selectedColor)) {
      setSelectedColor(colors[0]?.name || "");
    } else if (colors.length === 0) {
      setSelectedColor("");
    }
  }, [colors, selectedColor]);

  // Color change handler
  const handleSelectColor = (color: ColorOption) => {
    setSelectedColor(color.name);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("product-color-change", { detail: { index: color.imgIndex } })
      );
    }
  };

  // Real Sibling Variants from DB
  const validVariants = useMemo(() => {
    if (!siblingVariants || siblingVariants.length <= 1) return [];
    return siblingVariants;
  }, [siblingVariants]);

  // Current variant label
  const currentVariantLabel = useMemo(
    () => getVariantLabel(currentProduct),
    [currentProduct]
  );

  // Hardware specs check for standalone laptops/phones with no siblings
  const specs = currentProduct.specifications || {};
  const ramSpec = specs["RAM"] || specs["Dung lượng RAM"];
  const ssdSpec = specs["Ổ cứng"] || specs["SSD"] || specs["Bộ nhớ trong"];
  const hasHardwareSpecs = Boolean(ramSpec || ssdSpec);
  const hardwareSpecLabel =
    ramSpec && ssdSpec ? `${ramSpec} • ${ssdSpec}` : ramSpec || ssdSpec || "";

  const handleSelectVariant = (v: Product) => {
    if (v.id === currentProduct.id) return;
    setCurrentProduct(v);
    router.replace(`/product/${v.id}`, { scroll: false });
  };

  // Compatible Accessories for this product from REAL DB
  const accessories: CompatibleAccessory[] = useMemo(() => {
    if (!compatibleAccessories || compatibleAccessories.length === 0) {
      return [];
    }
    return compatibleAccessories
      .filter((a) => a.id !== currentProduct.id)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        name: a.name,
        originalPrice: a.price,
        comboPrice: Math.round((a.finalPrice || a.price) * 0.85),
        image: a.thumbnailUrl || "/accessory.webp",
        rawProduct: a,
      }));
  }, [compatibleAccessories, currentProduct.id]);

  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (accessories.length > 0) {
      setSelectedAccessories({
        [accessories[0].id]: true,
      });
    }
  }, [accessories]);

  const toggleAccessory = (id: string) => {
    setSelectedAccessories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const calculatedBasePrice = currentProduct.finalPrice || currentProduct.price;

  const accessoriesTotal = accessories
    .filter((a) => selectedAccessories[a.id])
    .reduce((sum, a) => sum + a.comboPrice, 0);

  const accessoriesOriginalTotal = accessories
    .filter((a) => selectedAccessories[a.id])
    .reduce((sum, a) => sum + a.originalPrice, 0);

  const bundleTotal = calculatedBasePrice + accessoriesTotal;
  const bundleSavings = accessoriesOriginalTotal - accessoriesTotal;

  const activeConfigName = validVariants.length > 1 ? currentVariantLabel : hardwareSpecLabel;

  const handleBuyBundle = () => {
    const variantSuffix = [selectedColor, activeConfigName].filter(Boolean).join(" • ");
    const mainItemName = variantSuffix
      ? `${currentProduct.name} (${variantSuffix})`
      : currentProduct.name;

    const itemsToAdd: PendingCartItem[] = [
      {
        productId: currentProduct.id,
        quantity: 1,
        optimisticItem: {
          id: `temp-${currentProduct.id}`,
          productId: currentProduct.id,
          name: mainItemName,
          unitPrice: calculatedBasePrice,
          originalPrice: currentProduct.price,
          quantity: 1,
          subtotal: calculatedBasePrice,
          stockQuantity: currentProduct.stock ?? 99,
          available: (currentProduct.stock ?? 1) > 0,
          thumbnailUrl: currentProduct.images?.[0] || currentProduct.thumbnailUrl,
        },
      },
      ...accessories
        .filter((a) => selectedAccessories[a.id])
        .map((a) => ({
          productId: a.id,
          quantity: 1,
          optimisticItem: {
            id: `temp-${a.id}`,
            productId: a.id,
            name: `${a.name} (Mua kèm giảm giá)`,
            unitPrice: a.comboPrice,
            originalPrice: a.originalPrice,
            quantity: 1,
            subtotal: a.comboPrice,
            stockQuantity: 99,
            available: true,
            thumbnailUrl: a.image,
          },
        })),
    ];

    if (!isSignedIn || requiresLogin) {
      setPendingBundleItems(itemsToAdd);
      router.push(`/sign-in?redirect=${encodeURIComponent("/cart")}`);
      return;
    }

    addMultipleToCart(itemsToAdd);
    router.push("/cart");
  };

  return (
    <div className="space-y-6">
      {/* 1. Color Selector */}
      {colors.length > 0 && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 block mb-2">
            Chọn màu sắc:{" "}
            <span className="text-shop_dark_green font-bold">{selectedColor}</span>
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            {colors.map((c) => {
              const isSelected = selectedColor === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelectColor(c)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${isSelected
                    ? "border-shop_dark_green text-shop_dark_green bg-emerald-50/40  shadow-2xs font-bold"
                    : "border-neutral-200 text-neutral-700 hover:border-neutral-300 bg-white"
                    }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0 shadow-2xs"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Configuration Variant Selector (from REAL DB) */}
      {validVariants.length > 1 ? (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 block mb-2">
            Phiên bản cấu hình / Dung lượng:
          </label>
          <div className="flex flex-wrap gap-2.5">
            {validVariants.map((v) => {
              const isSelected = v.id === currentProduct.id;
              const label = getVariantLabel(v);
              const priceVal = v.finalPrice || v.price;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelectVariant(v)}
                  className={`flex flex-col items-start px-3.5 py-2 rounded-xl border text-xs transition-all cursor-pointer ${isSelected
                    ? "border-shop_dark_green text-shop_dark_green bg-emerald-50/40  shadow-2xs font-bold"
                    : "border-neutral-200 text-neutral-700 hover:border-neutral-300 bg-white"
                    }`}
                >
                  <span className="font-bold">{label}</span>
                  <span className="text-[11px] font-semibold text-neutral-500 mt-0.5">
                    {formatPrice(priceVal)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : hasHardwareSpecs ? (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 block mb-2">
            Cấu hình phần cứng:
          </label>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-shop_dark_green bg-emerald-50/40 text-shop_dark_green text-xs font-bold shadow-2xs">
            <Check className="w-3.5 h-3.5" />
            <span>{hardwareSpecLabel}</span>
          </div>
        </div>
      ) : null}

      {/* 3. Action Buttons Row: Add to cart + Compare + Wishlist */}
      <div className="pt-2 flex items-center gap-3">
        <div className="flex-1">
          <AddToCart
            product={currentProduct}
            selectedColor={selectedColor}
            selectedConfig={activeConfigName}
          />
        </div>

        <button
          type="button"
          onClick={() => toggleCompare(currentProduct)}
          className={`flex items-center justify-center gap-1.5 px-1.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${isProductComparing
            ? "border-shop_dark_green bg-emerald-50 text-shop_dark_green shadow-xs"
            : "border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300"
            }`}
          title={isProductComparing ? "Đã trong danh sách so sánh" : "Thêm vào so sánh"}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isProductComparing ? "Đã so sánh" : "So sánh"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleFavorite(currentProduct)}
          className={`flex items-center justify-center p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${isProductFavorite
            ? "border-shop_dark_green bg-shop_dark_green/200 text-shop_dark_green shadow-xs"
            : "border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300"
            }`}
          title={isProductFavorite ? "Bỏ yêu thích" : "Lưu vào yêu thích"}
        >
          <Heart className="w-4 h-4" fill={isProductFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      {/* 4. Compatible Accessories & Add-on Bundles Box */}
      {accessories.length > 0 && (
        <div className="mt-8 p-5 rounded-3xl border border-neutral-200 bg-neutral-50/70">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-shop_dark_green flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Phụ kiện tương thích - Mua kèm giảm giá sốc</span>
            </span>
            {bundleSavings > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                Tiết kiệm {formatPrice(bundleSavings)}
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {accessories.map((acc) => {
              const isChecked = selectedAccessories[acc.id] ?? false;
              return (
                <div
                  key={acc.id}
                  onClick={() => toggleAccessory(acc.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${isChecked
                    ? "bg-white border-shop_dark_green shadow-2xs"
                    : "bg-white/60 border-neutral-200 opacity-70 hover:opacity-100"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${isChecked ? "bg-shop_dark_green text-white" : "border border-neutral-300"
                        }`}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                    </div>

                    <div className="relative w-10 h-10 bg-neutral-50 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={acc.image || "/laptop.webp"}
                        alt={acc.name}
                        fill
                        unoptimized
                        sizes="40px"
                        className="object-contain p-1"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-neutral-800 line-clamp-1">
                        {acc.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-shop_dark_green">
                          {formatPrice(acc.comboPrice)}
                        </span>
                        <span className="text-[10px] text-neutral-400 line-through">
                          {formatPrice(acc.originalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                    Giảm {Math.round(((acc.originalPrice - acc.comboPrice) / acc.originalPrice) * 100)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bundle Summary & Buy Action */}
          <div className="mt-4 pt-4 border-t border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-neutral-500">Tổng tiền khi mua combo:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-base sm:text-lg font-black text-shop_dark_green">
                  {formatPrice(bundleTotal)}
                </span>
                {bundleSavings > 0 && (
                  <span className="text-xs text-neutral-400 line-through">
                    {formatPrice(calculatedBasePrice + accessoriesOriginalTotal)}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleBuyBundle}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-shop_dark_green hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Mua trọn bộ tiết kiệm</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailInteractive;
