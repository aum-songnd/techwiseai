package com.university.regulation.dto.user;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AdminUserResponse(
        UUID id,
        String username,
        String email,
        String fullName,
        String phoneNumber,
        String avatarUrl,
        List<String> authorities,
        boolean active,
        OffsetDateTime createdAt
) {
}
