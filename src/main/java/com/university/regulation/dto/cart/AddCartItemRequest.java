package com.university.regulation.dto.cart;

import java.util.UUID;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record AddCartItemRequest(

        @NotNull(message = "Sản phẩm không được để trống")
        UUID productId,

        @NotNull(message = "Số lượng không được để trống")
        @Min(
                value = 1,
                message = "Số lượng sản phẩm phải lớn hơn 0"
        )
        Integer quantity

) {
}
