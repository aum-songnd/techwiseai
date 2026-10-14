package com.university.regulation.controller;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.payment.PaymentRequest;
import com.university.regulation.dto.payment.PaymentResponse;
import com.university.regulation.dto.payment.VnpayIpnResponse;
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
            HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);

        PaymentResponse response = paymentService.createPayment(
                request,
                authentication.getName(),
                clientIp);

        return ApiResponse.success(
                "Tạo thông tin thanh toán thành công",
                response,
                httpRequest.getRequestURI());
    }

    /**
     * Khách hàng xem thông tin thanh toán của đơn hàng.
     */
    @GetMapping("/orders/{orderId}")
    public ApiResponse<PaymentResponse> getMyPayment(
            @PathVariable UUID orderId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        PaymentResponse payment = paymentService.getMyPaymentByOrderId(
                orderId,
                authentication.getName());

        return ApiResponse.success(
                "Lấy thông tin thanh toán thành công",
                payment,
                httpRequest.getRequestURI());
    }

    private String getClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");

        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");

        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }

    @GetMapping("/vnpay/return")
    public ApiResponse<PaymentResponse> handleVnpayReturn(
            @RequestParam Map<String, String> params,
            HttpServletRequest request) {
        PaymentResponse response = paymentService.processVnpayReturn(params);

        String message = switch (response.status()) {
            case PAID -> "Thanh toán VNPAY thành công";
            case CANCELLED -> "Giao dịch VNPAY đã bị hủy";
            case FAILED -> "Thanh toán VNPAY thất bại";
            default -> "Đang xử lý thanh toán VNPAY";
        };

        return ApiResponse.success(message, response, request.getRequestURI());
    }

    @GetMapping("/vnpay/ipn")
    public ResponseEntity<VnpayIpnResponse> handleVnpayIpn(
            @RequestParam Map<String, String> params) {
        try {
            VnpayIpnResponse response = paymentService.processVnpayIpn(params);

            return ResponseEntity.ok(response);

        } catch (Exception exception) {

            // VNPAY đọc kết quả trong RspCode.
            return ResponseEntity.ok(
                    new VnpayIpnResponse(
                            "99",
                            "Unknown error"));
        }
    }
}