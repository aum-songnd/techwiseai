package com.university.regulation.dto.products;

import java.math.BigDecimal;
import java.util.UUID;

import com.university.regulation.dto.categories.CategoryResponse;

public record ProductResponse(
        UUID id,
        String name,
        String slug,
        String sku,
        String shortDescription,
        String description,
        String thumbnailUrl,

        CategoryResponse category,

        BigDecimal price,
        BigDecimal originalPrice,
        int discountPercent,

        int stockQuantity,
        BigDecimal ratingAverage,
        int reviewCount,

        boolean featured,
        boolean hot,
        boolean onSale,
        boolean inStock) {
}
