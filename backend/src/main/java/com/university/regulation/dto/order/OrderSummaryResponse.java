package com.university.regulation.dto.order;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.university.regulation.models.enums.OrderStatus;
import com.university.regulation.models.enums.PaymentMethod;

public record OrderSummaryResponse(

        UUID id,

        String orderCode,

        OrderStatus status,

        String recipientName,

        String recipientPhone,

        String shippingAddress,

        PaymentMethod paymentMethod,

        List<OrderItemResponse> items,

        BigDecimal totalAmount,

        int totalQuantity,

        OffsetDateTime createdAt

) {
    public OrderSummaryResponse(
            UUID id,
            String orderCode,
            OrderStatus status,
            String recipientName,
            BigDecimal totalAmount,
            int totalQuantity,
            OffsetDateTime createdAt
    ) {
        this(
                id,
                orderCode,
                status,
                recipientName,
                null,
                null,
                null,
                null,
                totalAmount,
                totalQuantity,
                createdAt
        );
    }
}
