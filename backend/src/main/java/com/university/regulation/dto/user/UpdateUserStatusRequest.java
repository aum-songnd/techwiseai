package com.university.regulation.dto.user;

import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull(message = "Trạng thái hoạt động không được để trống")
        Boolean active
) {
}
