package com.university.regulation.dto.auth;

import java.util.List;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String username,
        String email,
        String fullName,
        String phoneNumber,
        List<String> authorities
) {
}
