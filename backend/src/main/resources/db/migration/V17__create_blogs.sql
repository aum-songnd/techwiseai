-- ============================================================================
-- V17__create_blogs.sql
-- Create blog categories, authors, blogs and mappings tables with seed data
-- ============================================================================

CREATE TABLE blog_categories (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_blog_categories_slug UNIQUE (slug)
);

CREATE TABLE blog_authors (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    image_url VARCHAR(1000),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_blog_authors_slug UNIQUE (slug)
);

CREATE TABLE blogs (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    author_id VARCHAR(100) NOT NULL,
    main_image_url VARCHAR(1000),
    published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_latest BOOLEAN NOT NULL DEFAULT FALSE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_blogs_slug UNIQUE (slug),
    CONSTRAINT fk_blogs_author FOREIGN KEY (author_id) REFERENCES blog_authors (id) ON DELETE RESTRICT
);

CREATE TABLE blog_category_mappings (
    blog_id VARCHAR(100) NOT NULL,
    category_id VARCHAR(100) NOT NULL,
    PRIMARY KEY (blog_id, category_id),
    CONSTRAINT fk_mapping_blog FOREIGN KEY (blog_id) REFERENCES blogs (id) ON DELETE CASCADE,
    CONSTRAINT fk_mapping_category FOREIGN KEY (category_id) REFERENCES blog_categories (id) ON DELETE CASCADE
);

CREATE INDEX idx_blogs_slug ON blogs(slug);
CREATE INDEX idx_blogs_author_id ON blogs(author_id);
CREATE INDEX idx_blogs_published_at ON blogs(published_at DESC);
CREATE INDEX idx_blogs_is_latest ON blogs(is_latest);

-- ============================================================================
-- Seed data
-- ============================================================================
INSERT INTO blog_categories (id, title, slug, description) VALUES ('blogcat-tech', 'Công nghệ', 'cong-nghe', 'Tin tức và xu hướng công nghệ mới nhất.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_categories (id, title, slug, description) VALUES ('blogcat-review', 'Đánh giá sản phẩm', 'danh-gia-san-pham', 'Review chi tiết các sản phẩm điện tử.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_categories (id, title, slug, description) VALUES ('blogcat-tips', 'Mẹo vặt', 'meo-vat', 'Mẹo sử dụng thiết bị công nghệ hiệu quả hơn.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_authors (id, name, slug, image_url, bio) VALUES ('author-minh', 'Trần Anh Minh', 'tran-anh-minh', 'https://placehold.co/150x150?text=Minh', 'Biên tập viên công nghệ với hơn 5 năm kinh nghiệm review thiết bị điện tử.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_authors (id, name, slug, image_url, bio) VALUES ('author-lan', 'Nguyễn Thị Lan', 'nguyen-thi-lan', 'https://placehold.co/150x150?text=Lan', 'Chuyên viết về xu hướng công nghệ và trải nghiệm người dùng.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blogs (id, title, slug, author_id, main_image_url, published_at, is_latest, body) VALUES ('blog-review-iphone-15', 'Đánh giá chi tiết iPhone 16 Pro Max sau 1 tháng sử dụng', 'danh-gia-iphone-16-pro-max', 'author-minh', 'https://talkingtechandaudio.com/wp-content/uploads/2024/08/Header-1.jpg', '2026-06-14T18:00:00.000Z', TRUE, 'Sau một tháng dùng iPhone 16 Pro Max làm máy chính, cảm nhận rõ nhất là sự cân bằng giữa sức mạnh và độ gọn gàng. Khung titan giúp máy nhẹ hơn thế hệ trước khoảng 19 gram, cầm một tay lâu không còn mỏi như trước, dù màn hình 6,7 inch vẫn khá lớn.
Về hiệu năng, chip A17 Pro xử lý mượt mọi tác vụ từ lướt web, chỉnh video 4K đến chơi game đồ họa nặng. Máy có nóng lên khi chơi game liên tục trên 30 phút, nhưng không bị giảm hiệu năng đáng kể. Khi dùng bình thường, máy gần như không nóng.
Camera là điểm sáng lớn nhất. Ống kính zoom quang học 5x cho ảnh chân dung và ảnh chụp xa rất sắc nét, đặc biệt hữu ích khi đi du lịch hoặc chụp sự kiện. Chế độ chụp đêm cũng cho ảnh sáng, ít nhiễu hơn rõ rệt so với iPhone 13 Pro.
Về pin, mình dùng khoảng 7 đến 8 tiếng màn hình sáng mỗi ngày và máy vẫn còn 15 đến 20% khi đi ngủ. Cổng USB-C là thay đổi tiện lợi: một sợi cáp dùng được cho cả laptop, tai nghe và sạc dự phòng.
Kết luận: nếu bạn đang dùng iPhone 12 hoặc cũ hơn, đây là bản nâng cấp đáng tiền. Còn nếu đang dùng iPhone 14 Pro, bạn có thể cân nhắc chờ thêm một thế hệ nữa.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-review-iphone-15', 'blogcat-review') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-review-iphone-15', 'blogcat-tech') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blogs (id, title, slug, author_id, main_image_url, published_at, is_latest, body) VALUES ('blog-tips-pin-dien-thoai', '5 mẹo giúp pin điện thoại của bạn bền hơn', '5-meo-pin-dien-thoai-ben-hon', 'author-lan', 'https://images2.thanhnien.vn/thumb_w/640/528068263637045248/2024/7/9/2-1720516330728337412757.jpg', '2026-07-02T10:30:00.000Z', TRUE, 'Pin lithium-ion hao mòn theo số chu kỳ sạc và nhiệt độ. Bạn không thể ngăn pin chai hoàn toàn, nhưng có thể làm chậm quá trình này bằng vài thói quen đơn giản.
Mẹo 1: Giữ mức pin trong khoảng 20 đến 80% khi có thể. Sạc đầy 100% rồi xả cạn về 0% liên tục sẽ khiến pin chai nhanh hơn.
Mẹo 2: Tránh để máy nóng. Không vừa sạc vừa chơi game nặng, không để điện thoại dưới nắng gắt hoặc trong xe đóng kín. Nhiệt độ cao là kẻ thù số một của pin.
Mẹo 3: Hạn chế sạc qua đêm. Hầu hết điện thoại đều có chế độ sạc tối ưu, hãy bật tính năng này để máy dừng ở 80% rồi mới sạc tiếp trước giờ bạn thức dậy.
Mẹo 4: Dùng bộ sạc chính hãng hoặc đạt chuẩn. Sạc kém chất lượng có thể cấp điện áp không ổn định, gây hại cho pin và cả mạch sạc.
Mẹo 5: Giảm độ sáng màn hình và tắt các ứng dụng chạy nền không cần thiết. Màn hình luôn là phần tiêu thụ điện nhiều nhất trên điện thoại.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-tips-pin-dien-thoai', 'blogcat-tips') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blogs (id, title, slug, author_id, main_image_url, published_at, is_latest, body) VALUES ('blog-chon-tai-nghe-khong-day', 'Cách chọn tai nghe không dây phù hợp với nhu cầu', 'cach-chon-tai-nghe-khong-day', 'author-lan', 'https://cdn.tgdd.vn//News/1411767//41-730x408.jpg', '2026-07-10T09:15:00.000Z', TRUE, 'Thị trường tai nghe không dây hiện có hàng trăm mẫu, từ vài trăm nghìn đến vài triệu đồng. Để không chọn nhầm, hãy bắt đầu từ việc xác định bạn dùng tai nghe để làm gì.
Nếu bạn hay đi lại bằng tàu xe hoặc làm việc ở nơi ồn, tính năng chống ồn chủ động (ANC) rất đáng đầu tư. Với người chủ yếu nghe nhạc ở nhà hoặc văn phòng yên tĩnh, tai nghe không ANC với giá mềm hơn vẫn đủ dùng.
Thời lượng pin cũng quan trọng. Hãy xem thời lượng của riêng tai nghe và tổng thời lượng khi tính cả hộp sạc. Mức 6 đến 8 tiếng mỗi lần sạc là hợp lý cho một ngày làm việc.
Cuối cùng là độ vừa tai. Tai nghe chụp tai thoải mái khi đeo lâu, còn loại nhét tai gọn nhẹ và dễ mang theo. Nếu có thể, hãy thử trực tiếp trước khi mua.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-chon-tai-nghe-khong-day', 'blogcat-tips') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-chon-tai-nghe-khong-day', 'blogcat-tech') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blogs (id, title, slug, author_id, main_image_url, published_at, is_latest, body) VALUES ('blog-laptop-van-phong-2026', 'Top laptop văn phòng mỏng nhẹ đáng mua năm 2026', 'top-laptop-van-phong-2026', 'author-minh', 'https://images.openai.com/static-rsc-4/JPM4trCVNb23yLOWXSaZykcdGLU1QNYw9s-ObCyJvD_abKQ-vrqaTaVDzdxbmpkJRQKN64f5THpKlPFriSBTa76_7UlFRDWfdKfNZEmUIP9BlQFXxcsCBshP5918vcujQnz8Yv0BvcqFI7lXrc_rfGpK3QsLTdjvTWC-tJVrvJA?purpose=inline', '2026-07-18T14:00:00.000Z', TRUE, 'Laptop văn phòng năm nay có một xu hướng rõ rệt: mỏng hơn, nhẹ hơn nhưng pin lại trâu hơn nhờ chip tiết kiệm điện. Nhiều mẫu nặng dưới 1,3 kg và dùng được cả ngày làm việc mà không cần cắm sạc.
Khi chọn, bạn nên ưu tiên RAM tối thiểu 16 GB để mở nhiều tab và ứng dụng cùng lúc mà không bị chậm. Ổ SSD 512 GB là mức vừa đủ cho tài liệu, ảnh và các phần mềm thông dụng.
Màn hình cũng đáng được quan tâm. Tấm nền IPS độ sáng từ 300 nit trở lên giúp bạn làm việc thoải mái cả khi ngồi gần cửa sổ. Tỷ lệ 16:10 cho thêm không gian hiển thị theo chiều dọc, rất tiện khi đọc và soạn tài liệu.
Đừng quên bàn phím và touchpad, vì đây là hai bộ phận bạn chạm vào nhiều nhất. Hành trình phím vừa phải, đèn nền và touchpad rộng sẽ giúp trải nghiệm gõ phím dễ chịu hơn nhiều so với các thông số trên giấy.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-laptop-van-phong-2026', 'blogcat-review') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blogs (id, title, slug, author_id, main_image_url, published_at, is_latest, body) VALUES ('blog-bao-ve-man-hinh', 'Có nên dán cường lực và ốp lưng cho điện thoại cao cấp?', 'co-nen-dan-cuong-luc-va-op-lung', 'author-lan', 'https://cdn.tgdd.vn/Files/2023/02/28/1513339/nhung-ly-do-khong-nen-dan-mieng-cuong-luc-cho-dien16-1280x720-280223-215855-800-resize.jpg', '2026-07-25T11:00:00.000Z', FALSE, 'Nhiều người nghĩ rằng điện thoại đời mới có kính siêu bền nên không cần phụ kiện bảo vệ. Thực tế, kính vẫn có thể nứt khi rơi vào góc cạnh, và chi phí thay màn hình các dòng cao cấp thường rất cao.
Kính cường lực giúp hấp thụ lực va đập và chống trầy xước do chìa khóa hay tiền xu trong túi. Hãy chọn loại có lớp chống vân tay và độ trong tốt để không làm giảm chất lượng hiển thị.
Ốp lưng bảo vệ khung máy và camera, nơi thường bị hư hại nhất khi rơi. Ốp trong suốt giữ được vẻ ngoài của máy, còn ốp chống sốc phù hợp nếu bạn hay làm việc ngoài trời.
Chi phí cho cả hai thường chỉ bằng một phần rất nhỏ so với giá sửa chữa, nên với điện thoại cao cấp, đây là khoản đầu tư hợp lý.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-bao-ve-man-hinh', 'blogcat-tips') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blogs (id, title, slug, author_id, main_image_url, published_at, is_latest, body) VALUES ('blog-xu-huong-cong-nghe-2026', 'Những xu hướng công nghệ nổi bật nửa cuối năm 2026', 'xu-huong-cong-nghe-2026', 'author-minh', 'https://i1-vnexpress.vnecdn.net/2025/12/31/AI-1-jpeg-1767188210-4503-1767190414.jpg?w=1020&h=0&q=100&dpr=1&fit=crop&s=IWangiw7bPpejD_QR9lngg', '2026-08-10T09:00:00.000Z', FALSE, 'AI tạo sinh tiếp tục len lỏi vào mọi thiết bị, từ điện thoại đến laptop. Nhiều tính năng như tóm tắt văn bản, dịch hội thoại trực tiếp hay chỉnh ảnh bằng câu lệnh giờ được xử lý ngay trên máy, không cần gửi dữ liệu lên đám mây.
Bên cạnh đó, các hãng đẩy mạnh sạc nhanh và pin bền hơn. Nhiều mẫu điện thoại mới có thể sạc đầy trong chưa đến 30 phút, đồng thời cam kết pin giữ trên 80% dung lượng sau vài năm sử dụng.
Vật liệu bền vững cũng trở thành điểm nhấn. Nhôm và nhựa tái chế được dùng rộng rãi hơn, cùng với bao bì giảm nhựa và chính sách thu cũ đổi mới để hạn chế rác thải điện tử.
Cuối cùng, kết nối không dây tiếp tục được nâng cấp với Wi-Fi 7 phổ biến hơn trên router và thiết bị di động, mang lại tốc độ cao và độ trễ thấp hơn cho cả công việc lẫn giải trí.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-xu-huong-cong-nghe-2026', 'blogcat-tech') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blogs (id, title, slug, author_id, main_image_url, published_at, is_latest, body) VALUES ('blog-smartwatch-suc-khoe', 'Smartwatch theo dõi sức khỏe: nên chọn tính năng nào?', 'smartwatch-theo-doi-suc-khoe', 'author-lan', 'https://cdn-media.sforum.vn/storage/app/media/ctv_seo3/dong-ho-theo-doi-giac-ngu-1.jpg', '2026-08-15T08:30:00.000Z', TRUE, 'Đồng hồ thông minh ngày nay không chỉ xem giờ và nhận thông báo, mà còn đo nhịp tim, theo dõi giấc ngủ và nhắc bạn vận động. Tuy nhiên, không phải tính năng nào cũng thật sự cần thiết với mọi người.
Nếu bạn tập luyện thường xuyên, hãy ưu tiên GPS tích hợp và cảm biến nhịp tim chính xác. Hai tính năng này giúp ghi lại quãng đường, tốc độ và cường độ tập mà không cần mang theo điện thoại.
Với người quan tâm đến giấc ngủ, hãy xem thiết bị có phân tích các giai đoạn ngủ nông, ngủ sâu và thời gian thức giấc hay không. Dữ liệu này hữu ích để điều chỉnh giờ đi ngủ hợp lý hơn.
Pin cũng là yếu tố đáng cân nhắc. Đồng hồ dùng được 5 đến 7 ngày sẽ tiện hơn nhiều so với loại phải sạc mỗi đêm, nhất là khi bạn muốn theo dõi giấc ngủ.
Lưu ý quan trọng: các số liệu từ smartwatch chỉ mang tính tham khảo, không thay thế cho thiết bị y tế hay lời khuyên của bác sĩ.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-smartwatch-suc-khoe', 'blogcat-tech') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-smartwatch-suc-khoe', 'blogcat-tips') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blogs (id, title, slug, author_id, main_image_url, published_at, is_latest, body) VALUES ('blog-ve-sinh-laptop', 'Cách vệ sinh laptop tại nhà đúng cách và an toàn', 'cach-ve-sinh-laptop-tai-nha', 'author-minh', 'https://maytinhcdc.vn/media/news/1961-thumb.jpg', '2026-08-22T09:00:00.000Z', TRUE, 'Bụi bẩn tích tụ lâu ngày khiến laptop nóng hơn, quạt kêu to hơn và hiệu năng giảm sút. Vệ sinh định kỳ khoảng 6 tháng một lần giúp máy hoạt động ổn định và bền hơn.
Trước tiên, hãy tắt máy hoàn toàn, rút sạc và tháo pin nếu máy cho phép. Không bao giờ lau máy khi còn đang cắm điện hoặc đang bật.
Với màn hình, dùng khăn microfiber hơi ẩm và lau nhẹ theo một chiều. Tuyệt đối không xịt nước trực tiếp lên màn hình, vì chất lỏng có thể thấm vào bên trong.
Với bàn phím và khe tản nhiệt, bạn có thể dùng chổi mềm hoặc bình xịt khí nén để thổi bụi ra. Giữ bình thẳng đứng và xịt từng đợt ngắn để tránh hơi lạnh làm hỏng linh kiện.
Nếu máy vẫn nóng sau khi vệ sinh bên ngoài, có thể đã đến lúc thay keo tản nhiệt. Việc này nên nhờ kỹ thuật viên nếu bạn chưa quen tháo máy.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-ve-sinh-laptop', 'blogcat-tips') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blogs (id, title, slug, author_id, main_image_url, published_at, is_latest, body) VALUES ('blog-xac-thuc-hai-lop', 'Vì sao bạn nên bật xác thực hai lớp cho mọi tài khoản?', 'bat-xac-thuc-hai-lop', 'author-minh', 'https://cafefcdn.com/203337114487263232/2025/8/18/gettyimages-1397050811-1-1755501487209-17555014889031765586656.jpg', '2026-09-01T10:00:00.000Z', TRUE, 'Mật khẩu mạnh vẫn có thể bị lộ qua các vụ rò rỉ dữ liệu hoặc email lừa đảo. Xác thực hai lớp (2FA) thêm một bước kiểm tra nữa, giúp kẻ xấu khó chiếm tài khoản của bạn dù đã biết mật khẩu.
Có ba cách xác thực phổ biến: mã gửi qua tin nhắn, mã tạo bởi ứng dụng xác thực và khóa bảo mật vật lý. Ứng dụng xác thực an toàn hơn tin nhắn, còn khóa bảo mật là lựa chọn mạnh nhất.
Hãy bật 2FA trước cho những tài khoản quan trọng nhất: email, ngân hàng, mạng xã hội và kho lưu trữ đám mây. Nếu email bị chiếm, kẻ xấu có thể đặt lại mật khẩu của hầu hết các dịch vụ khác.
Đừng quên lưu mã dự phòng ở nơi an toàn. Khi mất điện thoại, những mã này sẽ giúp bạn lấy lại quyền truy cập mà không phải chờ hỗ trợ.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-xac-thuc-hai-lop', 'blogcat-tips') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-xac-thuc-hai-lop', 'blogcat-tech') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blogs (id, title, slug, author_id, main_image_url, published_at, is_latest, body) VALUES ('blog-may-anh-mirrorless', 'Máy ảnh mirrorless cho người mới bắt đầu: chọn thế nào?', 'may-anh-mirrorless-cho-nguoi-moi', 'author-lan', 'https://cellphones.com.vn/sforum/wp-content/uploads/2023/05/may-anh-cho-nguoi-moi-choi.jpg', '2026-09-08T14:30:00.000Z', FALSE, 'Máy ảnh mirrorless ngày càng phổ biến vì nhỏ gọn hơn máy DSLR nhưng vẫn cho chất lượng ảnh vượt trội so với điện thoại, nhất là khi chụp thiếu sáng hoặc cần xóa phông tự nhiên.
Khi mới bắt đầu, bạn không cần cảm biến quá lớn. Cảm biến APS-C cho chất lượng ảnh rất tốt, giá dễ tiếp cận và ống kính cũng nhỏ nhẹ hơn so với dòng full-frame.
Hãy chú ý đến hệ thống lấy nét tự động. Tính năng nhận diện khuôn mặt và mắt giúp bạn chụp chân dung, trẻ em hay thú cưng dễ hơn rất nhiều, ngay cả khi chưa có nhiều kinh nghiệm.
Ống kính kit đi kèm thường đủ cho những tháng đầu làm quen. Sau đó, một ống kính 50mm khẩu độ lớn là khoản đầu tư đáng giá để chụp chân dung và xóa phông đẹp với chi phí hợp lý.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-may-anh-mirrorless', 'blogcat-review') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blogs (id, title, slug, author_id, main_image_url, published_at, is_latest, body) VALUES ('blog-sac-nhanh-gan', 'Củ sạc nhanh GaN có thực sự đáng mua?', 'cu-sac-nhanh-gan-co-dang-mua', 'author-minh', 'https://cdn-media.sforum.vn/storage/app/media/ctvseo_maihue/sac-gan-la-gi/sac-gan-la-gi-1.jpg', '2026-09-20T09:45:00.000Z', FALSE, 'GaN (gallium nitride) là vật liệu bán dẫn mới giúp củ sạc tỏa ít nhiệt hơn, nhờ đó có thể làm nhỏ gọn hơn nhiều so với củ sạc silicon truyền thống cùng công suất.
Lợi ích rõ nhất là sự tiện lợi khi di chuyển. Một củ sạc GaN 65W có thể sạc điện thoại, máy tính bảng và cả laptop mỏng nhẹ, nên bạn chỉ cần mang theo một chiếc thay vì nhiều củ sạc riêng.
Khi mua, hãy kiểm tra công suất tối đa và số cổng. Củ sạc nhiều cổng sẽ chia công suất khi cắm nhiều thiết bị cùng lúc, vì vậy hãy xem công suất của từng cổng trong trường hợp đó.
Hãy chọn sản phẩm có chứng nhận an toàn và đến từ thương hiệu uy tín. Củ sạc giá rẻ không rõ nguồn gốc có thể gây hại cho thiết bị của bạn, nên đây là món đồ không nên tiết kiệm.') ON CONFLICT (id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-sac-nhanh-gan', 'blogcat-review') ON CONFLICT (blog_id, category_id) DO NOTHING;
INSERT INTO blog_category_mappings (blog_id, category_id) VALUES ('blog-sac-nhanh-gan', 'blogcat-tech') ON CONFLICT (blog_id, category_id) DO NOTHING;
