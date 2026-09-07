package com.university.regulation.dto.order;

import com.university.regulation.models.enums.OrderStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateOrderStatusRequest(

        @NotNull(message = "Trạng thái mới không được để trống")
        OrderStatus status,

        @Size(
                max = 1000,
                message = "Ghi chú không được vượt quá 1000 ký tự"
        )
        String note

) {
}
