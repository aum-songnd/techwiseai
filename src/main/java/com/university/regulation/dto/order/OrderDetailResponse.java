package com.university.regulation.dto.order;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.university.regulation.models.enums.OrderStatus;
import com.university.regulation.models.enums.PaymentMethod;

public record OrderDetailResponse(

        UUID id,

        String orderCode,

        UUID userId,

        String username,

        OrderStatus status,

        PaymentMethod paymentMethod,

        String recipientName,

        String recipientPhone,

        String shippingAddress,

        BigDecimal subtotal,

        BigDecimal discountAmount,

        BigDecimal shippingFee,

        BigDecimal totalAmount,

        String note,

        int totalQuantity,

        List<OrderItemResponse> items,

        List<OrderStatusHistoryResponse> statusHistory,

        OffsetDateTime createdAt,

        OffsetDateTime updatedAt

) {
}
