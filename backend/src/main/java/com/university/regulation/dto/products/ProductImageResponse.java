package com.university.regulation.dto.products;

import java.util.UUID;

public record ProductImageResponse(
        UUID id,
        UUID productId,
        String imageUrl,
        String altText,
        int displayOrder,
        boolean primaryImage
) {
}
