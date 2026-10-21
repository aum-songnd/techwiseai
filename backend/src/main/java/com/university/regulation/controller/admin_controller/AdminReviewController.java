package com.university.regulation.controller.admin_controller;

import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.api.PageResponse;
import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.reviews.AdminReplyReviewRequest;
import com.university.regulation.dto.reviews.ReviewResponse;
import com.university.regulation.dto.reviews.UpdateReviewStatusRequest;
import com.university.regulation.service.ReviewService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/reviews")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReviewController {

    private final ReviewService reviewService;

    @GetMapping
    public ApiResponse<PageResponse<ReviewResponse>> searchReviews(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) UUID productId,
            @PageableDefault(page = 0, size = 15, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            HttpServletRequest request
    ) {
        PageResponse<ReviewResponse> data = reviewService.adminSearchReviews(
                keyword,
                status,
                rating,
                productId,
                pageable
        );

        return ApiResponse.success(
                "Lấy danh sách đánh giá quản trị thành công",
                data,
                request.getRequestURI()
        );
    }

    @PostMapping("/{id}/reply")
    public ApiResponse<ReviewResponse> replyReview(
            @PathVariable UUID id,
            @Valid @RequestBody AdminReplyReviewRequest requestBody,
            HttpServletRequest request
    ) {
        ReviewResponse data = reviewService.adminReply(id, requestBody);

        return ApiResponse.success(
                "Phản hồi đánh giá của khách hàng thành công",
                data,
                request.getRequestURI()
        );
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<ReviewResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateReviewStatusRequest requestBody,
            HttpServletRequest request
    ) {
        ReviewResponse data = reviewService.adminUpdateStatus(id, requestBody);

        return ApiResponse.success(
                "Cập nhật trạng thái đánh giá thành công",
                data,
                request.getRequestURI()
        );
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteReview(
            @PathVariable UUID id,
            HttpServletRequest request
    ) {
        reviewService.deleteReview(id, null, true);

        return ApiResponse.<Void>success(
                "Đã xóa đánh giá thành công",
                null,
                request.getRequestURI()
        );
    }
}
