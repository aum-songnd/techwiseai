package com.university.regulation.dto.reviews;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReviewRequest(
        @NotNull(message = "Số sao đánh giá không được để trống")
        @Min(value = 1, message = "Đánh giá tối thiểu là 1 sao")
        @Max(value = 5, message = "Đánh giá tối đa là 5 sao")
        Integer rating,

        @Size(max = 255, message = "Tiêu đề không được quá 255 ký tự")
        String title,

        @NotBlank(message = "Nội dung nhận xét không được để trống")
        @Size(min = 5, max = 2000, message = "Nội dung nhận xét từ 5 đến 2000 ký tự")
        String comment,

        String userFullName,
        String userEmail
) {
}
