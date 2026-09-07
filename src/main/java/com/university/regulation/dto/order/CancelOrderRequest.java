package com.university.regulation.dto.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelOrderRequest(

        @NotBlank(message = "Lý do hủy đơn không được để trống")
        @Size(
                max = 1000,
                message = "Lý do hủy không được vượt quá 1000 ký tự"
        )
        String reason

) {
}
