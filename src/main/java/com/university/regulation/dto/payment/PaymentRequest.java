package com.university.regulation.dto.payment;

import java.util.UUID;

import com.university.regulation.models.enums.PaymentMethod;

import jakarta.validation.constraints.NotNull;

public record PaymentRequest(

        @NotNull(message = "Mã đơn hàng không được để trống")
        UUID orderId,

        @NotNull(message = "Phương thức thanh toán không được để trống")
        PaymentMethod paymentMethod

) {
}
