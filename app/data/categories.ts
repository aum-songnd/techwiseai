import { Category } from "./types";

export const categories: Category[] = [
  {
    id: "cat-phone",
    title: "Điện thoại",
    slug: "dien-thoai",
    description: "Các dòng smartphone mới nhất từ nhiều thương hiệu.",
    range: 3000000,
    featured: true,
    imageUrl: "https://placehold.co/400x300?text=Dien+thoai",
  },
  {
    id: "cat-laptop",
    title: "Laptop",
    slug: "laptop",
    description: "Laptop văn phòng, gaming và đồ hoạ.",
    range: 8000000,
    featured: true,
    imageUrl: "https://placehold.co/400x300?text=Laptop",
  },
  {
    id: "cat-headphone",
    title: "Tai nghe",
    slug: "tai-nghe",
    description: "Tai nghe có dây và không dây, chống ồn chủ động.",
    range: 500000,
    featured: false,
    imageUrl: "https://placehold.co/400x300?text=Tai+nghe",
  },
  {
    id: "cat-smartwatch",
    title: "Đồng hồ thông minh",
    slug: "dong-ho-thong-minh",
    description: "Smartwatch theo dõi sức khoẻ và thể thao.",
    range: 1500000,
    featured: true,
    imageUrl: "https://placehold.co/400x300?text=Smartwatch",
  },
];
