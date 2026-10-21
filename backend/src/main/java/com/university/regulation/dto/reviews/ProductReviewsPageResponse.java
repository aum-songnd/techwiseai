package com.university.regulation.dto.reviews;

import com.university.regulation.common.api.PageResponse;

public record ProductReviewsPageResponse(
        ReviewSummaryResponse summary,
        PageResponse<ReviewResponse> reviews
) {
}
