package com.university.regulation.controller;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.payment.PaymentRequest;
import com.university.regulation.dto.payment.PaymentResponse;
import com.university.regulation.service.PaymentService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * Khách hàng tạo thanh toán cho đơn hàng của mình.
     */
    @PostMapping
    public ApiResponse<PaymentResponse> createPayment(
            @Valid @RequestBody PaymentRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        PaymentResponse payment =
                paymentService.createPayment(
                        request,
                        authentication.getName()
                );

        return ApiResponse.success(
                "Tạo thanh toán thành công",
                payment,
                httpRequest.getRequestURI()
        );
    }

    /**
     * Khách hàng xem thông tin thanh toán của đơn hàng.
     */
    @GetMapping("/orders/{orderId}")
    public ApiResponse<PaymentResponse> getMyPayment(
            @PathVariable UUID orderId,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        PaymentResponse payment =
                paymentService.getMyPaymentByOrderId(
                        orderId,
                        authentication.getName()
                );

        return ApiResponse.success(
                "Lấy thông tin thanh toán thành công",
                payment,
                httpRequest.getRequestURI()
        );
    }
}