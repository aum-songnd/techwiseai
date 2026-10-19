package com.university.regulation.dto.blog;

public record BlogCategoryResponse(
        String id,
        String title,
        String slug,
        String description
) {}
