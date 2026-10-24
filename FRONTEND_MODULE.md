# TÀI LIỆU KIẾN TRÚC & CHỨC NĂNG PHÂN HỆ FRONTEND (TECHWISEAI)

Tài liệu này giải thích chi tiết toàn bộ kiến trúc mã nguồn, các chức năng nghiệp vụ, luồng dữ liệu, từng file, từng hàm logic và mối liên hệ giữa các thành phần trong thư mục **`frontend/`** của dự án TechWiseAI.

---

## 1. Tổng quan Kiến trúc Công nghệ (Technology Stack)

Frontend TechWiseAI được phát triển theo mô hình hiện đại chuẩn **Next.js App Router (Fullstack React)** với các công nghệ lõi:

- **Framework**: [Next.js 15.5](https://nextjs.org/) (hỗ trợ Turbopack, React Server Components và Client Components).
- **Thư viện UI & View**: React 19, TypeScript 5, [TailwindCSS v4](https://tailwindcss.com/) (Styling hiệu năng cao), Lucide React (Bộ icon đa dạng), Motion / Framer Motion (Hiệu ứng động mượt mà), Base UI & Radix UI primitives.
- **Carousel & Slider**: `embla-carousel-react`, `embla-carousel-autoplay`.
- **Marquee**: `react-fast-marquee`.
- **Mailing**: `nodemailer` (gửi email xác nhận đơn hàng và mã OTP đặt lại mật khẩu trực tiếp từ server Next.js).
- **Mô hình kiến trúc**:
  - **Client Storefront (`app/(client)/`)**: Giao diện mua sắm công nghệ cho khách hàng.
  - **Admin Portal (`app/(admin)/admin/`)**: Trang quản trị hệ thống (sản phẩm, đơn hàng, người dùng, review, blog).
  - **Auth System (`app/(auth)/`)**: Đăng nhập, đăng ký, quên mật khẩu và quản lý phiên.
  - **BFF (Backend-For-Frontend) Route Handlers (`app/api/`)**: Các endpoint API Next.js làm cầu nối an toàn, đính kèm token và quản lý cookie giữa Client và Backend Spring Boot.
  - **Global Context Providers (`context/`)**: Quản lý giỏ hàng, xác thực, so sánh, yêu thích, sản phẩm vừa xem.
  - **Cross-tab Sync (`lib/tab-sync.ts`)**: Cơ chế đồng bộ hóa trạng thái tức thì giữa nhiều tab trình duyệt qua `BroadcastChannel` và `StorageEvent`.

---

## 2. Hệ thống Quản lý Trạng thái Toàn cục (Global State & Contexts)

Nằm trong thư mục [frontend/context/](file:///c:/Users/Song/Desktop/techwiseai/frontend/context):

### 2.1. `AuthContext.tsx` — Quản lý Xác thực & Phiên đăng nhập
- **Mục đích**: Cung cấp trạng thái đăng nhập, thông tin người dùng (`User`), JWT Token và các hành động liên quan xuyên suốt toàn bộ ứng dụng.
- **State chính**:
  - `user`: Thông tin người dùng hiện tại (ID, email, họ tên, số điện thoại, avatar, roles/authorities).
  - `token`: Chuỗi Access Token JWT dùng để xác thực các API.
  - `isAuthenticated` / `isSignedIn`: Boolean xác định trạng thái đăng nhập.
  - `isLoading`: Boolean xác định quá trình khôi phục phiên đăng nhập từ localStorage/cookie khi tải trang.
- **Hàm logic chính**:
  - `login(usernameOrEmail, password)`: Gửi thông tin đăng nhập tới API `/api/auth/login`, lưu token vào Cookie/LocalStorage và phát sự kiện đồng bộ `AUTH_LOGIN` cho các tab khác.
  - `register(payload)`: Đăng ký tài khoản mới qua API `/api/auth/register`.
  - `logout()`: Xoá sạch Access Token, User Profile trong Cookie/LocalStorage và phát sự kiện `AUTH_LOGOUT` để đăng xuất tất cả các tab đang mở.
  - `refreshProfile()`: Gọi `/api/auth/me` để cập nhật lại thông tin mới nhất của người dùng.
- **Tệp liên quan**: [frontend/lib/auth.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib/auth.ts), [frontend/components/TabSessionGuard.tsx](file:///c:/Users/Song/Desktop/techwiseai/frontend/components/TabSessionGuard.tsx), [frontend/lib/tab-sync.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib/tab-sync.ts).

---

### 2.2. `CartContext.tsx` — Quản lý Giỏ hàng Đa năng (Guest Cart & User Cart)
- **Mục đích**: Quản lý thêm/sửa/xoá/đồng bộ giỏ hàng với cơ chế thông minh hỗ trợ cả khách vãng lai (Guest) và người dùng đã đăng nhập.
- **State chính**:
  - `items`: Danh sách các mặt hàng trong giỏ (`CartItem[]`).
  - `totalItems`: Tổng số loại sản phẩm khác nhau trong giỏ.
  - `totalQuantity`: Tổng số lượng hàng hóa (cộng dồn).
  - `totalAmount`: Tổng tiền tạm tính trước giảm giá và ship.
  - `requiresLogin`: Cảnh báo yêu cầu đăng nhập khi tính năng cần tài khoản.
- **Hàm logic chính**:
  - `addToCart(productId, quantity, optimisticItem)`:
    - Nếu đã đăng nhập: Gọi API `addCartItem` gửi lên backend `/api/v1/cart/items`. Sử dụng *Optimistic UI* để cập nhật giao diện ngay lập tức trước khi server phản hồi.
    - Nếu là khách chưa đăng nhập: Lưu vào `localStorage`, phát sự kiện `CART_UPDATED` để các tab khác đồng bộ số lượng.
  - `addMultipleToCart(items: PendingCartItem[])`: Thêm combo nhiều sản phẩm cùng lúc (Tech Combos, phụ kiện đi kèm).
  - `updateQuantity(itemId, quantity)`: Tăng/giảm số lượng sản phẩm trong giỏ (tự động xoá nếu số lượng $\le 0$).
  - `removeFromCart(itemId)`: Xoá một món đồ khỏi giỏ hàng.
  - `clearCart()`: Làm trống toàn bộ giỏ hàng sau khi đặt hàng thành công.
  - **Cơ chế Hợp nhất Giỏ hàng (Cart Merging)**: Khi người dùng đang chọn hàng ở chế độ khách rồi tiến hành đăng nhập, hệ thống tự động gom các sản phẩm đang có trong localStorage đẩy lên server backend để hợp nhất với giỏ hàng tài khoản.
- **Tệp liên quan**: [frontend/lib/cart-api.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib/cart-api.ts), [frontend/components/AddToCart.tsx](file:///c:/Users/Song/Desktop/techwiseai/frontend/components/AddToCart.tsx), [frontend/components/CartIcon.tsx](file:///c:/Users/Song/Desktop/techwiseai/frontend/components/CartIcon.tsx).

---

### 2.3. `CompareContext.tsx` — So sánh Sản phẩm Thông minh
- **Mục đích**: Cho phép người dùng chọn tối đa 4 sản phẩm công nghệ (cùng hoặc khác danh mục) để so sánh chi tiết thông số đối chiếu theo bảng.
- **State chính**:
  - `compareProducts`: Mảng chứa tối đa 4 sản phẩm (`Product[]`).
  - `isCompareModalOpen`: Điều khiển mở/đóng Modal bảng so sánh chi tiết.
  - `isDrawerOpen`: Điều khiển thanh Dock nhỏ gọn hiển thị ở chân trang khi có sản phẩm đang được so sánh.
- **Hàm logic chính**:
  - `addToCompare(product)`: Kiểm tra nếu đã có thì không thêm trùng; nếu đủ 4 sản phẩm thì cảnh báo; thêm sản phẩm và tự động bật CompareDrawer.
  - `removeFromCompare(productId)`: Gỡ bỏ sản phẩm khỏi danh sách so sánh.
  - `clearCompare()`: Xoá toàn bộ danh sách so sánh.
- **Tệp liên quan**: [frontend/components/CompareButton.tsx](file:///c:/Users/Song/Desktop/techwiseai/frontend/components/CompareButton.tsx), [frontend/components/CompareDrawer.tsx](file:///c:/Users/Song/Desktop/techwiseai/frontend/components/CompareDrawer.tsx), [frontend/components/CompareModal.tsx](file:///c:/Users/Song/Desktop/techwiseai/frontend/components/CompareModal.tsx).

---

### 2.4. `FavoriteContext.tsx` — Danh sách Sản phẩm Yêu thích (Wishlist)
- **Mục đích**: Lưu trữ và quản lý các sản phẩm mà người dùng thả tim yêu thích.
- **State & Hàm logic**:
  - `favorites`: Mảng danh sách các Product ID.
  - `toggleFavorite(productId)`: Thêm vào hoặc loại bỏ khỏi Wishlist. Nếu đã đăng nhập, tự động đồng bộ lên backend `/api/v1/favorites`.
  - `isFavorite(productId)`: Trả về `boolean` kiểm tra sản phẩm hiện tại có được thích hay không.
- **Tệp liên quan**: [frontend/components/FavoriteButton.tsx](file:///c:/Users/Song/Desktop/techwiseai/frontend/components/FavoriteButton.tsx), [frontend/app/(client)/wishlist/page.tsx](file:///c:/Users/Song/Desktop/techwiseai/frontend/app/(client)/wishlist/page.tsx).

---

### 2.5. `RecentlyViewedContext.tsx` & `QuickViewContext.tsx`
- **`RecentlyViewedContext.tsx`**: Tự động lưu vết các sản phẩm người dùng vừa click vào xem (lưu trong `localStorage`, giới hạn 10 sản phẩm gần nhất), phục vụ component `HomeRecentlyViewed.tsx`.
- **`QuickViewContext.tsx`**: Điều khiển hiển thị `QuickViewModal.tsx` để xem nhanh ảnh, cấu hình, giá và nút thêm vào giỏ mà không cần chuyển trang.

---

### 2.6. `TabSessionGuard.tsx` & `tab-sync.ts` — Đồng bộ Đa Tab Trình duyệt
- **Mục đích**: Giải quyết bài toán người dùng mở nhiều tab cùng lúc trên website thương mại điện tử.
- **Cơ chế**:
  - Sử dụng `BroadcastChannel("techwise_tab_sync")` kết hợp sự kiện `window.addEventListener("storage", ...)` để dự phòng.
  - Khi tab A đăng nhập $\rightarrow$ Tab B, C lập tức đăng nhập theo mà không cần F5.
  - Khi tab A đăng xuất $\rightarrow$ Tab B, C tự động đăng xuất và điều hướng về trang chủ để bảo vệ dữ liệu cá nhân.
  - Khi tab A thêm sản phẩm vào giỏ hoặc thả tim $\rightarrow$ Badge số lượng giỏ hàng ở các tab khác tự nhảy số tức thì.

---

## 3. Phân hệ Khách hàng (Client Storefront — `app/(client)/`)

### 3.1. Trang chủ (`app/(client)/page.tsx`)
Trang chủ là trung tâm thu hút người dùng với giao diện động được cấu thành từ các component chuyên biệt:
- **`HomeBanner.tsx` & `BannerCarousel.tsx`**: Slider banner chính giới thiệu các chương trình ưu đãi, flagship laptop/điện thoại mới nhất với hiệu ứng trượt tự động mượt mà.
- **`FlashSale.tsx` & `FlashSaleCountdown.tsx`**: Đồng hồ đếm ngược giờ vàng flash sale (ngày, giờ, phút, giây) cùng danh sách sản phẩm giảm giá shock có thanh tiến trình "Đã bán X%".
- **`HomeCategories.tsx`**: Danh mục thiết bị trực quan (Laptop, Điện thoại, Tai nghe, Phụ kiện, Linh kiện) kèm số lượng sản phẩm.
- **`HomePriceDeals.tsx`**: Bộ lọc chọn nhanh theo phân khúc giá (Dưới 10 triệu, 10 - 15 triệu, 15 - 25 triệu, Trên 25 triệu...).
- **`HomeTechCombos.tsx`**: Module gợi ý combo mua sắm công nghệ (ví dụ: Mua Laptop tặng kèm Balo + Chuột không dây với giá combo ưu đãi), cho phép thêm cả bộ vào giỏ hàng chỉ bằng 1 click (`addMultipleToCart`).
- **`HomeBestSellersNew.tsx`**: Danh sách sản phẩm bán chạy nhất theo từng danh mục tab.
- **`HomeDemandShopping.tsx`**: Mua sắm theo nhu cầu sử dụng thực tế:
  - *Học tập - Văn phòng*: Mỏng nhẹ, pin trâu, giá mềm.
  - *Đồ họa - Kỹ thuật*: Màn hình chuẩn màu, chip mạnh.
  - *Gaming*: Tần số quét cao, card đồ họa rời RTX.
  - *Cao cấp - Doanh nhân*: Vỏ nhôm nguyên khối, bảo mật vân tay/khuôn mặt.
- **`HomeBrands.tsx`**: Marquee logo các thương hiệu đối tác lớn (Apple, Asus, Dell, HP, Lenovo, MSI, Acer, Samsung, Sony, Logitech).
- **`HomeLatestBlog.tsx`**: Các bài viết tin tức, thủ thuật, đánh giá công nghệ mới nhất.

---

### 3.2. Thanh Tìm kiếm Đa phương thức Thông minh (`components/SearchBar.tsx`)
Thanh tìm kiếm có quy mô code hơn 28KB, hỗ trợ **3 hình thức tìm kiếm**:
1. **Tìm kiếm Văn bản (Text Search)**:
   - Tích hợp Debounce chống spam request.
   - Gợi ý từ khóa hot (`POPULAR_SEARCHES`), gợi ý danh mục và hãng.
   - Lưu trữ và quản lý lịch sử tìm kiếm người dùng (`techwise_search_history`).
2. **Tìm kiếm bằng Giọng nói (Voice Search)**:
   - Tích hợp Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`).
   - Người dùng nhấn micro, nói tên thiết bị (ví dụ: *"Laptop Asus TUF Gaming"*), hệ thống tự chuyển giọng nói thành text và tìm kiếm ngay lập tức.
3. **Tìm kiếm bằng Hình ảnh AI (AI Visual Search)**:
   - Người dùng bấm biểu tượng Camera và tải lên ảnh sản phẩm (chụp từ điện thoại hoặc tải trên mạng).
   - Gọi hàm `searchProductsByImage(file, topK)` trong `lib/api.ts` gửi tới backend `/api/v1/products/search-by-image`.
   - Backend sử dụng AI Embedding trích xuất đặc trưng hình ảnh và so sánh vector để trả về các sản phẩm có ngoại hình giống nhất.

---

### 3.3. Trang Cửa hàng & Bộ lọc Nâng cao (`app/(client)/shop/page.tsx` & `components/Shop.tsx`)
File `components/Shop.tsx` (56KB) là trung tâm lọc và duyệt sản phẩm chuyên sâu của website:
- **Bộ lọc đa diện (Faceted Filtering)**:
  - Lọc theo Danh mục sản phẩm (`categories`).
  - Lọc theo Thương hiệu (`brands`).
  - Lọc theo Khoảng giá tùy chỉnh (Slider 2 đầu từ 0 đến 100+ triệu đồng).
  - Lọc theo Tình trạng: Còn hàng (`inStock`), Đang giảm giá (`onSale`), Sản phẩm HOT (`hot`).
  - Lọc theo Đánh giá sao (Từ 4 sao trở lên, 5 sao).
- **Bộ trích xuất Thông số Phần cứng Động (Dynamic Hardware Extractors)**:
  - `extractProductCpu(p)`: Phân tích trường thông số hoặc tên máy để phân loại chip: Intel Ultra 9/7/5, Core i9/i7/i5/i3, AMD Ryzen 9/7/5/3, Apple M-Series, Snapdragon X...
  - `extractProductRam(p)`: Tự động gom nhóm dung lượng RAM: 8GB, 16GB, 32GB, 64GB...
  - `extractProductGpu(p)`: Gom nhóm card đồ họa: RTX 4090, 4080, 4070, 4060, 4050, Card Onboard...
  - `extractProductScreen(p)`: Phân loại kích thước màn hình: 13.3", 14", 15.6", 16", 17.3"...
- **Chế độ hiển thị & Sắp xếp**:
  - Chuyển đổi linh hoạt giữa dạng lưới (Grid View) và dạng danh sách (List View).
  - Sắp xếp theo: Phổ biến nhất, Giá thấp đến cao, Giá cao đến thấp, Giảm giá nhiều nhất, Đánh giá cao nhất.
  - Phân trang chuẩn với `PAGE_SIZE = 28` sản phẩm/trang.

---

### 3.4. Trang Chi tiết Sản phẩm (`app/(client)/product/[id]/page.tsx`)
Trang chi tiết sản phẩm cung cấp đầy đủ thông tin để thuyết phục khách hàng ra quyết định mua sắm:
- **`ProductGallery.tsx`**: Bộ sưu tập hình ảnh góc cạnh của sản phẩm, hỗ trợ zoom kính lúp chi tiết khi rê chuột và xem ảnh dạng lightbox.
- **`ProductDetailInteractive.tsx` (21KB)**:
  - **Lựa chọn biến thể (Variants)**: Cho phép chuyển đổi giữa các phiên bản cấu hình (ví dụ: RAM 16GB • SSD 512GB $\rightarrow$ RAM 32GB • SSD 1TB) và các phiên bản màu sắc với giá tiền và số lượng tồn kho cập nhật tự động.
  - **Combo Phụ kiện tương thích**: Hiển thị các phụ kiện thường mua cùng (chuột, túi chống sốc, hub chuyển đổi) với giá ưu đãi khi mua kèm máy chính.
- **`AddToCart.tsx`**:
  - Nút **"Thêm vào giỏ hàng"**: Thêm sản phẩm kèm hiệu ứng hoạt hình bay vào giỏ.
  - Nút **"Mua ngay"**: Tự động thêm vào giỏ và chuyển hướng ngay tới trang thanh toán `/checkout`.
- **Module AI Đề xuất Sản phẩm Thông minh**:
  - `RecommendationCarousel.tsx`: Thiết kế carousel đặc biệt — **khóa cố định sản phẩm phù hợp nhất (`BEST`) ở ô đầu tiên**, các sản phẩm còn lại trượt mượt mà bằng Embla Carousel.
  - `AiRecommendedCard.tsx`: Card hiển thị huy hiệu nổi bật (`BEST`: "Phù hợp nhất", `CHOICE`: "Đáng chọn"), dòng lý do so sánh cấu hình và giá viết bằng tiếng Việt (ví dụ: *"Rẻ hơn 1.200.000 đ, cấu hình mạnh hơn"*), và 5 thông số kỹ thuật then chốt (`keySpecs`).
- **`ProductReviewsSection.tsx` (38KB)**:
  - Thống kê sao trung bình (ví dụ: 4.8 / 5.0) và biểu đồ phân bổ % đánh giá từ 1 sao đến 5 sao.
  - Danh sách đánh giá của khách hàng: Badge "Đã mua hàng", số lượt thích bình luận (`likes_count`), hình ảnh thực tế đính kèm.
  - Hiển thị phản hồi chính thức từ Admin (`admin_reply`) có tick xanh.
  - Form gửi đánh giá: Chấm điểm sao, chọn các thẻ tag nhanh (*"Giao hàng nhanh"*, *"Đóng gói cẩn thận"*...), tải ảnh đính kèm và gửi kiểm duyệt.

---

### 3.5. Quy trình Đặt hàng & Thanh toán (`cart/`, `checkout/`, `payment/result/`)
- **Trang Giỏ hàng (`app/(client)/cart/page.tsx`)**:
  - Xem danh sách sản phẩm, giá gốc, giá ưu đãi, kiểm tra tình trạng còn hàng.
  - Nhập mã voucher/coupon giảm giá.
  - Bảng tổng kết chi phí: Tiền hàng, số tiền tiết kiệm, phí vận chuyển (miễn phí ship nếu đạt ngưỡng `FREE_SHIP_THRESHOLD = 500.000 đ`), tổng tiền cuối cùng.
- **Trang Thanh toán (`app/(client)/checkout/page.tsx` — 55KB)**:
  - **Thông tin nhận hàng**: Form nhập họ tên, số điện thoại, ghi chú giao hàng.
  - **Địa giới Hành chính 3 cấp**: Tích hợp dữ liệu từ `lib/provinces-api.ts` hỗ trợ chọn động **Tỉnh/Thành phố $\rightarrow$ Quận/Huyện $\rightarrow$ Phường/Xã**.
  - **Phương thức thanh toán**:
    1. `COD`: Thanh toán tiền mặt khi nhận hàng.
    2. `VNPAY`: Thanh toán online qua Cổng thanh toán quốc gia VNPAY (quét mã QR ngân hàng, thẻ ATM nội địa, thẻ quốc tế Visa/MasterCard).
- **Trang Kết quả Thanh toán (`app/(client)/payment/result/page.tsx`)**:
  - Tiếp nhận callback từ VNPAY qua các tham số URL (`vnp_ResponseCode`, `vnp_TxnRef`, `vnp_Amount`, `vnp_OrderInfo`).
  - Kiểm tra nếu `vnp_ResponseCode == "00"`: Đơn hàng thành công, hiển thị mã đơn, gọi server route `/api/orders/confirm-payment` để cập nhật trạng thái đơn hàng và kích hoạt `mailer.ts` gửi email hóa đơn chi tiết cho khách hàng.

---

### 3.6. Lịch sử Đơn hàng & Hồ sơ Người dùng (`orders/`, `UserProfileModal.tsx`)
- **`app/(client)/orders/page.tsx`**:
  - Danh sách toàn bộ đơn hàng của tài khoản theo các tab trạng thái: Tất cả, Chờ xử lý (`PENDING`), Đã xác nhận (`CONFIRMED`), Đang giao (`SHIPPING`), Đã giao (`DELIVERED`), Đã huỷ (`CANCELLED`).
  - Hỗ trợ xem chi tiết tiến trình vận chuyển đơn hàng và nút **"Huỷ đơn"** nếu đơn chưa được giao.
- **`components/UserProfileModal.tsx` (39KB)**:
  - Modal cập nhật thông tin cá nhân (Họ tên, số điện thoại, ngày sinh, giới tính).
  - Tải lên ảnh đại diện Avatar mới.
  - Đổi mật khẩu tài khoản (yêu cầu mật khẩu cũ và xác thực mật khẩu mới).
  - Quản lý sổ địa chỉ giao hàng mặc định.

---

### 3.7. Trợ lý AI Tư vấn Bán hàng (`components/Chat.tsx` & `ChatWindow.tsx`)
- Nút tròn nổi ở góc dưới bên phải màn hình với hiệu ứng gradient emerald sang trọng.
- Cho phép khách hàng nhắn tin hỏi về thông tin cấu hình laptop, so sánh máy, hỏi chính sách đổi trả/bảo hành với AI Chatbot.

---

## 4. Phân hệ Quản trị (Admin Portal — `app/(admin)/admin/`)

Phân hệ dành riêng cho ban quản trị và nhân viên vận hành hệ thống:

- **`layout.tsx` (15KB)**: Bố cục quản trị với Sidebar điều hướng, Topbar hiển thị thông tin Admin đăng nhập, nút chuyển nhanh về trang bán hàng và nút Đăng xuất.
- **Dashboard Tổng quan (`admin/page.tsx` — 20KB)**:
  - Thẻ thống kê KPI: Tổng số sản phẩm, Tổng giá trị tồn kho (VND), Số sản phẩm sắp hết hàng (`LOW_STOCK <= 5`), Số sản phẩm hết hàng (`OUT_OF_STOCK`).
  - Biểu đồ phân bổ số lượng tồn kho theo từng danh mục thiết bị.
  - Bảng cảnh báo các sản phẩm có nguy cơ đứt hàng để quản trị viên kịp nhập kho.
- **Quản lý Sản phẩm (`admin/products`)**:
  - Xem danh sách sản phẩm, tìm kiếm theo tên/SKU/danh mục.
  - Thêm mới / Cập nhật sản phẩm: Nhập thông tin cơ bản, chọn danh mục, giá bán, giá gốc, số lượng kho, tải ảnh lên Cloudinary qua file selector, nhập cấu hình kỹ thuật dạng JSON key-value.
  - Bật/tắt trạng thái nổi bật (`featured`), hàng hot (`hot`), ẩn/hiện sản phẩm (`active`).
- **Quản lý Danh mục (`admin/categories`)**:
  - Thêm, sửa, xoá danh mục hàng hóa, quản lý slug thân thiện SEO và thứ tự hiển thị (`displayOrder`).
- **Quản lý Đơn hàng (`admin/orders`)**:
  - Tra cứu đơn hàng theo mã đơn, tên khách hàng, số điện thoại.
  - Cập nhật tiến độ đơn hàng: Chuyển trạng thái từ `PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `SHIPPING` $\rightarrow$ `DELIVERED` hoặc `CANCELLED`.
- **Quản lý Người dùng (`admin/users`)**:
  - Danh sách tài khoản đã đăng ký trong hệ thống, phân quyền vai trò (`ROLE_USER`, `ROLE_ADMIN`), khoá hoặc mở khoá tài khoản.
- **Kiểm duyệt Đánh giá (`admin/reviews`)**:
  - Duyệt các đánh giá mới của khách hàng (`APPROVED` hoặc `REJECTED`).
  - Trả lời đánh giá của khách hàng (`admin_reply`), câu trả lời sẽ xuất hiện trên trang chi tiết sản phẩm với nhãn đại diện cửa hàng.
- **Quản lý Tin tức / Blog (`admin/blogs`)**:
  - Soạn thảo bài viết công nghệ mới, chọn danh mục blog, tác giả và gắn ảnh bìa bài viết.

---

## 5. Tầng Tích hợp API & Dịch vụ (`frontend/lib/`)

Thư mục `lib/` chứa toàn bộ logic kết nối backend, xử lý nghiệp vụ trung gian:

| Tệp tin | Vai trò & Danh sách các hàm chính |
| :--- | :--- |
| **[lib/api.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib/api.ts)** | **API lõi Client**: <br>- `getProducts(params)`: Lấy danh sách sản phẩm có phân trang, lọc.<br>- `getProductBySlug(slug)`: Lấy chi tiết sản phẩm.<br>- `getCategories()`: Lấy danh mục.<br>- `searchProducts(keyword)`: Tìm kiếm sản phẩm theo text.<br>- `searchProductsByImage(file, topK)`: Tìm kiếm bằng hình ảnh qua AI.<br>- `getAiRecommendations(productId, limit)`: Lấy đề xuất AI 3 tầng từ backend. |
| **[lib/auth.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib/auth.ts)** | **Xác thực & Phiên**: <br>- `getToken()` / `setToken(token)` / `clearToken()`: Quản lý access token.<br>- `getStoredUser()` / `setStoredUser(user)`: Quản lý thông tin user.<br>- `saveUserProfile(profile)` / `getSavedUserProfile()`: Quản lý cache hồ sơ cá nhân. |
| **[lib/cart-api.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib/cart-api.ts)** | **API Giỏ hàng**: <br>- `getCart()`: Lấy dữ liệu giỏ hàng người dùng từ server.<br>- `addCartItem(productId, quantity)`: Thêm món vào giỏ.<br>- `updateCartItemQuantity(itemId, quantity)`: Cập nhật số lượng.<br>- `removeCartItem(itemId)`: Xoá món khỏi giỏ.<br>- `clearCartApi()`: Dọn sạch giỏ hàng. |
| **[lib/orders-api.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib/orders-api.ts)** | **API Đơn hàng & Thanh toán**: <br>- `createOrder(payload)`: Tạo đơn hàng mới.<br>- `getOrders(params)`: Lấy lịch sử đơn hàng của người dùng.<br>- `getOrderById(orderId)`: Xem chi tiết 1 đơn hàng.<br>- `cancelOrder(orderId, reason)`: Huỷ đơn hàng.<br>- `createOrGetPayment(orderId, method)`: Khởi tạo giao dịch thanh toán (sinh URL chuyển hướng sang cổng VNPay). |
| **[lib/reviews-api.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib/reviews-api.ts)** | **API Đánh giá sản phẩm**: <br>- `fetchProductReviews(productId, params)`: Lấy danh sách review đã duyệt.<br>- `submitProductReview(productId, payload)`: Gửi đánh giá mới.<br>- `likeProductReview(reviewId)`: Thả like cho đánh giá.<br>- `checkReviewEligibility(productId)`: Kiểm tra khách đã mua hàng hay chưa để cấp quyền đánh giá. |
| **[lib/admin-*.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib)** | **Bộ API Quản trị**: <br>- `admin-products.ts`: Lấy toàn bộ sản phẩm cho admin, cập nhật kho.<br>- `admin-orders-api.ts`: Danh sách và cập nhật trạng thái đơn hàng.<br>- `admin-users-api.ts`: Quản lý danh sách người dùng và quyền hạn.<br>- `admin-blog-api.ts`: CRUD bài viết tin tức. |
| **[lib/provinces-api.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib/provinces-api.ts)** | **Dữ liệu Địa lý Việt Nam**: <br>- Tích hợp dữ liệu từ `data/provinces-*.json`, `districts-*.json`, `wards-*.json`. Cung cấp các hàm tìm kiếm Tỉnh/Thành, Quận/Huyện, Xã/Phường phục vụ form giao hàng checkout. |
| **[lib/mailer.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib/mailer.ts)** | **Gửi Email Tự động qua Nodemailer**: <br>- `sendOrderConfirmationEmail(...)`: Tạo template HTML hóa đơn đẹp mắt, gửi email xác nhận đặt hàng thành công đến hòm thư của khách hàng.<br>- `sendPasswordResetOtpEmail(...)`: Gửi mã OTP xác thực quên mật khẩu. |
| **[lib/tab-sync.ts](file:///c:/Users/Song/Desktop/techwiseai/frontend/lib/tab-sync.ts)** | **Đồng bộ Đa Tab**: <br>- `broadcastTabEvent(event)`: Phát sự kiện tới tất cả các tab khác.<br>- `subscribeTabSync(handler)`: Đăng ký lắng nghe sự kiện đồng bộ từ các tab khác. |

---

## 6. BFF Route Handlers (`frontend/app/api/`)

Các Route Handler của Next.js đóng vai trò bảo mật và làm trung gian giữa Client và Java Spring Boot Backend:

1. **`app/api/auth/[...path]/route.ts`**: Tiếp nhận request login/register, lưu JWT token vào HTTP-Only cookie an toàn chống tấn công XSS.
2. **`app/api/cart/[...path]/route.ts`**: Chuyển tiếp các thao tác giỏ hàng, tự động trích xuất Bearer Token từ cookie/header gửi tới Spring Boot.
3. **`app/api/orders/[...path]/route.ts`**: Tiếp nhận tạo đơn hàng, huỷ đơn và xác nhận thanh toán.
4. **`app/api/payments/vnpay/[...path]/route.ts`**: Xử lý tạo link thanh toán VNPay và tiếp nhận IPN callback bảo mật.
5. **`app/api/products/[...path]/route.ts`**: Chuyển tiếp các truy vấn tìm kiếm sản phẩm, tìm kiếm ảnh AI và lấy chi tiết.
6. **`app/api/reviews/[...path]/route.ts`**: Proxy chuyển tiếp các thao tác gửi/đọc đánh giá.

---

## 7. Hướng dẫn Khởi chạy & Kiểm thử Phân hệ Frontend

### Cài đặt dependencies:
```powershell
cd c:\Users\Song\Desktop\techwiseai\frontend
npm install
```

### Chạy chế độ phát triển (Development Mode):
```powershell
npm run dev
```
- Ứng dụng sẽ chạy tại địa chỉ: **[http://localhost:3000](http://localhost:3000)**.
- Đăng nhập quyền Admin kiểm tra trang quản trị tại: **[http://localhost:3000/admin](http://localhost:3000/admin)**.

### Kiểm tra build production bundle:
```powershell
npm run build
```

---

## 8. Cấu trúc Phân loại Component theo Cụm Chức năng (Feature-based Architecture)

Toàn bộ 56 component trong thư mục `frontend/components/` đã được phân loại và tái cấu trúc thành 9 cụm module chức năng chuyên biệt, đi kèm cơ chế **Backward Compatibility (tương thích ngược 100%)**:

```
frontend/components/
├── layout/                 # Bố cục điều hướng toàn trang (Header, Footer, MegaMenu, Logo...)
├── home/                   # Các khối chức năng Trang chủ (Banner, FlashSale, Combos, Brands...)
├── product/                # Sản phẩm (ProductCard, Grid, Gallery, Reviews, AI Recommend, Shop...)
├── cart/                   # Giỏ hàng & Nút mua (AddToCart, CartIcon)
├── compare/                # So sánh sản phẩm (CompareButton, Drawer, Modal)
├── search/                 # Tìm kiếm đa phương thức (SearchBar)
├── chatbot/                # Trợ lý AI tư vấn (Chat, ChatWindow)
├── auth/                   # Tài khoản, Phân quyền & Phiên (SignIn, UserMenu, UserProfileModal...)
├── common/                 # Tiện ích chung (Container, ScrollToTop, ServiceFeatures...)
└── ui/                     # UI Primitives nguyên tử (Shadcn: button, dialog, input...)
```

### Các cách import linh hoạt được hỗ trợ:
1. **Import theo đường dẫn mới cụ thể**:
   ```typescript
   import ProductCard from "@/components/product/ProductCard";
   import Header from "@/components/layout/Header";
   ```
2. **Import qua Barrel module con**:
   ```typescript
   import { ProductCard, ProductGrid, ProductReviewsSection } from "@/components/product";
   import { Header, Footer, MegaMenu } from "@/components/layout";
   import { AddToCart, CartIcon } from "@/components/cart";
   ```
3. **Import qua Master Barrel tổng**:
   ```typescript
   import { ProductCard, Header, SearchBar, AddToCart } from "@/components";
   ```
4. **Tương thích ngược với code cũ (Zero Breakage)**:
   Các file tại gốc `components/<Name>.tsx` đóng vai trò re-export stub tự động chuyển tiếp tới thư mục con tương ứng, đảm bảo mọi đoạn code cũ import kiểu `import ProductCard from "@/components/ProductCard"` vẫn hoạt động trơn tru 100% mà không bị lỗi.

