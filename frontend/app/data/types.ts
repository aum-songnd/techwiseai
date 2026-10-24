export interface Category {
  id: string;
  title: string;
  slug: string;
  description?: string;
  range?: number;
  featured: boolean;
  imageUrl?: string;
  displayOrder?: number;
  active?: boolean;
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
export type ProductVariant = "phone" | "laptop" | "earphone" | "others";

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  categoryId?: string;
  images: string[];
  thumbnailUrl?: string;
  description?: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  discount: number;
  finalPrice: number;

  categories?: string[];

  stock: number;
  brand?: string;

  status?: ProductStatus;
  variant?: ProductVariant;
  isFeatured: boolean;
  active?: boolean;
  ratingAverage?: number;
  reviewCount?: number;
  specifications?: Record<string, string>;
}

export type ShoppingDemand =
  | "gaming"
  | "office"
  | "student"
  | "developer"
  | "creator"
  | "entertainment";

export interface DemandOption {
  id: ShoppingDemand;
  label: string;
  tagline: string;
  iconName: string;
  color: string;
  categorySlug?: string;
  keywords: string[];
}

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  userId?: string;
  userFullName: string;
  userAvatarUrl?: string;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  likesCount: number;
  status: "APPROVED" | "HIDDEN" | "PENDING";
  adminReply?: string;
  adminReplyAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

export interface Author {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  bio?: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  authorId: string;
  mainImageUrl?: string;
  blogCategoryIds: string[];
  publishedAt: string;
  isLatest: boolean;
  body: string;
  active?: boolean;
}

export interface Address {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
  createdAt: string;
}

