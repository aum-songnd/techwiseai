import type { OrderStatus } from "@/lib/orders-api";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao hàng",
  DELIVERED: "Đã giao hàng",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const DOT: Record<OrderStatus, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-gray-400",
  PROCESSING: "bg-gray-400",
  SHIPPING: "bg-gray-400",
  DELIVERED: "bg-sky-400",
  COMPLETED: "bg-shop_light_green",
  CANCELLED: "bg-red-400",
};

const StatusBadge = ({ status }: { status: OrderStatus }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
    <span className={`w-1.5 h-1.5 rounded-full ${DOT[status] ?? "bg-gray-300"}`} />
    {STATUS_LABEL[status] ?? status}
  </span>
);

export default StatusBadge;