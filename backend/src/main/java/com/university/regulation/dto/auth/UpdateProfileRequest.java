package com.university.regulation.dto.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UpdateProfileRequest(
        String fullName,
        @Email(message = "Email không hợp lệ") String email,
        String phoneNumber,
        String avatarUrl
) {
}
