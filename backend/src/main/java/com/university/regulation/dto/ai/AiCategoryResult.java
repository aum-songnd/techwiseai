package com.university.regulation.dto.ai;

import java.util.UUID;

public record AiCategoryResult(
        UUID id,
        String name,
        String slug
) {
}