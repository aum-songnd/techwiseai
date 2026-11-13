package com.university.regulation.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatMessageRequest(
        @NotBlank(message = "Câu hỏi không được để trống")
        @Size(max = 2000, message = "Câu hỏi không được vượt quá 2000 ký tự")
        String message
) {
}
