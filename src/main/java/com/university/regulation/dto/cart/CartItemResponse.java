package com.university.regulation.dto.cart;

import java.math.BigDecimal;
import java.util.UUID;

public record CartItemResponse(

        UUID id,

        UUID productId,

        String sku,

        String name,

        String slug,

        String thumbnailUrl,

        BigDecimal unitPrice,

        BigDecimal originalPrice,

        int quantity,

        BigDecimal subtotal,

        int stockQuantity,

        boolean available

) {
}
