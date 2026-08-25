import { Blog } from "./types";

export const blogs: Blog[] = [
  {
    id: "blog-review-iphone-15",
    title: "Đánh giá chi tiết iPhone 15 Pro Max sau 1 tháng sử dụng",
    slug: "danh-gia-iphone-15-pro-max",
    authorId: "author-minh",
    mainImageUrl: "https://placehold.co/800x450?text=Review+iPhone+15",
    blogCategoryIds: ["blogcat-review", "blogcat-tech"],
    publishedAt: "2026-06-15T08:00:00.000Z",
    isLatest: true,
    body: "Sau một tháng trải nghiệm, iPhone 15 Pro Max cho thấy hiệu năng vượt trội nhờ chip A17 Pro, khung titan nhẹ hơn hẳn thế hệ trước, và camera zoom quang học 5x rất hữu ích khi chụp xa...",
  },
  {
    id: "blog-tips-pin-dien-thoai",
    title: "5 mẹo giúp pin điện thoại của bạn bền hơn",
    slug: "5-meo-pin-dien-thoai-ben-hon",
    authorId: "author-lan",
    mainImageUrl: "https://placehold.co/800x450?text=Meo+pin",
    blogCategoryIds: ["blogcat-tips"],
    publishedAt: "2026-07-02T10:30:00.000Z",
    isLatest: true,
    body: "Sạc pin đúng cách, tránh để nhiệt độ quá cao và hạn chế sạc qua đêm là những thói quen đơn giản giúp kéo dài tuổi thọ pin điện thoại của bạn...",
  },
  {
    id: "blog-xu-huong-cong-nghe-2026",
    title: "Những xu hướng công nghệ nổi bật nửa cuối năm 2026",
    slug: "xu-huong-cong-nghe-2026",
    authorId: "author-minh",
    mainImageUrl: "https://placehold.co/800x450?text=Xu+huong+2026",
    blogCategoryIds: ["blogcat-tech"],
    publishedAt: "2026-08-10T09:00:00.000Z",
    isLatest: false,
    body: "AI tạo sinh tiếp tục len lỏi vào mọi thiết bị, từ điện thoại đến laptop. Bên cạnh đó, các hãng cũng đẩy mạnh phát triển pin sạc nhanh và vật liệu bền vững...",
  },
];
