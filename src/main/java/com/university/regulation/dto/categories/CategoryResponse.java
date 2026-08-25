package com.university.regulation.dto.categories;

import java.util.UUID;

public record CategoryResponse(
        UUID id,
        String name,
        String slug,
        String description,
        String imageUrl,
        int displayOrder
) {
}
