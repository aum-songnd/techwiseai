-- Đặt lại trạng thái featured và hot
UPDATE products
SET featured = FALSE, hot = FALSE;

-- Gán 5 sản phẩm nổi bật (featured = TRUE) cho mỗi danh mục
WITH ranked_featured AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY category_id
        ORDER BY rating_average DESC, review_count DESC, price DESC, id ASC
    ) AS rn
    FROM products
    WHERE active = TRUE
)
UPDATE products p
SET featured = TRUE
FROM ranked_featured rf
WHERE p.id = rf.id AND rf.rn <= 5;

-- Gán 5 sản phẩm bán chạy / hot (hot = TRUE) cho mỗi danh mục
WITH ranked_hot AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY category_id
        ORDER BY review_count DESC, (CASE WHEN original_price > price THEN 1 ELSE 0 END) DESC, rating_average DESC, id DESC
    ) AS rn
    FROM products
    WHERE active = TRUE
)
UPDATE products p
SET hot = TRUE
FROM ranked_hot rh
WHERE p.id = rh.id AND rh.rn <= 5;
