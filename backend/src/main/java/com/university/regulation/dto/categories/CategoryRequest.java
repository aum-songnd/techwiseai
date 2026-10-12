package com.university.regulation.dto.categories;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotNull;

public record CategoryRequest (
        @NotNull(message = "Tên danh mục không được để trống")
        @JsonProperty("name")
        String name,
        @NotNull(message = "Slug không được để trống")
        @JsonProperty("slug")
        String slug,
        @JsonProperty("description")
        String description,
        @JsonProperty("image_url")
        String imageUrl,
        @JsonProperty("display_order")
        Integer displayOrder
) {}
