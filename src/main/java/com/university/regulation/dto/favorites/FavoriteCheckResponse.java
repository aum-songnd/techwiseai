package com.university.regulation.dto.favorites;

import java.util.UUID;

public record FavoriteCheckResponse(

        UUID productId,

        boolean favorite

) {
}
