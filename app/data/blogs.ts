import { Blog } from "./types";

export const blogs: Blog[] = [
  {
    id: "blog-review-iphone-15",
    title: "Đánh giá chi tiết iPhone 15 Pro Max sau 1 tháng sử dụng",
    slug: "danh-gia-iphone-15-pro-max",
    authorId: "author-minh",
    mainImageUrl: "https://cdn.pico.vn/2026/01/17/176864222152917162740.jpeg",
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
    mainImageUrl: "https://cdn.pico.vn/2026/01/17/176864222152917162740.jpeg",
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
    mainImageUrl: "https://scontent.fhan5-10.fna.fbcdn.net/v/t39.30808-6/761168918_1099016862786387_2233477043579049517_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx1219x1220&ctp=s1219x1220&_nc_cat=101&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=oyM9S0ynXQUQ7kNvwHEBOWQ&_nc_oc=AdqOCtEXsVwgVWTVCMBFbiiYmQYtNWsjfosN4bNeurciSV8MuR66CLCD5nZGO8ysw6LrfbiMzi3IUDaQ-GaW5tsZ&_nc_zt=23&_nc_ht=scontent.fhan5-10.fna&_nc_gid=GwNSUEDdXh8u7_gs1nLD8Q&_nc_ss=7b2a8&oh=00_AQJJ4Mm79GXooQ-Xd9ITSI0U8aoakFYSWwbtms51kreT0g&oe=6A9E0718",
    blogCategoryIds: ["blogcat-tech"],
    publishedAt: "2026-08-10T09:00:00.000Z",
    isLatest: false,
    body: "AI tạo sinh tiếp tục len lỏi vào mọi thiết bị, từ điện thoại đến laptop. Bên cạnh đó, các hãng cũng đẩy mạnh phát triển pin sạc nhanh và vật liệu bền vững...",
  },
];
