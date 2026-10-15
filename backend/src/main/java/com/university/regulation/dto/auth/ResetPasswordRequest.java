package com.university.regulation.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Địa chỉ email không hợp lệ")
        String email,

        @NotBlank(message = "Mã xác thực không được để trống")
        String otp,

        @NotBlank(message = "Mật khẩu mới không được để trống")
        @Size(min = 6, message = "Mật khẩu mới phải có ít nhất 6 ký tự")
        String newPassword
) {
}
