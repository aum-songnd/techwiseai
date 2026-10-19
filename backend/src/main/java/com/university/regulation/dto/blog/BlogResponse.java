package com.university.regulation.dto.blog;

import java.util.List;

public record BlogResponse(
        String id,
        String title,
        String slug,
        String authorId,
        String mainImageUrl,
        List<String> blogCategoryIds,
        String publishedAt,
        boolean isLatest,
        String body
) {}
