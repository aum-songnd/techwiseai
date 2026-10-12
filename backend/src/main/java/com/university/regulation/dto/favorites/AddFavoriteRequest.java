package com.university.regulation.dto.favorites;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record AddFavoriteRequest(

        @NotNull(message = "ID sản phẩm không được để trống")
        UUID productId

) {
}
