package com.university.regulation.dto.reviews;

import java.util.UUID;

public record ReviewEligibilityResponse(
        UUID productId,
        boolean eligible,
        boolean hasPurchased,
        boolean alreadyReviewed,
        String reason
) {}
