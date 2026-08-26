package com.university.regulation.dto.products;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateProductRequest {

    @NotNull(message = "Danh mục không được để trống")
    private UUID categoryId;

    @NotBlank(message = "Tên sản phẩm không được để trống")
    @Size(
            max = 255,
            message = "Tên sản phẩm không được vượt quá 255 ký tự"
    )
    private String name;

    @NotBlank(message = "Slug không được để trống")
    @Size(
            max = 300,
            message = "Slug không được vượt quá 300 ký tự"
    )
    private String slug;

    @NotBlank(message = "SKU không được để trống")
    @Size(
            max = 100,
            message = "SKU không được vượt quá 100 ký tự"
    )
    private String sku;

    @Size(
            max = 1000,
            message = "Mô tả ngắn không được vượt quá 1000 ký tự"
    )
    private String shortDescription;

    private String description;

    @NotNull(message = "Giá bán không được để trống")
    @DecimalMin(
            value = "0",
            inclusive = true,
            message = "Giá bán không được nhỏ hơn 0"
    )
    private BigDecimal price;

    @DecimalMin(
            value = "0",
            inclusive = true,
            message = "Giá gốc không được nhỏ hơn 0"
    )
    private BigDecimal originalPrice;

    @NotNull(message = "Số lượng tồn kho không được để trống")
    @PositiveOrZero(
            message = "Số lượng tồn kho không được nhỏ hơn 0"
    )
    private Integer stockQuantity;

    @Size(
            max = 1000,
            message = "URL ảnh không được vượt quá 1000 ký tự"
    )
    private String thumbnailUrl;

    @NotNull(message = "Trạng thái nổi bật không được để trống")
    private Boolean featured;

    @NotNull(message = "Trạng thái hot không được để trống")
    private Boolean hot;

    @NotNull(message = "Trạng thái hoạt động không được để trống")
    private Boolean active;
}
