package com.university.regulation.dto.products;

import java.util.Map;

/**
 * Một thẻ sản phẩm đề xuất.
 *
 * @param product  thông tin sản phẩm (giống API danh sách hiện tại)
 * @param badge    BEST | HOT | CHOICE hoặc null
 * @param reason   lý do ngắn gọn bằng tiếng Việt, có thể null
 * @param keySpecs thông số chính theo thứ tự hiển thị (CPU, RAM, VGA, ...)
 * @param score    điểm xếp hạng nội bộ 0..1 (để debug/tinh chỉnh)
 */
public record RecommendedProductResponse(
        ProductResponse product,
        String badge,
        String reason,
        Map<String, String> keySpecs,
        double score) {
}
