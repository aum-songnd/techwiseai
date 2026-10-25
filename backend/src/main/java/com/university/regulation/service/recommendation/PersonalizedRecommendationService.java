package com.university.regulation.service.recommendation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.university.regulation.dto.products.ProductResponse;
import com.university.regulation.dto.products.RecommendedProductResponse;
import com.university.regulation.dto.recommendation.PersonalizedRecommendationResponse;
import com.university.regulation.dto.recommendation.RecommendationMode;
import com.university.regulation.dto.recommendation.UserProfileResponse;
import com.university.regulation.models.category.Category;
import com.university.regulation.models.product.Product;
import com.university.regulation.models.recommendation.UserInteractionEvent;
import com.university.regulation.models.recommendation.UserRecommendationProfile;
import com.university.regulation.repository.CategoryRepository;
import com.university.regulation.repository.ProductEmbeddingRepository;
import com.university.regulation.repository.ProductRepository;
import com.university.regulation.repository.UserInteractionRepository;
import com.university.regulation.service.ProductService;
import com.university.regulation.service.ProductSpecReader;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class PersonalizedRecommendationService {

    private final UserInteractionRepository interactionRepository;
    private final UserProfileService userProfileService;
    private final BehaviorScoringService scoringService;
    private final ColdStartRecommendationService coldStartService;
    private final ProductEmbeddingRepository embeddingRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductService productService;
    private final ProductSpecReader specReader;
    private final ObjectMapper objectMapper;
    private final UnifiedRankingEngine rankingEngine;

    @Transactional
    public PersonalizedRecommendationResponse getForYouRecommendations(UUID userId, String sessionId, int limit) {
        return getForYouRecommendations(userId, sessionId, limit, false);
    }

    @Transactional
    public PersonalizedRecommendationResponse getForYouRecommendations(
            UUID userId, String sessionId, int limit, boolean forceRefresh) {
        int safeLimit = Math.max(1, Math.min(limit, 24));

        // 1. Lọc sản phẩm đã mua gần đây (30 ngày)
        List<UUID> purchasedIds = interactionRepository.findRecentPurchasedProductIds(
                userId, sessionId, OffsetDateTime.now().minusDays(30));
        Set<UUID> excludedIds = new HashSet<>(purchasedIds != null ? purchasedIds : List.of());

        // Khách vãng lai không có sessionId: Trả ngay Cold Start an toàn, không query profile
        if (userId == null && (sessionId == null || sessionId.isBlank())) {
            List<RecommendedProductResponse> coldStartItems = coldStartService.getColdStartRecommendations(
                    excludedIds, safeLimit);
            return PersonalizedRecommendationResponse.builder()
                    .mode(RecommendationMode.COLD_START)
                    .title("Gợi ý nổi bật dành cho bạn")
                    .subtitle("Sản phẩm công nghệ bán chạy và được đánh giá cao nhất")
                    .interactionCount(0)
                    .preferredCategory(null)
                    .items(coldStartItems)
                    .build();
        }

        // 2. Tìm hồ sơ người dùng (100% NON-BLOCKING - KHÔNG CHẶN HTTP THREAD)
        Optional<UserRecommendationProfile> profileOpt = userProfileService.findProfile(userId, sessionId);
        int interactionCount = profileOpt.map(UserRecommendationProfile::getInteractionCount).orElse(0);

        if (forceRefresh) {
            // Khi người dùng bấm "Cập nhật đề xuất": Kích hoạt cập nhật ngầm, không khóa thread đọc
            userProfileService.updateProfileAsync(userId, sessionId);
        } else if (profileOpt.isEmpty()) {
            // Khách có tương tác nhưng profile chưa tạo xong: kích hoạt cập nhật ngầm
            long realCount = interactionRepository.countInteractions(userId, sessionId);
            if (realCount > 0) {
                userProfileService.updateProfileAsync(userId, sessionId);
            }
            // Trả ngay đề xuất Cold Start chất lượng cao không để khách chờ
            List<RecommendedProductResponse> coldStartItems = coldStartService.getColdStartRecommendations(
                    excludedIds, safeLimit);
            return PersonalizedRecommendationResponse.builder()
                    .mode(RecommendationMode.COLD_START)
                    .title("Gợi ý nổi bật dành cho bạn")
                    .subtitle("Hệ thống đang đồng bộ hồ sơ sở thích ngầm — hiển thị xu hướng công nghệ hàng đầu")
                    .interactionCount((int) realCount)
                    .preferredCategory(null)
                    .items(coldStartItems)
                    .build();
        } else {
            // Khách đã có profile: PHỤC VỤ NGAY TỪ PROFILE ĐÃ LƯU
            long realCount = interactionRepository.countInteractions(userId, sessionId);
            if (realCount > interactionCount) {
                userProfileService.updateProfileAsync(userId, sessionId);
            }
        }

        String preferredCategory = null;
        String secondaryCategory = null;
        String tertiaryCategory = null;
        BigDecimal minPrice = null;
        BigDecimal maxPrice = null;

        if (profileOpt.isPresent()) {
            UserRecommendationProfile profile = profileOpt.get();
            List<String> favCategories = parseCategories(profile.getFavoriteCategories());
            preferredCategory = !favCategories.isEmpty() ? favCategories.get(0) : null;
            secondaryCategory = favCategories.size() > 1 ? favCategories.get(1) : null;
            tertiaryCategory = favCategories.size() > 2 ? favCategories.get(2) : null;
            minPrice = profile.getPreferredPriceMin();
            maxPrice = profile.getPreferredPriceMax();
        }

        // 3. Tính toán trọng số theo hành vi
        BehaviorScoringService.ScoringWeights weights = scoringService.calculateWeights(
                interactionCount, preferredCategory);

        // 4. Nếu là Cold Start (chưa có tương tác) -> 100% Fallback chất lượng cao
        if (weights.mode() == RecommendationMode.COLD_START) {
            List<RecommendedProductResponse> coldStartItems = coldStartService.getColdStartRecommendations(
                    excludedIds, safeLimit);
            return PersonalizedRecommendationResponse.builder()
                    .mode(RecommendationMode.COLD_START)
                    .title(weights.title())
                    .subtitle(weights.subtitle())
                    .interactionCount(0)
                    .preferredCategory(null)
                    .items(coldStartItems)
                    .build();
        }

        // 5. Có tương tác: Lấy vector hồ sơ người dùng
        UserRecommendationProfile profile = profileOpt.get();
        float[] profileVector = userProfileService.getProfileVector(profile.getId());

        if (profileVector == null) {
            // Vector chưa hoàn tất: kích hoạt cập nhật ngầm và fallback ngay không chặn
            userProfileService.updateProfileAsync(userId, sessionId);
            List<RecommendedProductResponse> fallbackItems = coldStartService.getColdStartRecommendations(
                    excludedIds, safeLimit);
            return PersonalizedRecommendationResponse.builder()
                    .mode(weights.mode())
                    .title(weights.title())
                    .subtitle(weights.subtitle())
                    .interactionCount(interactionCount)
                    .preferredCategory(preferredCategory)
                    .items(fallbackItems)
                    .build();
        }

        // 6. Xây dựng bản đồ giá và suy luận gu cấu hình theo từng nhóm thiết bị (Issue 4 - P1)
        Map<String, double[]> categoryPriceStats = new HashMap<>();
        Map<String, Set<String>> userCategorySpecMap = new HashMap<>();

        if (interactionCount > 0) {
            List<UserInteractionEvent> recentEvents = interactionRepository.findRecentInteractions(
                    userId, sessionId, OffsetDateTime.now().minusDays(30), PageRequest.of(0, 50));
            Map<String, Map<String, Double>> categorySpecFreq = new HashMap<>();

            for (UserInteractionEvent evt : recentEvents) {
                Product p = evt.getProduct();
                if (p != null) {
                    if (p.getCategory() != null && p.getCategory().getName() != null && p.getPrice() != null && p.getPrice().signum() > 0) {
                        String cName = p.getCategory().getName().trim().toLowerCase();
                        double[] stats = categoryPriceStats.computeIfAbsent(cName, k -> new double[2]);
                        stats[0] += p.getPrice().doubleValue();
                        stats[1] += 1.0;
                    }
                    UnifiedRankingEngine.DeviceGroup group = UnifiedRankingEngine.detectDeviceGroup(p);
                    Set<String> tokens = UnifiedRankingEngine.extractTokensForDeviceGroup(p, group);
                    Map<String, Double> freqMap = categorySpecFreq.computeIfAbsent(group.getCode(), k -> new HashMap<>());
                    for (String tok : tokens) {
                        freqMap.put(tok, freqMap.getOrDefault(tok, 0.0) + 1.0);
                    }
                }
            }

            for (Map.Entry<String, Map<String, Double>> entry : categorySpecFreq.entrySet()) {
                Set<String> preferred = new HashSet<>();
                entry.getValue().entrySet().stream()
                        .filter(e -> e.getValue() >= 1.0)
                        .forEach(e -> preferred.add(e.getKey()));
                if (preferred.isEmpty() && !entry.getValue().isEmpty()) {
                    entry.getValue().keySet().stream().limit(5).forEach(preferred::add);
                }
                userCategorySpecMap.put(entry.getKey(), preferred);
            }
        }

        // --- CỤM Ý ĐỊNH 1: DANH MỤC CHỦ ĐẠO (PRIMARY INTENT) ---
        UUID primaryCatId = resolveCategoryId(preferredCategory);
        List<RecommendedProductResponse> primaryItems = fetchCategoryRecommendations(
                profileVector, primaryCatId, preferredCategory, minPrice, maxPrice,
                userCategorySpecMap, excludedIds, Math.max(safeLimit, 14), true);

        // --- CỤM Ý ĐỊNH 2: DANH MỤC BỔ TRỢ (SECONDARY INTENT) ---
        List<RecommendedProductResponse> secondaryItems = new ArrayList<>();
        if (secondaryCategory != null && !secondaryCategory.equalsIgnoreCase(preferredCategory)) {
            UUID secCatId = resolveCategoryId(secondaryCategory);
            BigDecimal[] secPrice = getPriceRangeForCategory(secondaryCategory, categoryPriceStats);
            secondaryItems = fetchCategoryRecommendations(
                    profileVector, secCatId, secondaryCategory, secPrice[0], secPrice[1],
                    userCategorySpecMap, excludedIds, Math.max(6, (int) Math.round(safeLimit * 0.50)), false);
        }

        // --- CỤM Ý ĐỊNH 3: DANH MỤC LỊCH SỬ / NỀN TẢNG (TERTIARY INTENT) ---
        List<RecommendedProductResponse> tertiaryItems = new ArrayList<>();
        if (tertiaryCategory != null && !tertiaryCategory.equalsIgnoreCase(preferredCategory)
                && !tertiaryCategory.equalsIgnoreCase(secondaryCategory)) {
            UUID tertCatId = resolveCategoryId(tertiaryCategory);
            BigDecimal[] tertPrice = getPriceRangeForCategory(tertiaryCategory, categoryPriceStats);
            tertiaryItems = fetchCategoryRecommendations(
                    profileVector, tertCatId, tertiaryCategory, tertPrice[0], tertPrice[1],
                    userCategorySpecMap, excludedIds, Math.max(4, (int) Math.round(safeLimit * 0.35)), false);
        }

        // 7. PHÂN BỔ QUOTA DANH MỤC ĐỘNG THEO LIMIT VÀ SỐ ỨNG VIÊN THỰC TẾ (Issue 6 - P1)
        List<RecommendedProductResponse> finalItems = new ArrayList<>();
        Set<UUID> addedIds = new HashSet<>();

        if (weights.mode() == RecommendationMode.PERSONALIZED) {
            List<List<RecommendedProductResponse>> candidateGroups = new ArrayList<>();
            List<Double> weightsList = new ArrayList<>();

            candidateGroups.add(primaryItems);
            weightsList.add(0.60);

            if (!secondaryItems.isEmpty()) {
                candidateGroups.add(secondaryItems);
                weightsList.add(0.25);
            }
            if (!tertiaryItems.isEmpty()) {
                candidateGroups.add(tertiaryItems);
                weightsList.add(0.15);
            }

            finalItems = allocateDynamicQuota(safeLimit, candidateGroups, weightsList);
            for (RecommendedProductResponse item : finalItems) {
                addedIds.add(item.product().id());
            }
        } else {
            // Chế độ EXPLORING: phân bổ theo tỷ lệ vectorWeight
            int targetPersonalizedCount = (int) Math.round(safeLimit * weights.vectorWeight());
            if (targetPersonalizedCount == 0 && !primaryItems.isEmpty()) {
                targetPersonalizedCount = 1;
            }
            for (RecommendedProductResponse item : primaryItems) {
                if (finalItems.size() >= targetPersonalizedCount) break;
                if (addedIds.add(item.product().id())) {
                    finalItems.add(item);
                }
            }
        }

        // Bổ sung các sản phẩm nổi bật / thịnh hành nếu catalog chưa đủ số lượng yêu cầu
        if (finalItems.size() < safeLimit) {
            Set<UUID> excludeForFallback = new HashSet<>(excludedIds);
            excludeForFallback.addAll(addedIds);

            List<RecommendedProductResponse> fallbackItems = coldStartService.getColdStartRecommendations(
                    excludeForFallback, safeLimit - finalItems.size());

            for (RecommendedProductResponse item : fallbackItems) {
                if (addedIds.add(item.product().id())) {
                    finalItems.add(item);
                }
                if (finalItems.size() >= safeLimit) break;
            }
        }

        return PersonalizedRecommendationResponse.builder()
                .mode(weights.mode())
                .title(weights.title())
                .subtitle(weights.subtitle())
                .interactionCount(interactionCount)
                .preferredCategory(preferredCategory)
                .items(finalItems)
                .build();
    }

    /**
     * Thuật toán phân bổ Quota danh mục động theo limit, trọng số danh mục và số ứng viên thực tế (Issue 6 - P1).
     * Hoàn toàn thích ứng với mọi limit từ 1 đến 24 mà không bị bó buộc vào các tỷ lệ cố định.
     */
    private List<RecommendedProductResponse> allocateDynamicQuota(
            int totalLimit,
            List<List<RecommendedProductResponse>> categoryCandidates,
            List<Double> categoryWeights) {

        List<RecommendedProductResponse> result = new ArrayList<>();
        Set<UUID> chosenIds = new HashSet<>();
        int n = categoryCandidates.size();
        if (n == 0 || totalLimit <= 0) {
            return result;
        }

        int[] available = new int[n];
        for (int i = 0; i < n; i++) {
            available[i] = categoryCandidates.get(i).size();
        }

        // Tính tổng trọng số của các danh mục thực sự có ứng viên khả dụng
        double totalWeight = 0.0;
        for (int i = 0; i < n; i++) {
            if (available[i] > 0) {
                totalWeight += categoryWeights.get(i);
            }
        }

        if (totalWeight <= 0) {
            return result;
        }

        // Vòng 1: Tính quota ban đầu dựa theo tỷ trọng và giới hạn bởi số ứng viên thực tế
        int[] allocated = new int[n];
        int totalAllocated = 0;
        for (int i = 0; i < n; i++) {
            if (available[i] > 0) {
                int targetQuota = (int) Math.round(totalLimit * (categoryWeights.get(i) / totalWeight));
                if (targetQuota == 0 && totalAllocated < totalLimit) {
                    targetQuota = 1;
                }
                allocated[i] = Math.min(targetQuota, available[i]);
                totalAllocated += allocated[i];
            }
        }

        // Vòng 2: Tái phân bổ slot dư cho các danh mục còn ứng viên (Capacity-Aware Redistribution)
        while (totalAllocated < totalLimit) {
            boolean anyAssigned = false;
            for (int i = 0; i < n && totalAllocated < totalLimit; i++) {
                if (available[i] > allocated[i]) {
                    allocated[i]++;
                    totalAllocated++;
                    anyAssigned = true;
                }
            }
            if (!anyAssigned) {
                break;
            }
        }

        // Cắt giảm nếu tổng làm tròn vượt quá totalLimit
        while (totalAllocated > totalLimit) {
            boolean anyReduced = false;
            for (int i = n - 1; i >= 0 && totalAllocated > totalLimit; i--) {
                if (allocated[i] > 0) {
                    allocated[i]--;
                    totalAllocated--;
                    anyReduced = true;
                }
            }
            if (!anyReduced) break;
        }

        // Trích xuất các sản phẩm theo đúng quota phân bổ
        for (int i = 0; i < n; i++) {
            List<RecommendedProductResponse> candidates = categoryCandidates.get(i);
            int count = 0;
            for (RecommendedProductResponse item : candidates) {
                if (count >= allocated[i] || result.size() >= totalLimit) {
                    break;
                }
                if (chosenIds.add(item.product().id())) {
                    result.add(item);
                    count++;
                }
            }
        }

        return result;
    }

    private List<RecommendedProductResponse> fetchCategoryRecommendations(
            float[] profileVector,
            UUID categoryId,
            String categoryName,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Map<String, Set<String>> userCategorySpecMap,
            Set<UUID> excludedIds,
            int fetchLimit,
            boolean isPrimary) {

        List<ProductEmbeddingRepository.SimilarProduct> vectorMatches = new ArrayList<>();

        // Tầng 1: Đúng danh mục và trong tầm giá mục tiêu
        if (categoryId != null && minPrice != null && maxPrice != null && maxPrice.compareTo(minPrice) > 0) {
            vectorMatches = embeddingRepository.findSimilarToVector(
                    profileVector, categoryId, minPrice, maxPrice, new ArrayList<>(excludedIds), fetchLimit);
        }

        // Tầng 2: Nới lỏng giới hạn giá trong cùng danh mục nếu chưa đủ
        if (vectorMatches.size() < fetchLimit && categoryId != null) {
            List<ProductEmbeddingRepository.SimilarProduct> widerMatches = embeddingRepository.findSimilarToVector(
                    profileVector, categoryId, null, null, new ArrayList<>(excludedIds), fetchLimit);
            Set<UUID> existingIds = vectorMatches.stream()
                    .map(ProductEmbeddingRepository.SimilarProduct::id)
                    .collect(Collectors.toSet());
            for (ProductEmbeddingRepository.SimilarProduct m : widerMatches) {
                if (existingIds.add(m.id())) {
                    vectorMatches.add(m);
                }
            }
        }

        // Tầng 3: Nếu là danh mục chính mà vẫn chưa đủ -> mở rộng toàn bộ catalog
        if (isPrimary && vectorMatches.size() < fetchLimit) {
            List<ProductEmbeddingRepository.SimilarProduct> generalMatches = embeddingRepository.findSimilarToVector(
                    profileVector, new ArrayList<>(excludedIds), fetchLimit);
            Set<UUID> existingIds = vectorMatches.stream()
                    .map(ProductEmbeddingRepository.SimilarProduct::id)
                    .collect(Collectors.toSet());
            for (ProductEmbeddingRepository.SimilarProduct m : generalMatches) {
                if (existingIds.add(m.id())) {
                    vectorMatches.add(m);
                }
            }
        }

        List<UUID> candidateIds = vectorMatches.stream()
                .map(ProductEmbeddingRepository.SimilarProduct::id)
                .toList();

        if (candidateIds.isEmpty()) {
            return Collections.emptyList();
        }

        Map<UUID, Double> simMap = vectorMatches.stream()
                .collect(Collectors.toMap(
                        ProductEmbeddingRepository.SimilarProduct::id,
                        ProductEmbeddingRepository.SimilarProduct::similarity,
                        (a, b) -> Math.max(a, b)));

        List<Product> candidateProducts = productRepository.findAllById(candidateIds).stream()
                .filter(Product::isActive)
                .filter(p -> p.getCategory() != null && p.getCategory().isActive())
                .filter(p -> p.getStockQuantity() > 0)
                .toList();

        List<String> targetCategories = (categoryName != null && !categoryName.isBlank())
                ? List.of(categoryName)
                : Collections.emptyList();

        return rankingEngine.rankPersonalized(
                candidateProducts,
                simMap,
                targetCategories,
                minPrice,
                maxPrice,
                userCategorySpecMap,
                excludedIds,
                fetchLimit);
    }

    private UUID resolveCategoryId(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            return null;
        }
        final String name = categoryName.trim();
        return categoryRepository.findByNameIgnoreCase(name)
                .or(() -> categoryRepository.findFirstByNameContainingIgnoreCase(name))
                .map(Category::getId)
                .orElse(null);
    }

    private BigDecimal[] getPriceRangeForCategory(String categoryName, Map<String, double[]> statsMap) {
        if (categoryName == null || statsMap == null) {
            return new BigDecimal[] { null, null };
        }
        double[] stats = statsMap.get(categoryName.trim().toLowerCase());
        if (stats != null && stats[1] > 0) {
            double avg = stats[0] / stats[1];
            BigDecimal min = BigDecimal.valueOf(Math.max(0, avg * 0.65));
            BigDecimal max = BigDecimal.valueOf(avg * 1.45);
            return new BigDecimal[] { min, max };
        }
        return new BigDecimal[] { null, null };
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfileSummary(UUID userId, String sessionId) {
        Optional<UserRecommendationProfile> profileOpt = userProfileService.findProfile(userId, sessionId);

        int count = profileOpt.map(UserRecommendationProfile::getInteractionCount).orElse(0);
        List<String> categories = profileOpt
                .map(p -> parseCategories(p.getFavoriteCategories()))
                .orElse(Collections.emptyList());

        String primaryCategory = categories.isEmpty() ? null : categories.get(0);
        BehaviorScoringService.ScoringWeights weights = scoringService.calculateWeights(count, primaryCategory);

        boolean hasVector = false;
        if (profileOpt.isPresent()) {
            float[] vec = userProfileService.getProfileVector(profileOpt.get().getId());
            hasVector = vec != null && vec.length > 0;
        }

        return UserProfileResponse.builder()
                .userId(userId)
                .sessionId(sessionId)
                .interactionCount(count)
                .mode(weights.mode())
                .favoriteCategories(categories)
                .preferredPriceMin(profileOpt.map(UserRecommendationProfile::getPreferredPriceMin).orElse(BigDecimal.ZERO))
                .preferredPriceMax(profileOpt.map(UserRecommendationProfile::getPreferredPriceMax).orElse(BigDecimal.ZERO))
                .lastActiveAt(profileOpt.map(UserRecommendationProfile::getLastActiveAt).orElse(null))
                .hasProfileVector(hasVector)
                .build();
    }

    private List<String> parseCategories(String json) {
        if (json == null || json.isBlank() || "[]".equals(json.trim())) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
