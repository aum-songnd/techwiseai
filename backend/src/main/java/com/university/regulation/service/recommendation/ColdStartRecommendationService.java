package com.university.regulation.service.recommendation;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.regulation.dto.products.ProductResponse;
import com.university.regulation.dto.products.RecommendedProductResponse;
import com.university.regulation.models.product.Product;
import com.university.regulation.repository.ProductRepository;
import com.university.regulation.service.ProductService;
import com.university.regulation.service.ProductSpecReader;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ColdStartRecommendationService {

    private final ProductRepository productRepository;
    private final ProductService productService;
    private final ProductSpecReader specReader;

    @Transactional(readOnly = true)
    public List<RecommendedProductResponse> getColdStartRecommendations(Collection<UUID> excludedIds, int limit) {
        int fetchSize = Math.max(limit * 3, 30);
        List<Product> candidates = productRepository.findTopTrendingProducts(PageRequest.of(0, fetchSize));
        Set<UUID> excluded = excludedIds != null ? new HashSet<>(excludedIds) : Set.of();

        List<RecommendedProductResponse> results = new ArrayList<>();
        int count = 0;

        for (Product p : candidates) {
            if (excluded.contains(p.getId())) {
                continue;
            }
            try {
                ProductResponse response = productService.toResponse(p);
                Map<String, String> keySpecs = specReader.keySpecs(specReader.flatten(p.getSpecifications()));

                String badge = count == 0 ? "BEST" : (count < 3 ? "HOT" : null);
                String reason = count == 0
                        ? "Top 1 sản phẩm nổi bật bán chạy nhất"
                        : (p.getRatingAverage() != null && p.getRatingAverage().doubleValue() >= 4.5
                                ? "Được cộng đồng đánh giá rất cao (" + p.getRatingAverage() + "★)"
                                : "Sản phẩm xu hướng công nghệ được quan tâm");

                double score = 0.95 - (count * 0.05);
                results.add(new RecommendedProductResponse(
                        response,
                        badge,
                        reason,
                        keySpecs,
                        Math.max(0.5, Math.round(score * 100.0) / 100.0)));

                count++;
                if (results.size() >= limit) {
                    break;
                }
            } catch (Exception e) {
                log.warn("Lỗi khi xử lý sản phẩm cold-start {}: {}", p.getId(), e.getMessage());
            }
        }
        return results;
    }
}
