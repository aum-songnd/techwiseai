package com.university.regulation.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.favorites.AddFavoriteRequest;
import com.university.regulation.dto.favorites.FavoriteCheckResponse;
import com.university.regulation.dto.favorites.FavoriteResponse;
import com.university.regulation.service.FavoriteService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    public ApiResponse<List<FavoriteResponse>> getFavorites(
            Authentication authentication,
            HttpServletRequest request
    ) {
        List<FavoriteResponse> data =
                favoriteService.getFavorites(authentication.getName());

        return ApiResponse.success(
                "Lấy danh sách sản phẩm yêu thích thành công",
                data,
                request.getRequestURI()
        );
    }

    @PostMapping
    public ApiResponse<FavoriteResponse> addFavorite(
            @Valid @RequestBody AddFavoriteRequest requestBody,
            Authentication authentication,
            HttpServletRequest request
    ) {
        FavoriteResponse data = favoriteService.addFavorite(
                authentication.getName(),
                requestBody
        );

        return ApiResponse.success(
                "Thêm sản phẩm vào danh sách yêu thích thành công",
                data,
                request.getRequestURI()
        );
    }

    @DeleteMapping("/{productId}")
    public ApiResponse<Void> removeFavorite(
            @PathVariable UUID productId,
            Authentication authentication,
            HttpServletRequest request
    ) {
        favoriteService.removeFavorite(
                authentication.getName(),
                productId
        );

        return ApiResponse.<Void>success(
                "Đã bỏ sản phẩm khỏi danh sách yêu thích",
                null,
                request.getRequestURI()
        );
    }

    @DeleteMapping
    public ApiResponse<Void> clearFavorites(
            Authentication authentication,
            HttpServletRequest request
    ) {
        favoriteService.clearFavorites(authentication.getName());

        return ApiResponse.<Void>success(
                "Đã xóa toàn bộ danh sách yêu thích",
                null,
                request.getRequestURI()
        );
    }

    @GetMapping("/check")
    public ApiResponse<FavoriteCheckResponse> checkFavorite(
            @RequestParam UUID productId,
            Authentication authentication,
            HttpServletRequest request
    ) {
        FavoriteCheckResponse data = favoriteService.checkFavorite(
                authentication.getName(),
                productId
        );

        return ApiResponse.success(
                "Kiểm tra trạng thái yêu thích thành công",
                data,
                request.getRequestURI()
        );
    }
}