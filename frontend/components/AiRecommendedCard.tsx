import ProductCard from "@/components/ProductCard";
import type { RecommendedProduct } from "@/lib/api";

const badgeStyle: Record<string, string> = {
  BEST: "bg-red-500 text-white",
  HOT: "bg-orange-500 text-white",
  CHOICE: "bg-blue-600 text-white",
};

const badgeLabel: Record<string, string> = {
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
  const specs = Object.entries(keySpecs);

  return (
    <div className="relative flex flex-col gap-2">
      {badge && (
        <span
          className={`absolute top-2 right-2 z-10 text-[11px] font-semibold px-2.5 py-1 rounded-2xl shadow ${
            badgeStyle[badge] ?? "bg-gray-700 text-white"
          }`}
        >
          {badgeLabel[badge] ?? badge}
        </span>
      )}

      <ProductCard product={product} />

      {reason && (
        <p className="text-xs text-shop_dark_green font-medium leading-snug px-1">
          {reason}
        </p>
      )}

      {specs.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-1 px-1">
          {specs.map(([label, value]) => (
            <li key={label} className="flex gap-1.5">
              <span className="text-gray-400 shrink-0">{label}:</span>
              <span className="truncate" title={value}>
                {shorten(value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}