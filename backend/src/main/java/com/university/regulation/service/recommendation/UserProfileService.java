package com.university.regulation.service.recommendation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.ObjectMapper;
import com.university.regulation.models.product.Product;
import com.university.regulation.models.recommendation.InteractionEventType;
import com.university.regulation.models.recommendation.UserInteractionEvent;
import com.university.regulation.models.recommendation.UserRecommendationProfile;
import com.university.regulation.models.user.User;
import com.university.regulation.repository.ProductEmbeddingRepository;
import com.university.regulation.repository.UserInteractionRepository;
import com.university.regulation.repository.UserRecommendationProfileRepository;
import com.university.regulation.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class UserProfileService {

    private static final int VECTOR_DIM = 384;
    private static final double HALF_LIFE_SECONDS = 7.0 * 24 * 3600; // 7 ngày
    private static final double LN2 = Math.log(2.0);

    private final UserInteractionRepository interactionRepository;
    private final UserRecommendationProfileRepository profileRepository;
    private final ProductEmbeddingRepository embeddingRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ExecutorService aiExecutor;
    private final org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    private final Set<String> inFlightProfiles = ConcurrentHashMap.newKeySet();

    public UserProfileService(
            UserInteractionRepository interactionRepository,
            UserRecommendationProfileRepository profileRepository,
            ProductEmbeddingRepository embeddingRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper,
            @Qualifier("aiExecutor") ExecutorService aiExecutor,
            org.springframework.transaction.PlatformTransactionManager transactionManager) {
        this.interactionRepository = interactionRepository;
        this.profileRepository = profileRepository;
        this.embeddingRepository = embeddingRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.aiExecutor = aiExecutor;
        this.transactionTemplate = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
    }

    @Transactional(readOnly = true)
    public Optional<UserRecommendationProfile> findProfile(UUID userId, String sessionId) {
        if (userId != null) {
            Optional<UserRecommendationProfile> byUser = profileRepository.findByUserId(userId);
            if (byUser.isPresent()) {
                return byUser;
            }
        }
        if (sessionId != null && !sessionId.isBlank()) {
            return profileRepository.findBySessionId(sessionId);
        }
        return Optional.empty();
    }

    public float[] getProfileVector(UUID profileId) {
        if (profileId == null) {
            return null;
        }
        return embeddingRepository.getUserProfileVector(profileId);
    }

    public void updateProfileAsync(UUID userId, String sessionId) {
        String key = (userId != null ? userId.toString() : "") + ":" + (sessionId != null ? sessionId : "");
        if (!inFlightProfiles.add(key)) {
            return;
        }

        aiExecutor.submit(() -> {
            int maxAttempts = 3;
            long backoffMs = 200;
            boolean success = false;
            try {
                for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        transactionTemplate.executeWithoutResult(status -> {
                            recalculateProfile(userId, sessionId);
                        });
                        success = true;
                        break;
                    } catch (Exception ex) {
                        log.warn("Thử cập nhật hồ sơ thất bại lần {}/{} cho user {} / session {}: {}",
                                attempt, maxAttempts, userId, sessionId, ex.getMessage());
                        if (attempt < maxAttempts) {
                            try {
                                Thread.sleep(backoffMs * attempt);
                            } catch (InterruptedException ie) {
                                Thread.currentThread().interrupt();
                                break;
                            }
                        }
                    }
                }
                if (!success) {
                    log.error("Không thể cập nhật hồ sơ cá nhân hóa sau {} lần thử cho user {} / session {}",
                            maxAttempts, userId, sessionId);
                }
            } finally {
                inFlightProfiles.remove(key);
            }
        });
    }

    /**
     * HỢP NHẤT PHIÊN KHÁCH VÀO TÀI KHOẢN (Guest-to-User Session Migration & Profile Merge):
     * Khi khách vãng lai đã duyệt web (xem, click, thích sản phẩm) rồi đăng nhập vào tài khoản:
     * 1. Cập nhật quyền sở hữu (user_id) cho toàn bộ các tương tác từ guest session.
     * 2. Xóa hồ sơ tạm của guest session để tránh rác database.
     * 3. Kích hoạt tính toán lại Profile cho User để gợi ý cá nhân hóa ngay lập tức phản ánh các sản phẩm vừa xem.
     */
    @Transactional
    public void mergeGuestSessionToUser(UUID userId, String guestSessionId) {
        if (userId == null || guestSessionId == null || guestSessionId.isBlank()) {
            return;
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }

        int mergedCount = interactionRepository.mergeGuestInteractionsToUser(user, guestSessionId);
        log.info("Đã hợp nhất {} tương tác từ phiên khách {} vào tài khoản user {}", mergedCount, guestSessionId, userId);

        profileRepository.findBySessionId(guestSessionId).ifPresent(guestProfile -> {
            try {
                profileRepository.delete(guestProfile);
            } catch (Exception e) {
                log.warn("Lỗi khi dọn dẹp guest profile tạm {}: {}", guestProfile.getId(), e.getMessage());
            }
        });

        if (mergedCount > 0) {
            updateProfileAsync(userId, "u:" + userId.toString());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UserRecommendationProfile recalculateProfile(UUID userId, String sessionId) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime since = now.minusDays(30);

        List<UserInteractionEvent> interactions = interactionRepository.findRecentInteractions(
                userId, sessionId, since, PageRequest.of(0, 100));

        final User user = (userId != null)
                ? userRepository.findById(userId).orElse(null)
                : null;

        UserRecommendationProfile profile = findProfile(userId, sessionId).orElseGet(() -> {
            UserRecommendationProfile newProfile = UserRecommendationProfile.builder()
                    .user(user)
                    .sessionId(sessionId)
                    .favoriteCategories("[]")
                    .preferredPriceMin(BigDecimal.ZERO)
                    .preferredPriceMax(BigDecimal.ZERO)
                    .interactionCount(0)
                    .lastActiveAt(now)
                    .build();
            return profileRepository.save(newProfile);
        });

        if (user != null && profile.getUser() == null) {
            profile.setUser(user);
        }
        if (sessionId != null && profile.getSessionId() == null) {
            profile.setSessionId(sessionId);
        }

        if (interactions.isEmpty()) {
            profile.setInteractionCount(0);
            profile.setLastActiveAt(now);
            return profileRepository.save(profile);
        }

        List<UUID> productIds = interactions.stream()
                .map(e -> e.getProduct().getId())
                .distinct()
                .toList();

        Map<UUID, float[]> embeddings = embeddingRepository.getProductEmbeddings(productIds);
        Map<String, CategoryProfile> categoryMap = new HashMap<>();

        for (int idx = 0; idx < interactions.size(); idx++) {
            UserInteractionEvent event = interactions.get(idx);
            Product p = event.getProduct();
            if (p == null) {
                continue;
            }

            int duration = event.getDurationSeconds() != null ? event.getDurationSeconds() : 0;
            boolean isHighIntent = (event.getEventType() == InteractionEventType.FAVORITE
                    || event.getEventType() == InteractionEventType.ADD_TO_CART
                    || event.getEventType() == InteractionEventType.PURCHASE
                    || duration >= 8);

            // 1. Phân loại trọng số theo mức độ chú ý thực tế (Dwell & Intent Weighting)
            double eventWeight;
            if (event.getEventType() == InteractionEventType.PURCHASE) {
                eventWeight = 6.0;
            } else if (event.getEventType() == InteractionEventType.ADD_TO_CART) {
                eventWeight = 4.5;
            } else if (event.getEventType() == InteractionEventType.FAVORITE) {
                eventWeight = 3.5;
            } else if (event.getEventType() == InteractionEventType.VIEW || event.getEventType() == InteractionEventType.PRODUCT_VIEW) {
                if (duration > 0 && duration < 3) {
                    eventWeight = 0.15; // Click nhầm / thoát ngay dưới 3s (bounced noise)
                } else if (duration < 6) {
                    eventWeight = 0.50; // Xem lướt nhanh
                } else if (duration >= 15) {
                    eventWeight = 1.80; // Đọc thông số chi tiết, quan tâm cao
                } else {
                    eventWeight = 1.0;  // Xem chuẩn
                }
            } else {
                eventWeight = 0.80;
            }

            // 2. Phân rã thời gian dài hạn (Long-term temporal decay)
            OffsetDateTime eventTime = event.getCreatedAt() != null ? event.getCreatedAt() : now;
            long deltaSeconds = Math.max(0, ChronoUnit.SECONDS.between(eventTime, now));
            double decay = Math.exp(-1.0 * (LN2 * deltaSeconds) / HALF_LIFE_SECONDS);

            // 3. Đường cong Recency phiên có chặn đáy (Bounded Session Recency)
            // Giữ lại ít nhất 55% trọng số cho các hành vi trước đó trong cùng phiên,
            // ngăn chặn 10 lượt xem lướt linh tinh xóa sạch 5 lần xem laptop trước đó!
            double recencyFactor = 0.55 + 0.45 * Math.pow(0.95, idx);
            double finalWeight = eventWeight * decay * recencyFactor;

            String catName = (p.getCategory() != null && p.getCategory().getName() != null)
                    ? p.getCategory().getName().trim()
                    : "Khác";

            CategoryProfile cp = categoryMap.computeIfAbsent(catName, CategoryProfile::new);
            cp.count++;
            if (isHighIntent) {
                cp.highIntentCount++;
            }
            cp.totalDurationSeconds += duration;
            cp.totalWeight += finalWeight;

            if (p.getPrice() != null && p.getPrice().signum() > 0) {
                cp.totalPriceWeighted += p.getPrice().doubleValue() * finalWeight;
                cp.totalPriceWeight += finalWeight;
            }

            float[] vec = embeddings.get(p.getId());
            if (vec != null && vec.length == VECTOR_DIM) {
                for (int i = 0; i < VECTOR_DIM; i++) {
                    cp.vectorAccumulator[i] += (float) (vec[i] * finalWeight);
                }
                cp.vectorWeight += finalWeight;
            }
        }

        // 4. MẬT ĐỘ Ý ĐỊNH & THƯỞNG LẶP LẠI (Category Intent Density & Confidence Multiplier)
        // Nếu một danh mục chỉ xem lướt nhanh không dừng lại (avgDwell < 3.5s, 0 highIntent):
        // áp dụng hệ số phạt nhiễu x0.10 (Bounced/Skimming Noise Suppression).
        // Nếu danh mục được nghiên cứu sâu (avgDwell >= 6s hoặc có highIntent):
        // áp dụng hệ số củng cố ý định x1.6+.
        double sumAdjustedWeight = 0.0;
        for (CategoryProfile cp : categoryMap.values()) {
            double multiplier;
            if (cp.highIntentCount >= 1) {
                multiplier = 2.5; // Tương tác sâu (Wishlist, Cart, Favorite, Dwell dài)
            } else if (cp.count >= 3) {
                multiplier = 1.6 + 0.1 * Math.min(cp.count, 5); // Xem từ 3 sản phẩm -> quan tâm rõ ràng
            } else if (cp.count == 2) {
                multiplier = 1.2; // Xem 2 sản phẩm -> có ý định so sánh
            } else if (cp.totalDurationSeconds < 3 && cp.count <= 1) {
                multiplier = 0.20; // 1 click lướt qua dưới 3s
            } else {
                multiplier = 0.60;
            }
            cp.adjustedWeight = cp.totalWeight * multiplier;
            sumAdjustedWeight += cp.adjustedWeight;
        }

        // 5. BỘ LỌC NHIỄU HÀNH VI ĐA TẦNG (Multi-Tier Behavior Noise Filtering)
        final double totalConf = sumAdjustedWeight;
        final int totalCategories = categoryMap.size();

        List<CategoryProfile> validCategories = categoryMap.values().stream()
                .filter(cp -> {
                    if (totalCategories <= 1) {
                        return true;
                    }
                    double ratio = totalConf > 0 ? (cp.adjustedWeight / totalConf) : 0.0;
                    // Chỉ lọc nhiễu nếu chỉ xem 1 lần duy nhất (count <= 1) VÀ không có hành vi sâu VÀ tỷ trọng < 12%
                    boolean isSingleCasualClick = cp.highIntentCount == 0 && cp.count <= 1 && ratio < 0.12;
                    boolean isMicroNoise = cp.highIntentCount == 0 && ratio < 0.03;
                    return !(isSingleCasualClick || isMicroNoise);
                })
                .sorted((a, b) -> Double.compare(b.adjustedWeight, a.adjustedWeight))
                .collect(Collectors.toList());

        if (validCategories.isEmpty()) {
            validCategories = categoryMap.values().stream()
                    .sorted((a, b) -> Double.compare(b.adjustedWeight, a.adjustedWeight))
                    .collect(Collectors.toList());
        }

        // 6. PHÂN CỤM Ý ĐỊNH SẮC NÉT (Primary, Secondary, Tertiary Intent Clusters)
        CategoryProfile primary = validCategories.get(0);
        CategoryProfile secondary = (validCategories.size() > 1 && validCategories.get(1).adjustedWeight >= primary.adjustedWeight * 0.18)
                ? validCategories.get(1)
                : null;
        CategoryProfile tertiary = (validCategories.size() > 2 && validCategories.get(2).adjustedWeight >= primary.adjustedWeight * 0.12)
                ? validCategories.get(2)
                : null;

        float[] primaryVec = primary.getNormalizedVector();
        float[] secondaryVec = secondary != null ? secondary.getNormalizedVector() : null;
        float[] tertiaryVec = tertiary != null ? tertiary.getNormalizedVector() : null;

        float[] normalizedVector = null;
        if (primaryVec != null && secondaryVec != null && tertiaryVec != null) {
            // 3 cụm ý định rõ ràng (ví dụ: Điện thoại 55% + Laptop 25% + Tai nghe 20%)
            float[] blended = new float[VECTOR_DIM];
            double sumSq = 0.0;
            for (int i = 0; i < VECTOR_DIM; i++) {
                blended[i] = 0.55f * primaryVec[i] + 0.25f * secondaryVec[i] + 0.20f * tertiaryVec[i];
                sumSq += blended[i] * blended[i];
            }
            double norm = Math.sqrt(sumSq);
            if (norm > 1e-6) {
                normalizedVector = new float[VECTOR_DIM];
                for (int i = 0; i < VECTOR_DIM; i++) {
                    normalizedVector[i] = (float) (blended[i] / norm);
                }
            }
        } else if (primaryVec != null && secondaryVec != null) {
            // 2 cụm ý định (75% danh mục chính + 25% danh mục bổ trợ)
            float[] blended = new float[VECTOR_DIM];
            double sumSq = 0.0;
            for (int i = 0; i < VECTOR_DIM; i++) {
                blended[i] = 0.75f * primaryVec[i] + 0.25f * secondaryVec[i];
                sumSq += blended[i] * blended[i];
            }
            double norm = Math.sqrt(sumSq);
            if (norm > 1e-6) {
                normalizedVector = new float[VECTOR_DIM];
                for (int i = 0; i < VECTOR_DIM; i++) {
                    normalizedVector[i] = (float) (blended[i] / norm);
                }
            }
        } else if (primaryVec != null) {
            // 100% vector thuần chất của danh mục chủ đạo
            normalizedVector = primaryVec;
        }

        // 7. LƯU DANH MỤC ƯA THÍCH (Chỉ giữ các danh mục ý định đã được làm sạch, tối đa 3 cụm)
        List<String> topCategories = validCategories.stream()
                .limit(3)
                .map(cp -> cp.categoryName)
                .collect(Collectors.toList());

        try {
            profile.setFavoriteCategories(objectMapper.writeValueAsString(topCategories));
        } catch (Exception e) {
            profile.setFavoriteCategories("[]");
        }

        // 8. TẦM GIÁ QUAN TÂM: Tính riêng theo danh mục chủ đạo (không bị kéo tụt bởi phụ kiện rẻ tiền)
        if (primary.totalPriceWeight > 0) {
            double avgPrice = primary.totalPriceWeighted / primary.totalPriceWeight;
            BigDecimal minPrice = BigDecimal.valueOf(Math.max(0, avgPrice * 0.65));
            BigDecimal maxPrice = BigDecimal.valueOf(avgPrice * 1.45);
            profile.setPreferredPriceMin(minPrice);
            profile.setPreferredPriceMax(maxPrice);
        }

        profile.setInteractionCount(interactions.size());
        profile.setLastActiveAt(now);
        UserRecommendationProfile saved = profileRepository.save(profile);

        if (normalizedVector != null) {
            embeddingRepository.saveUserProfileVector(saved.getId(), normalizedVector);
        }

        return saved;
    }

    public static class CategoryProfile {
        public final String categoryName;
        public int count = 0;
        public int highIntentCount = 0;
        public int totalDurationSeconds = 0;
        public double totalWeight = 0.0;
        public double adjustedWeight = 0.0;
        public double totalPriceWeighted = 0.0;
        public double totalPriceWeight = 0.0;
        public final float[] vectorAccumulator = new float[VECTOR_DIM];
        public double vectorWeight = 0.0;

        public CategoryProfile(String categoryName) {
            this.categoryName = categoryName;
        }

        public float[] getNormalizedVector() {
            if (vectorWeight <= 0) {
                return null;
            }
            double sumSquares = 0.0;
            float[] result = new float[VECTOR_DIM];
            for (int i = 0; i < VECTOR_DIM; i++) {
                result[i] = (float) (vectorAccumulator[i] / vectorWeight);
                sumSquares += result[i] * result[i];
            }
            double norm = Math.sqrt(sumSquares);
            if (norm <= 1e-6) {
                return null;
            }
            for (int i = 0; i < VECTOR_DIM; i++) {
                result[i] = (float) (result[i] / norm);
            }
            return result;
        }
    }
}
