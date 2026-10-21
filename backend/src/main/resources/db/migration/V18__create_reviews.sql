CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    user_id UUID,
    user_full_name VARCHAR(255) NOT NULL,
    user_avatar_url TEXT,
    rating INTEGER NOT NULL,
    title VARCHAR(255),
    comment TEXT NOT NULL,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
    admin_reply TEXT,
    admin_reply_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reviews_product
        FOREIGN KEY (product_id)
        REFERENCES products (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reviews_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE SET NULL,

    CONSTRAINT chk_reviews_rating
        CHECK (rating >= 1 AND rating <= 5),

    CONSTRAINT chk_reviews_likes_count
        CHECK (likes_count >= 0)
);

CREATE INDEX idx_reviews_product_id ON reviews (product_id);
CREATE INDEX idx_reviews_product_status_created ON reviews (product_id, status, created_at DESC);
CREATE INDEX idx_reviews_user_id ON reviews (user_id);
CREATE INDEX idx_reviews_rating ON reviews (rating);

-- Seed realistic reviews for top products if they exist
INSERT INTO reviews (product_id, user_full_name, rating, title, comment, is_verified_purchase, likes_count, status, admin_reply, admin_reply_at, created_at)
SELECT 
    p.id,
    'Nguyễn Văn An',
    5,
    'Sản phẩm tuyệt vời ngoài mong đợi',
    'Máy chạy rất mượt, màn hình đẹp sắc nét, pin dùng liên tục cả ngày thoải mái. Đóng gói rất kỹ càng và giao hàng nhanh. Rất đáng đồng tiền bát gạo!',
    TRUE,
    14,
    'APPROVED',
    'Cảm ơn bạn Nguyễn Văn An đã tin tưởng và ủng hộ sản phẩm tại Techwise AI! Chúc bạn có những trải nghiệm tuyệt vời.',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
FROM products p
WHERE p.slug = 'macbook-air-m3-13-inch'
LIMIT 1;

INSERT INTO reviews (product_id, user_full_name, rating, title, comment, is_verified_purchase, likes_count, status, created_at)
SELECT 
    p.id,
    'Trần Thị Mai',
    5,
    'Chất lượng tốt, thiết kế sang trọng',
    'Thiết kế nhôm nguyên khối rất sang, nhẹ nhàng mang đi học đi làm cực tiện. Loa to và rõ, bàn phím gõ êm.',
    TRUE,
    8,
    'APPROVED',
    CURRENT_TIMESTAMP - INTERVAL '5 days'
FROM products p
WHERE p.slug = 'macbook-air-m3-13-inch'
LIMIT 1;

INSERT INTO reviews (product_id, user_full_name, rating, title, comment, is_verified_purchase, likes_count, status, created_at)
SELECT 
    p.id,
    'Lê Hoàng Nam',
    4,
    'Hài lòng với hiệu năng',
    'Máy chạy êm, ít nóng. Điểm trừ nhỏ là màu Midnight hơi bám dấu vân tay một chút nhưng lau là sạch.',
    TRUE,
    3,
    'APPROVED',
    CURRENT_TIMESTAMP - INTERVAL '7 days'
FROM products p
WHERE p.slug = 'macbook-air-m3-13-inch'
LIMIT 1;

INSERT INTO reviews (product_id, user_full_name, rating, title, comment, is_verified_purchase, likes_count, status, created_at)
SELECT 
    p.id,
    'Vũ Minh Tuấn',
    5,
    'Chiến game cực đỉnh',
    'Tản nhiệt tốt, chơi các tựa game nặng FPS rất ổn định không bị tụt. Màn hình 144Hz mượt mà. Đội ngũ tư vấn rất nhiệt tình.',
    TRUE,
    11,
    'APPROVED',
    CURRENT_TIMESTAMP - INTERVAL '4 days'
FROM products p
WHERE p.slug = 'asus-tuf-gaming-a15'
LIMIT 1;

INSERT INTO reviews (product_id, user_full_name, rating, title, comment, is_verified_purchase, likes_count, status, admin_reply, admin_reply_at, created_at)
SELECT 
    p.id,
    'Phạm Quốc Huy',
    5,
    'iPhone mới quá mượt',
    'Màu sắc tươi trẻ, camera chụp đêm rất nét, nút Action button rất tiện lợi khi chụp ảnh nhanh. Hàng chính hãng nguyên seal tem mác đầy đủ.',
    TRUE,
    19,
    'APPROVED',
    'Techwise AI chân thành cảm ơn đánh giá của bạn! Rất vui vì bạn hài lòng với chiếc iPhone 16 mới.',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM products p
WHERE p.slug = 'iphone-16-128gb'
LIMIT 1;
