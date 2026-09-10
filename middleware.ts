// Middleware của Clerk đã được gỡ bỏ.
// Vì JWT lưu ở localStorage (chỉ truy cập được từ client), middleware
// (chạy ở edge/server) không thể đọc token để bảo vệ route.
// Việc bảo vệ route được xử lý ở client qua component <RequireAuth>
// (xem components/RequireAuth.tsx).

export const config = {
  matcher: [],
};