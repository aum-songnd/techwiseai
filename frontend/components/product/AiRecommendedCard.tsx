import ProductCard from "@/components/product/ProductCard";
import type { RecommendedProduct } from "@/lib/api";

const badgeStyle: Record<string, string> = {
  FOR_YOU: "bg-emerald-600 text-white font-bold tracking-wide shadow-emerald-200",
  BEST: "bg-red-500 text-white",
  HOT: "bg-orange-500 text-white",
  CHOICE: "bg-blue-600 text-white",
};

const badgeLabel: Record<string, string> = {
  FOR_YOU: "Dành riêng cho bạn",
  BEST: "Phù hợp nhất",
  HOT: "Hot",
  CHOICE: "Đáng chọn",
};

// Cắt gọn giá trị dài: "Intel Core Ultra 5 322, 6 lõi..." -> "Intel Core Ultra 5 322"
const shorten = (value: string) => value.split(",")[0].split("(")[0].trim();

interface AiRecommendedCardProps {
  item: RecommendedProduct;
}

export default function AiRecommendedCard({ item }: AiRecommendedCardProps) {
  const { product, badge, reason, keySpecs } = item;
  const specs = Object.entries(keySpecs ?? {}).slice(0, 5);

  return (
    <div className="relative flex h-full min-w-0 flex-col gap-2">
      {badge && (
        <span
          className={`absolute top-2 right-2 z-10 text-[11px] font-semibold px-2.5 py-1 rounded-2xl shadow ${
            badgeStyle[badge] ?? "bg-gray-700 text-white"
          }`}
        >
          {badgeLabel[badge] ?? badge}
        </span>
      )}

      {/* Dùng prop để ẩn yêu thích thay vì selector CSS phụ thuộc vào icon. */}
      <div className="flex flex-1 flex-col [&>*]:h-full">
        <ProductCard product={product} hideFavorite />
      </div>

      <p className="min-h-8 line-clamp-2 px-1 text-xs font-medium leading-snug text-shop_dark_green">
        {reason || "\u00a0"}
      </p>

      {/* Khu thông số có chiều cao cố định dù dữ liệu ít. */}
      <ul className="h-[112px] overflow-hidden space-y-1 px-1 text-xs text-gray-600">
        {specs.map(([label, value]) => (
          <li key={label} className="flex min-w-0 gap-1.5">
            <span className="shrink-0 text-gray-400">{label}:</span>
            <span className="truncate" title={value}>
              {shorten(value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}