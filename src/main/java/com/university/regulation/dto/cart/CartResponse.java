package com.university.regulation.dto.cart;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CartResponse(

        UUID cartId,

        List<CartItemResponse> items,

        int totalItems,

        int totalQuantity,

        BigDecimal totalAmount,

        OffsetDateTime updatedAt

) {
}
