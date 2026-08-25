package com.university.regulation.dto.products;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ProductRequest(

    @NotNull(message = "Danh mục không được để trống") UUID categoryId,

    @NotBlank(message = "Tên sản phẩm không được để trống") @Size(max = 255, message = "Tên sản phẩm không được vượt quá 255 ký tự") String name,

    @NotBlank(message = "Slug không được để trống") @Size(max = 300, message = "Slug không được vượt quá 300 ký tự") String slug,

    @NotBlank(message = "SKU không được để trống") @Size(max = 100, message = "SKU không được vượt quá 100 ký tự") String sku,

    @Size(max = 1000, message = "Mô tả ngắn không được vượt quá 1000 ký tự") String shortDescription,

    String description,

    @NotNull(message = "Giá bán không được để trống") @DecimalMin(value = "0", inclusive = true, message = "Giá bán không được nhỏ hơn 0") BigDecimal price,

    @DecimalMin(value = "0", inclusive = true, message = "Giá gốc không được nhỏ hơn 0") BigDecimal originalPrice,

    @NotNull(message = "Số lượng tồn kho không được để trống") @PositiveOrZero(message = "Số lượng tồn kho không được nhỏ hơn 0") Integer stockQuantity,

    @Size(max = 1000, message = "URL ảnh không được vượt quá 1000 ký tự") String thumbnailUrl,

    Boolean featured,

    Boolean hot,

    Boolean active) {
}
