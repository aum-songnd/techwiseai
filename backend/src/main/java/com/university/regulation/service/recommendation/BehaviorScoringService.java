package com.university.regulation.service.recommendation;

import org.springframework.stereotype.Service;

import com.university.regulation.dto.recommendation.RecommendationMode;

@Service
public class BehaviorScoringService {

    public record ScoringWeights(
            RecommendationMode mode,
            double vectorWeight,
            double fallbackWeight,
            String title,
            String subtitle) {
    }

    public ScoringWeights calculateWeights(int interactionCount, String preferredCategory) {
        RecommendationMode mode;
        double vectorWeight;
        double fallbackWeight;
        String title;
        String subtitle;

        String categorySuffix = (preferredCategory != null && !preferredCategory.isBlank())
                ? preferredCategory.trim()
                : null;

        if (interactionCount <= 0) {
            mode = RecommendationMode.COLD_START;
            vectorWeight = 0.0;
            fallbackWeight = 1.0;
            title = "Gợi ý nổi bật dành cho bạn";
            subtitle = "Sản phẩm công nghệ bán chạy và được đánh giá cao nhất";
        } else if (interactionCount <= 2) {
            // 1–2 tương tác: 25% vector, 75% fallback (Khám phá sơ khởi)
            mode = RecommendationMode.EXPLORING;
            vectorWeight = 0.25;
            fallbackWeight = 0.75;
            title = "Khám phá thêm dành cho bạn";
            subtitle = "Gợi ý thông minh dựa trên sản phẩm bạn vừa khám phá";
        } else if (interactionCount <= 5) {
            // 3–5 tương tác: 45% vector, 55% fallback (Cân bằng giữa gu và xu hướng)
            mode = RecommendationMode.EXPLORING;
            vectorWeight = 0.45;
            fallbackWeight = 0.55;
            title = categorySuffix != null
                    ? "Gợi ý " + categorySuffix + " bạn quan tâm"
                    : "Gợi ý phù hợp với bạn";
            subtitle = "Kết hợp hài hòa giữa sản phẩm quan tâm gần đây và xu hướng";
        } else if (interactionCount <= 10) {
            // 6–10 tương tác: 70% vector, 30% fallback (Cá nhân hóa rõ nét)
            mode = RecommendationMode.PERSONALIZED;
            vectorWeight = 0.70;
            fallbackWeight = 0.30;
            title = categorySuffix != null
                    ? "Dành riêng cho bạn - " + categorySuffix
                    : "Dành riêng cho bạn";
            subtitle = "Cá nhân hóa theo phân khúc và cấu hình bạn đang quan tâm";
        } else {
            // Trên 10 tương tác: 85% vector, 15% fallback (Độ chính xác cao, vẫn giữ độ đa dạng)
            mode = RecommendationMode.PERSONALIZED;
            vectorWeight = 0.85;
            fallbackWeight = 0.15;
            title = categorySuffix != null
                    ? "Dành riêng cho bạn - " + categorySuffix
                    : "Dành riêng cho bạn";
            subtitle = "Thuật toán học sâu từ lịch sử tương tác và đa cụm ý định của bạn";
        }

        return new ScoringWeights(mode, vectorWeight, fallbackWeight, title, subtitle);
    }
}
