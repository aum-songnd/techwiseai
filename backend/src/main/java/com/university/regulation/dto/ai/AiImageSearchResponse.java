package com.university.regulation.dto.ai;

public record AiImageSearchResponse(
        boolean success,
        String message,
        AiImageSearchData data
) {
}