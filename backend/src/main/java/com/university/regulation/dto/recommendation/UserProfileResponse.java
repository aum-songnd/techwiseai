package com.university.regulation.dto.recommendation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {

    private UUID userId;

    private String sessionId;

    private int interactionCount;

    private RecommendationMode mode;

    private List<String> favoriteCategories;

    private BigDecimal preferredPriceMin;

    private BigDecimal preferredPriceMax;

    private OffsetDateTime lastActiveAt;

    private boolean hasProfileVector;
}
