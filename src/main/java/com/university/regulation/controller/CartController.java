package com.university.regulation.controller;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.cart.AddCartItemRequest;
import com.university.regulation.dto.cart.CartResponse;
import com.university.regulation.dto.cart.UpdateCartItemRequest;
import com.university.regulation.service.CartService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ApiResponse<CartResponse> getCart(
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {

        CartResponse cart =
                cartService.getCart(authentication.getName());

        return ApiResponse.success(
                "Lấy giỏ hàng thành công",
                cart,
                httpRequest.getRequestURI()
        );
    }

    @PostMapping("/items")
    public ApiResponse<CartResponse> addItem(
            @Valid @RequestBody AddCartItemRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {

        CartResponse cart = cartService.addItem(
                authentication.getName(),
                request
        );

        return ApiResponse.success(
                "Thêm sản phẩm vào giỏ hàng thành công",
                cart,
                httpRequest.getRequestURI()
        );
    }

    @PutMapping("/items/{itemId}")
    public ApiResponse<CartResponse> updateItem(
            @PathVariable UUID itemId,
            @Valid @RequestBody UpdateCartItemRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {

        CartResponse cart = cartService.updateItem(
                authentication.getName(),
                itemId,
                request
        );

        return ApiResponse.success(
                "Cập nhật giỏ hàng thành công",
                cart,
                httpRequest.getRequestURI()
        );
    }

    @DeleteMapping("/items/{itemId}")
    public ApiResponse<CartResponse> removeItem(
            @PathVariable UUID itemId,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {

        CartResponse cart = cartService.removeItem(
                authentication.getName(),
                itemId
        );

        return ApiResponse.success(
                "Xóa sản phẩm khỏi giỏ hàng thành công",
                cart,
                httpRequest.getRequestURI()
        );
    }

    @DeleteMapping
    public ApiResponse<CartResponse> clearCart(
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {

        CartResponse cart =
                cartService.clearCart(authentication.getName());

        return ApiResponse.success(
                "Xóa toàn bộ giỏ hàng thành công",
                cart,
                httpRequest.getRequestURI()
        );
    }
}
