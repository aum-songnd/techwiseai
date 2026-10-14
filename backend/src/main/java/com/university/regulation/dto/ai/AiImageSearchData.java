package com.university.regulation.dto.ai;

import java.util.List;

public record AiImageSearchData(
        String queryFileName,
        int topK,
        int resultCount,
        long processingTimeMs,
        List<AiProductSearchResult> results
) {
}