package com.university.regulation.dto.products;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProductImageRequest(

        @NotBlank(message = "URL ảnh không được để trống")
        @Size(
                max = 1000,
                message = "URL ảnh không được vượt quá 1000 ký tự"
        )
        @Pattern(
                regexp = "^https?://.+$",
                message = "URL ảnh không hợp lệ"
        )
        String imageUrl,

        @Size(
                max = 255,
                message = "Mô tả ảnh không được vượt quá 255 ký tự"
        )
        String altText,

        @Min(
                value = 0,
                message = "Thứ tự hiển thị không được âm"
        )
        Integer displayOrder,

        Boolean primaryImage
) {
}
