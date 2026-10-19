package com.university.regulation.dto.blog;

import java.util.List;

import jakarta.validation.constraints.NotBlank;

public record BlogRequest(
        @NotBlank(message = "Tiêu đề bài viết không được để trống")
        String title,

        @NotBlank(message = "Slug không được để trống")
        String slug,

        @NotBlank(message = "Tác giả không được để trống")
        String authorId,

        String mainImageUrl,

        List<String> blogCategoryIds,

        String publishedAt,

        Boolean isLatest,

        @NotBlank(message = "Nội dung bài viết không được để trống")
        String body
) {}
