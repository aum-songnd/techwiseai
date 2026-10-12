package com.university.regulation.controller.admin_controller;

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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.order.OrderDetailResponse;
import com.university.regulation.dto.order.OrderSummaryResponse;
import com.university.regulation.dto.order.UpdateOrderStatusRequest;
import com.university.regulation.models.enums.OrderStatus;
import com.university.regulation.service.OrderService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrderController {

    private final OrderService orderService;

    /**
     * Admin lấy danh sách đơn hàng.
     */
    @GetMapping
    public ApiResponse<Page<OrderSummaryResponse>> getOrders(
            @RequestParam(required = false)
            OrderStatus status,
            @PageableDefault(size = 20)
            Pageable pageable,
            HttpServletRequest httpRequest
    ) {

        Page<OrderSummaryResponse> orders =
                orderService.getAdminOrders(
                        status,
                        pageable
                );

        return ApiResponse.success(
                "Lấy danh sách đơn hàng thành công",
                orders,
                httpRequest.getRequestURI()
        );
    }

    /**
     * Admin xem chi tiết đơn hàng.
     */
    @GetMapping("/{orderId}")
    public ApiResponse<OrderDetailResponse> getOrderDetail(
            @PathVariable UUID orderId,
            HttpServletRequest httpRequest
    ) {

        OrderDetailResponse order =
                orderService.getAdminOrderDetail(orderId);

        return ApiResponse.success(
                "Lấy chi tiết đơn hàng thành công",
                order,
                httpRequest.getRequestURI()
        );
    }

    /**
     * Admin cập nhật trạng thái đơn hàng.
     */
    @PatchMapping("/{orderId}/status")
    public ApiResponse<OrderDetailResponse> updateOrderStatus(
            @PathVariable UUID orderId,
            @Valid @RequestBody
            UpdateOrderStatusRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {

        OrderDetailResponse order =
                orderService.updateOrderStatus(
                        getUsername(authentication),
                        orderId,
                        request
                );

        return ApiResponse.success(
                "Cập nhật trạng thái đơn hàng thành công",
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