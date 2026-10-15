package com.university.regulation.dto.auth;

public record ForgotPasswordResponse(
        String email,
        String message,
        String devOtp
) {
}
