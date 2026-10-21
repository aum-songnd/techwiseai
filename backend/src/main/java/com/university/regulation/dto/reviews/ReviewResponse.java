package com.university.regulation.dto.reviews;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ReviewResponse(
        UUID id,
        UUID productId,
        String productName,
        UUID userId,
        String userFullName,
        String userAvatarUrl,
        int rating,
        String title,
        String comment,
        boolean isVerifiedPurchase,
        int likesCount,
        String status,
        String adminReply,
        OffsetDateTime adminReplyAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
