package com.university.regulation.controller.admin_controller;

import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.payment.PaymentResponse;
import com.university.regulation.service.PaymentService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/payments")
@RequiredArgsConstructor
public class AdminPaymentController {

    private final PaymentService paymentService;

    /**
     * Admin xem thanh toán của một đơn hàng.
     */
    @GetMapping("/orders/{orderId}")
    public ApiResponse<PaymentResponse> getPaymentByOrderId(
            @PathVariable UUID orderId,
            HttpServletRequest httpRequest
    ) {
        PaymentResponse payment =
                paymentService.getPaymentByOrderId(orderId);

        return ApiResponse.success(
                "Lấy thông tin thanh toán thành công",
                payment,
                httpRequest.getRequestURI()
        );
    }
}
