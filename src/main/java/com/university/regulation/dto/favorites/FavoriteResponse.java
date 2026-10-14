package com.university.regulation.dto.favorites;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.university.regulation.dto.products.ProductResponse;

public record FavoriteResponse(

        UUID id,

        OffsetDateTime createdAt,

        ProductResponse product

) {
}
