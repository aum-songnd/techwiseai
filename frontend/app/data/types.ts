export interface Category {
  id: string;
  title: string;
  slug: string;
  description?: string;
  range?: number;
  featured: boolean;
  imageUrl?: string;
  displayOrder?: number;
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
  images: string[];
  description?: string;
  price: number;
  discount: number;
  finalPrice: number;

  categories?: string[];

  stock: number;
  brand?: string;

  status?: ProductStatus;
  variant?: ProductVariant;
  isFeatured: boolean;
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

