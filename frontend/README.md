# TechWiseAI - Frontend Web Application

Phân hệ giao diện thương mại điện tử công nghệ của dự án TechWiseAI, phát triển trên nền tảng **Next.js 15 (App Router)**, **React 19**, **TypeScript** và **TailwindCSS v4**.

## 1. Khởi chạy nhanh

```powershell
# Cài đặt thư viện
npm install

# Khởi chạy server phát triển
npm run dev
```

- Địa chỉ Storefront khách hàng: [http://localhost:3000](http://localhost:3000)
- Trang Quản trị Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## 2. Tài liệu Chi tiết Kiến trúc & Chức năng
Tài liệu giải thích chuyên sâu từng thư mục, từng component, từng hook context và từng hàm logic được đặt tại:
👉 **[FRONTEND_MODULE.md](../FRONTEND_MODULE.md)**

Nội dung tài liệu bao gồm:
- **Kiến trúc Công nghệ**: App Router, Route Groups `(client)`, `(admin)`, `(auth)`.
- **Hệ thống State toàn cục**: `AuthContext`, `CartContext`, `CompareContext`, `FavoriteContext`, `RecentlyViewedContext`, `QuickViewContext`, `TabSessionGuard`.
- **Client Storefront**: Trang chủ, MegaMenu, SearchBar đa phương thức (Text, Voice, Image AI), Shop đa diện, Chi tiết sản phẩm, Reviews 5 sao, AI Recommendation Carousel, Giỏ hàng, Checkout, Thanh toán VNPAY, Trợ lý AI Chatbot.
- **Admin Portal**: Quản lý sản phẩm, danh mục, đơn hàng, khách hàng, duyệt review, blog.
- **Tầng API & BFF**: `lib/api.ts`, `lib/cart-api.ts`, `lib/orders-api.ts`, `lib/reviews-api.ts`, `lib/auth.ts`, `lib/provinces-api.ts`, `lib/mailer.ts`.
