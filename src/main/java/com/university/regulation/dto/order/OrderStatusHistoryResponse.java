package com.university.regulation.dto.order;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.university.regulation.models.enums.OrderStatus;

public record OrderStatusHistoryResponse(

        UUID id,

        OrderStatus oldStatus,

        OrderStatus newStatus,

        UUID changedById,

        String changedByUsername,

        String note,

        OffsetDateTime createdAt

) {
}