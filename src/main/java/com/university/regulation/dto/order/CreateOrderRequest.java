package com.university.regulation.dto.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateOrderRequest(

        @NotBlank(message = "Tên người nhận không được để trống")
        @Size(
                max = 255,
                message = "Tên người nhận không được vượt quá 255 ký tự"
        )
        String recipientName,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(
                regexp = "^(0\\d{9}|\\+84\\d{9})$",
                message = "Số điện thoại không hợp lệ"
        )
        String recipientPhone,

        @NotBlank(message = "Địa chỉ nhận hàng không được để trống")
        @Size(
                max = 1000,
                message = "Địa chỉ không được vượt quá 1000 ký tự"
        )
        String shippingAddress,

        @Size(
                max = 1000,
                message = "Ghi chú không được vượt quá 1000 ký tự"
        )
        String note

) {
}
