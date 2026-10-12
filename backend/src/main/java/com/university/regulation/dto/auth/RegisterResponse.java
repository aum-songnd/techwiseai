package com.university.regulation.dto.auth;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record RegisterResponse(
        UUID id,
        String username,
        String email,
        String fullName,
        String phoneNumber,
        boolean active,
        List<String> authorities,
        OffsetDateTime createdAt
) {
}
