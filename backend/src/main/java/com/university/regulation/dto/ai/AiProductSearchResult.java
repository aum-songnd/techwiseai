package com.university.regulation.dto.ai;

import java.math.BigDecimal;
import java.util.UUID;

public record AiProductSearchResult(
        int rank,
        UUID productId,
        String sku,
        String name,
        String brand,
        BigDecimal price,
        BigDecimal originalPrice,
        String thumbnailUrl,
        String shortDescription,
        BigDecimal ratingAverage,
        int reviewCount,
        int stockQuantity,
        AiCategoryResult category,
        int imageCount,
        BigDecimal imageWeight,
        BigDecimal textWeight,
        double imageSimilarity,
        double textSimilarity,
        double similarity
) {
}