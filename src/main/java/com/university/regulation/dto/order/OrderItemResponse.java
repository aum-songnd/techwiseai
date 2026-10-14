package com.university.regulation.dto.order;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemResponse(

        UUID id,

        UUID productId,

        String productName,

        String productSku,

        String productThumbnailUrl,

        BigDecimal unitPrice,

        int quantity,

        BigDecimal subtotal

) {
}
