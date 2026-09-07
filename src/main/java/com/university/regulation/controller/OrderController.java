package com.university.regulation.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.order.CancelOrderRequest;
import com.university.regulation.dto.order.CreateOrderRequest;
import com.university.regulation.dto.order.OrderDetailResponse;
import com.university.regulation.dto.order.OrderSummaryResponse;
import com.university.regulation.service.OrderService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class OrderController {

    private final OrderService orderService;

    /**
     * Tạo đơn hàng từ giỏ hàng hiện tại.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OrderDetailResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {

        OrderDetailResponse order =
                orderService.createOrder(
                        getUsername(authentication),
                        request
                );

        return ApiResponse.success(
                "Đặt hàng thành công",
                order,
                httpRequest.getRequestURI()
        );
    }

    /**
     * Lấy danh sách đơn hàng của khách hàng hiện tại.
     */
    @GetMapping
    public ApiResponse<Page<OrderSummaryResponse>> getMyOrders(
            @PageableDefault(size = 10)
            Pageable pageable,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {

        Page<OrderSummaryResponse> orders =
                orderService.getMyOrders(
                        getUsername(authentication),
                        pageable
                );

        return ApiResponse.success(
                "Lấy danh sách đơn hàng thành công",
                orders,
                httpRequest.getRequestURI()
        );
    }

    /**
     * Xem chi tiết đơn hàng của khách hàng hiện tại.
     */
    @GetMapping("/{orderId}")
    public ApiResponse<OrderDetailResponse> getMyOrderDetail(
            @PathVariable UUID orderId,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {

        OrderDetailResponse order =
                orderService.getMyOrderDetail(
                        getUsername(authentication),
                        orderId
                );

        return ApiResponse.success(
                "Lấy chi tiết đơn hàng thành công",
                order,
                httpRequest.getRequestURI()
        );
    }

    /**
     * Khách hàng hủy đơn hàng.
     */
    @PatchMapping("/{orderId}/cancel")
    public ApiResponse<OrderDetailResponse> cancelOrder(
            @PathVariable UUID orderId,
            @Valid @RequestBody CancelOrderRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {

        OrderDetailResponse order =
                orderService.cancelOrder(
                        getUsername(authentication),
                        orderId,
                        request
                );

        return ApiResponse.success(
                "Hủy đơn hàng thành công",
                order,
                httpRequest.getRequestURI()
        );
    }

    private String getUsername(Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication
                    instanceof AnonymousAuthenticationToken) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Bạn cần đăng nhập để thực hiện chức năng này"
            );
        }

        return authentication.getName();
    }
}