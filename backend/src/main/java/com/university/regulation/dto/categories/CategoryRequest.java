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
        Integer displayOrder,
        @JsonProperty("active")
        Boolean active
) {
        public CategoryRequest(String name, String slug, String description, String imageUrl, Integer displayOrder) {
                this(name, slug, description, imageUrl, displayOrder, true);
        }
}
