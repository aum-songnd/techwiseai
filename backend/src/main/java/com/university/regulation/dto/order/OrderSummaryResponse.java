package com.university.regulation.dto.order;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.university.regulation.models.enums.OrderStatus;

public record OrderSummaryResponse(

        UUID id,

        String orderCode,

        OrderStatus status,

        String recipientName,

        BigDecimal totalAmount,

        int totalQuantity,

        OffsetDateTime createdAt

) {
}
