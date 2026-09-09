package com.university.regulation.dto.payment;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.university.regulation.models.enums.PaymentMethod;
import com.university.regulation.models.enums.PaymentStatus;

public record PaymentResponse(

        UUID id,

        UUID orderId,

        PaymentMethod paymentMethod,

        PaymentStatus status,

        BigDecimal amount,

        String currency,

        String transactionCode,

        String providerTransactionId,

        String paymentUrl,

        String failureReason,

        OffsetDateTime paidAt,

        OffsetDateTime createdAt,

        OffsetDateTime updatedAt

) {
}
