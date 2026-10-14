package com.university.regulation.dto.importdata;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LaptopImportItem(

        String categorySlug,

        String name,

        String slug,

        String sku,

        String brand,

        String warranty,

        String shortDescription,

        String description,

        BigDecimal price,

        BigDecimal originalPrice,

        Integer stockQuantity,

        String thumbnailUrl,

        Boolean active,

        Boolean featured,

        Boolean hot,

        BigDecimal ratingAverage,

        Integer soldCount,

        Map<String, String> specifications,

        List<LaptopImageImportItem> images
) {
}