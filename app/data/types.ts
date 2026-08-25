
export interface Category {
  id: string;
  title: string;
  slug: string;
  description?: string;
  range?: number; // "Starting from"
  featured: boolean;
  imageUrl?: string;
}

export interface BlogCategory {
  id: string;
  title: string;
  slug: string;
  description?: string;
}

export interface Brand {
  id: string;
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}

export type ProductStatus = "new" | "hot" | "sale";
export type ProductVariant =
  | "gadget"
  | "applicances"
  | "refrigerators"
  | "others";

export interface Product {
  id: string;
  name: string;
  slug: string;
  images: string[];
  description?: string;
  price: number;
  discount: number;
  categoryIds: string[];
  stock: number;
  brandId: string;
  status?: ProductStatus;
  variant?: ProductVariant;
  isFeatured: boolean;
}

export interface Author {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  bio?: string; // đơn giản hoá từ block content thành plain text
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  authorId: string;
  mainImageUrl?: string;
  blogCategoryIds: string[];
  publishedAt: string; // ISO date
  isLatest: boolean;
  body: string; // đơn giản hoá từ block content thành markdown/plain text
}

export interface Address {
  id: string;
  userId?: string; // id user thay cho email nếu backend dùng auth riêng
  name: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
  createdAt: string; // ISO date
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "paid"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderProductItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface OrderInvoice {
  id: string;
  number: string;
  hostedInvoiceUrl: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  invoice?: OrderInvoice;
  stripeCheckoutSessionId?: string;
  stripeCustomerId: string;
  userId: string; // thay cho clerkUserId — id user trong hệ thống auth riêng
  customerName: string;
  email: string;
  stripePaymentIntentId: string;
  products: OrderProductItem[];
  totalPrice: number;
  currency: string;
  amountDiscount: number;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  status: OrderStatus;
  orderDate: string; // ISO date
}
