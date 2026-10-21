package com.university.regulation.dto.reviews;

import jakarta.validation.constraints.NotBlank;

public record AdminReplyReviewRequest(
        @NotBlank(message = "Nội dung phản hồi không được để trống")
        String reply
) {
}
