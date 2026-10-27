package com.university.regulation.dto.recommendation;

import java.util.List;

import com.university.regulation.dto.products.RecommendedProductResponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalizedRecommendationResponse {

    private RecommendationMode mode;

    private String title;

    private String subtitle;

    private int interactionCount;

    private String preferredCategory;

    private List<RecommendedProductResponse> items;
}
