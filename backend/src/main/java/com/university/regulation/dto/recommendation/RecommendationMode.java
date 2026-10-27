package com.university.regulation.dto.recommendation;

public enum RecommendationMode {
    COLD_START,   // 0 interactions: 100% Fallback (Bestsellers, Trending, Top Rated)
    EXPLORING,    // 1-5 interactions: 90/10 -> 70/30 Blend
    PERSONALIZED  // 6+ interactions: 50/50 -> 40/60 Blend based on User Profile Vector
}
