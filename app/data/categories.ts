import { Category } from "./types";

export const categories: Category[] = [
  {
    id: "cat-phone",
    title: "Điện thoại",
    slug: "dien-thoai",
    description: "Các dòng smartphone mới nhất từ nhiều thương hiệu.",
    range: 3000000,
    featured: true,
    imageUrl: "https://cdn2.cellphones.com.vn/insecure/rs:fill:150:0/q:70/plain/https://cellphones.com.vn/media/wysiwyg/Web/icon/mobile-gamning.png",
  },
  {
    id: "cat-laptop",
    title: "Laptop",
    slug: "laptop",
    description: "Laptop văn phòng, gaming và đồ hoạ.",
    range: 8000000,
    featured: true,
    imageUrl: "https://cdn2.cellphones.com.vn/insecure/rs:fill:150:0/q:70/plain/https://cellphones.com.vn/media/wysiwyg/Group_846.png",
  },
  {
    id: "cat-headphone",
    title: "Tai nghe",
    slug: "tai-nghe",
    description: "Tai nghe có dây và không dây, chống ồn chủ động.",
    range: 500000,
    featured: false,
    imageUrl: "https://cdn2.cellphones.com.vn/insecure/rs:fill:150:150/q:100/plain/https://cellphones.com.vn/media/wysiwyg/chup-taii.png",
  },
  {
    id: "cat-smartwatch",
    title: "Đồng hồ thông minh",
    slug: "dong-ho-thong-minh",
    description: "Smartwatch theo dõi sức khoẻ và thể thao.",
    range: 1500000,
    featured: true,
    imageUrl: "https://cdn2.cellphones.com.vn/insecure/rs:fill:150:150/q:100/plain/https://cellphones.com.vn/media/wysiwyg/chay-bo.png",
  },
];
