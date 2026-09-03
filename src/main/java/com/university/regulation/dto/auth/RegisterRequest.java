package com.university.regulation.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

        @NotBlank(message = "Tên đăng nhập không được để trống")
        @Size(min = 4, max = 50,
                message = "Tên đăng nhập phải từ 4 đến 50 ký tự")
        @Pattern(
                regexp = "^[a-zA-Z0-9._-]+$",
                message = "Tên đăng nhập chứa ký tự không hợp lệ"
        )
        String username,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        @Size(max = 150,
                message = "Email không được vượt quá 150 ký tự")
        String email,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 8, max = 72,
                message = "Mật khẩu phải từ 8 đến 72 ký tự")
        String password,

        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 100,
                message = "Họ tên không được vượt quá 100 ký tự")
        String fullName,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(
        regexp = "^0[35789]\\d{8}$",
        message = "Số điện thoại phải gồm 10 chữ số "
        )
        String phoneNumber
) {
}
