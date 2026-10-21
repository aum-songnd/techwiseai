package com.university.regulation.dto.reviews;

import jakarta.validation.constraints.NotBlank;

public record UpdateReviewStatusRequest(
        @NotBlank(message = "Trạng thái không được để trống")
        String status
) {
}
