package com.university.regulation.controller;

import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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
import com.university.regulation.dto.reviews.CreateReviewRequest;
import com.university.regulation.dto.reviews.ProductReviewsPageResponse;
import com.university.regulation.dto.reviews.ReviewResponse;
import com.university.regulation.service.ReviewService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/products/{productId}/reviews")
    public ApiResponse<ProductReviewsPageResponse> getProductReviews(
            @PathVariable UUID productId,
            @RequestParam(required = false) Integer rating,
            @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            HttpServletRequest request
    ) {
        ProductReviewsPageResponse data = reviewService.getProductReviews(
                productId,
                rating,
                pageable
        );

        return ApiResponse.success(
                "Lấy danh sách đánh giá sản phẩm thành công",
                data,
                request.getRequestURI()
        );
    }

    @PostMapping("/products/{productId}/reviews")
    public ApiResponse<ReviewResponse> createReview(
            @PathVariable UUID productId,
            @Valid @RequestBody CreateReviewRequest requestBody,
            Authentication authentication,
            HttpServletRequest request
    ) {
        String username = authentication != null ? authentication.getName() : null;
        ReviewResponse data = reviewService.createReview(
                productId,
                username,
                requestBody
        );

        return ApiResponse.success(
                "Đăng đánh giá và bình luận thành công",
                data,
                request.getRequestURI()
        );
    }

    @PostMapping("/reviews/{id}/like")
    public ApiResponse<ReviewResponse> likeReview(
            @PathVariable UUID id,
            HttpServletRequest request
    ) {
        ReviewResponse data = reviewService.likeReview(id);

        return ApiResponse.success(
                "Cảm ơn bạn đã bình chọn hữu ích",
                data,
                request.getRequestURI()
        );
    }

    @DeleteMapping("/reviews/{id}")
    public ApiResponse<Void> deleteReview(
            @PathVariable UUID id,
            Authentication authentication,
            HttpServletRequest request
    ) {
        String username = authentication != null ? authentication.getName() : null;
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));

        reviewService.deleteReview(id, username, isAdmin);

        return ApiResponse.<Void>success(
                "Đã xóa đánh giá thành công",
                null,
                request.getRequestURI()
        );
    }
}
