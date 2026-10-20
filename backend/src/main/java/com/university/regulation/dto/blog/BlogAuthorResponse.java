package com.university.regulation.dto.blog;

public record BlogAuthorResponse(
        String id,
        String name,
        String slug,
        String imageUrl,
        String bio
) {}
