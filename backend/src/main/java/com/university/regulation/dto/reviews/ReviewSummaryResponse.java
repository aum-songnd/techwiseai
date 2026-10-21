package com.university.regulation.dto.reviews;

import java.util.Map;

public record ReviewSummaryResponse(
        double averageRating,
        long totalReviews,
        Map<Integer, Long> ratingDistribution
) {
}
