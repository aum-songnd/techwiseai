import {
  Truck,
  RotateCcw,
  Headphones,
  ShieldCheck,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";

// Ngưỡng miễn phí vận chuyển (VND) - dùng chung cho banner tiện ích và giỏ hàng.
export const FREE_SHIP_THRESHOLD = 500000;

type ServiceFeatureId = "shipping" | "returns" | "warranty" | "support" | "refund";

type ServiceFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

// Sửa nội dung tiện ích (vd ngưỡng free ship) ở đây là đổi toàn site.
const FEATURES: Record<ServiceFeatureId, ServiceFeature> = {
  shipping: {
    icon: Truck,
    title: "Miễn phí vận chuyển",
    description: `Đơn từ ${FREE_SHIP_THRESHOLD.toLocaleString("vi-VN")}đ`,
  },
  returns: {
    icon: RotateCcw,
    title: "Đổi trả 7 ngày",
    description: "Miễn phí đổi trả",
  },
  warranty: {
    icon: ShieldCheck,
    title: "Bảo hành 12 tháng",
    description: "Chính hãng",
  },
  support: {
    icon: Headphones,
    title: "Hỗ trợ 24/7",
    description: "Thân thiện",
  },
  refund: {
    icon: BadgeCheck,
    title: "Hoàn tiền",
    description: "Đảm bảo chất lượng",
  },
};

interface ServiceFeaturesProps {
  // Chọn tiện ích nào hiện, theo thứ tự truyền vào.
  items: ServiceFeatureId[];
  // "row": icon bên trái, chữ bên phải (trang chủ)
  // "compact": icon trên, chữ giữa, có viền trên/dưới (trang sản phẩm)
  variant?: "row" | "compact";
  className?: string;
}

const ServiceFeatures = ({
  items,
  variant = "row",
  className = "",
}: ServiceFeaturesProps) => {
  const features = items.map((id) => ({ id, ...FEATURES[id] }));

  if (variant === "compact") {
    return (
      <div
        className={`grid grid-cols-3 border-y border-gray-200 py-5 text-center ${className}`}
      >
        {features.map(({ id, icon: Icon, title, description }) => (
          <div key={id} className="flex flex-col items-center px-2">
            <Icon className="h-6 w-6 text-gray-800" strokeWidth={1.5} />
            <p className="mt-2 text-xs font-medium text-gray-900">{title}</p>
            <p className="mt-0.5 text-[11px] text-gray-500">{description}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 gap-4 border-t border-gray-200 pt-6 sm:grid-cols-2 md:grid-cols-4 md:gap-0 ${className}`}
    >
      {features.map(({ id, icon: Icon, title, description }) => (
        <div key={id} className="flex items-center gap-3 md:pr-5">
          <Icon size={26} strokeWidth={1.5} className="shrink-0 text-gray-700" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{title}</span>
            <span className="text-xs text-gray-500">{description}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServiceFeatures;