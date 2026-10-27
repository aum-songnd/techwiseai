package com.university.regulation.service.recommendation;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.university.regulation.dto.products.ProductResponse;
import com.university.regulation.dto.products.RecommendedProductResponse;
import com.university.regulation.models.product.Product;
import com.university.regulation.service.ProductService;
import com.university.regulation.service.ProductSpecReader;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * UNIFIED RANKING ENGINE (Bộ điều phối và xếp hạng gợi ý thống nhất)
 * 
 * Hạt nhân tính điểm đa tiêu chí (Multi-Factor Scoring) trong kiến trúc TechWiseAI:
 * 
 * 1. S_vector: Cosine similarity từ Sentence Embedding (all-MiniLM-L6-v2 384D) đo lường thực tế.
 *    - Phân biệt rõ sản phẩm có similarity thực với sản phẩm thiếu embedding (P1 - Issue 3).
 *    - Không gán 0.50 giả định. Nếu thiếu embedding, sVector = 0.0 và chuẩn hóa lại trọng số 3 tiêu chí còn lại.
 * 
 * 2. S_behavior: Mức độ cộng hưởng hành vi (Primary, Secondary, Tertiary category affinity).
 * 
 * 3. S_price: Mức độ tương thích phân khúc ngân sách người dùng.
 * 
 * 4. S_spec: Độ tương đồng cấu hình cá nhân hóa theo từng loại thiết bị (P1 - Issue 4).
 *    - Phân chia đặc trưng theo danh mục: Laptop (ultrabook vs gaming, RAM, GPU), Smartphone (ROM, 120Hz, OIS, OS),
 *      Audio (TWS, ANC), Phụ kiện (Wireless, Ergonomic).
 *    - So sánh cấu hình ứng viên với gu người dùng TRONG ĐÚNG DANH MỤC ĐÓ, tránh so lệch giữa laptop và điện thoại.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UnifiedRankingEngine {

    private final ProductService productService;
    private final ProductSpecReader specReader;

    public enum DeviceGroup {
        LAPTOP("laptop"),
        SMARTPHONE("smartphone"),
        AUDIO("audio"),
        ACCESSORY("accessory"),
        OTHER("other");

        private final String code;

        DeviceGroup(String code) {
            this.code = code;
        }

        public String getCode() {
            return code;
        }
    }

    public record CandidateScore(
            Product product,
            double vectorSim,
            boolean hasVectorSim,
            double behaviorAffinity,
            double priceScore,
            double specScore,
            double totalScore,
            String reason,
            String badge
    ) {}

    public List<RecommendedProductResponse> rankPersonalized(
            List<Product> candidates,
            Map<UUID, Double> vectorSimMap,
            List<String> userCategories,
            BigDecimal preferredPriceMin,
            BigDecimal preferredPriceMax,
            Set<UUID> excludedIds,
            int targetLimit) {
        return rankPersonalized(candidates, vectorSimMap, userCategories, preferredPriceMin, preferredPriceMax,
                Collections.emptyMap(), excludedIds, targetLimit);
    }

    public List<RecommendedProductResponse> rankPersonalized(
            List<Product> candidates,
            Map<UUID, Double> vectorSimMap,
            List<String> userCategories,
            BigDecimal preferredPriceMin,
            BigDecimal preferredPriceMax,
            Set<String> flatPreferredSpecTokens,
            Set<UUID> excludedIds,
            int targetLimit) {
        Map<String, Set<String>> categorySpecMap = partitionSpecTokensByGroup(flatPreferredSpecTokens);
        return rankPersonalized(candidates, vectorSimMap, userCategories, preferredPriceMin, preferredPriceMax,
                categorySpecMap, excludedIds, targetLimit);
    }

    /**
     * Xếp hạng danh sách ứng viên cá nhân hóa dựa trên tổ hợp đa nhân tố và sở thích cấu hình theo danh mục.
     */
    public List<RecommendedProductResponse> rankPersonalized(
            List<Product> candidates,
            Map<UUID, Double> vectorSimMap,
            List<String> userCategories,
            BigDecimal preferredPriceMin,
            BigDecimal preferredPriceMax,
            Map<String, Set<String>> userCategorySpecMap,
            Set<UUID> excludedIds,
            int targetLimit) {

        if (candidates == null || candidates.isEmpty()) {
            return Collections.emptyList();
        }

        String primaryCat = (userCategories != null && !userCategories.isEmpty()) ? userCategories.get(0).toLowerCase() : null;
        String secondaryCat = (userCategories != null && userCategories.size() > 1) ? userCategories.get(1).toLowerCase() : null;
        String tertiaryCat = (userCategories != null && userCategories.size() > 2) ? userCategories.get(2).toLowerCase() : null;

        List<CandidateScore> scoredList = new ArrayList<>();
        Set<UUID> excluded = excludedIds != null ? excludedIds : Set.of();

        for (Product p : candidates) {
            if (p == null || !p.isActive() || p.getStockQuantity() <= 0 || excluded.contains(p.getId())) {
                continue;
            }

            // 1. S_vector: Cosine similarity từ Sentence Embedding (Issue 3 - P1)
            // Phân biệt rõ ràng giữa sản phẩm có vector thực với sản phẩm thiếu embedding.
            Double rawSim = (vectorSimMap != null) ? vectorSimMap.get(p.getId()) : null;
            boolean hasVectorSim = (rawSim != null && !Double.isNaN(rawSim));
            double sVector = hasVectorSim ? Math.max(0.0, Math.min(1.0, rawSim)) : 0.0;

            // 2. S_behavior: Mức độ tương thích danh mục yêu thích
            double sBehavior = 0.35;
            String catName = (p.getCategory() != null && p.getCategory().getName() != null)
                    ? p.getCategory().getName().trim().toLowerCase()
                    : "";

            if (primaryCat != null && catName.contains(primaryCat)) {
                sBehavior = 1.00;
            } else if (secondaryCat != null && catName.contains(secondaryCat)) {
                sBehavior = 0.85;
            } else if (tertiaryCat != null && catName.contains(tertiaryCat)) {
                sBehavior = 0.70;
            }

            // 3. S_price: Mức độ tương thích khoảng giá người dùng
            double sPrice = calculatePriceScore(p.getPrice(), preferredPriceMin, preferredPriceMax);

            // 4. S_spec: Độ tương đồng cấu hình cá nhân hóa theo từng loại thiết bị (Issue 4 - P1)
            double sSpec = calculateCategorySpecScore(p, userCategorySpecMap);

            // TỔNG HỢP TRỌNG SỐ ĐỘNG (Dynamic Weight Normalization - Issue 3):
            double totalScore;
            if (hasVectorSim) {
                // Đủ 4 tiêu chí: 50% Vector ngữ nghĩa, 25% Hành vi danh mục, 15% Ngân sách, 10% Cấu hình
                totalScore = (0.50 * sVector) + (0.25 * sBehavior) + (0.15 * sPrice) + (0.10 * sSpec);
            } else {
                // Thiếu embedding: sVector = 0.0; Chuẩn hóa lại 3 tiêu chí đo được và nhân hệ số suy giảm thiếu bằng chứng vector (0.85)
                // wb' = 0.25/0.50 = 0.50; wp' = 0.15/0.50 = 0.30; ws' = 0.10/0.50 = 0.20
                totalScore = 0.85 * ((0.50 * sBehavior) + (0.30 * sPrice) + (0.20 * sSpec));
            }

            // Diễn giải lý do đề xuất (Explainable AI - XAI)
            int matchPercent = (int) Math.round(totalScore * 100);
            String reason;
            if (primaryCat != null && catName.contains(primaryCat)) {
                reason = "Phù hợp " + matchPercent + "% theo gu công nghệ và tầm giá bạn tìm kiếm";
            } else if (secondaryCat != null && catName.contains(secondaryCat)) {
                reason = "Gợi ý " + (p.getCategory() != null ? p.getCategory().getName() : "thiết bị") + " đồng bộ hệ sinh thái của bạn";
            } else {
                reason = "Cấu hình nổi bật tương thích với phân khúc bạn quan tâm (" + matchPercent + "%)";
            }

            scoredList.add(new CandidateScore(
                    p, sVector, hasVectorSim, sBehavior, sPrice, sSpec, totalScore, reason, null
            ));
        }

        // Sắp xếp giảm dần theo totalScore
        scoredList.sort((a, b) -> Double.compare(b.totalScore(), a.totalScore()));

        // Chuyển đổi sang RecommendedProductResponse với phân bổ vị trí & huy hiệu
        List<RecommendedProductResponse> results = new ArrayList<>();
        Set<UUID> addedIds = new HashSet<>();

        int rank = 0;
        for (CandidateScore cs : scoredList) {
            if (results.size() >= targetLimit) {
                break;
            }
            if (!addedIds.add(cs.product().getId())) {
                continue;
            }

            try {
                ProductResponse response = productService.toResponse(cs.product());
                Map<String, String> keySpecs = specReader.keySpecs(specReader.flatten(cs.product().getSpecifications()));

                String badge = rank == 0 ? "FOR_YOU" : (rank < 3 ? "CHOICE" : null);

                results.add(new RecommendedProductResponse(
                        response,
                        badge,
                        cs.reason(),
                        keySpecs,
                        Math.round(cs.totalScore() * 100.0) / 100.0
                ));
                rank++;
            } catch (Exception e) {
                log.warn("Lỗi khi serialize sản phẩm ứng viên {}: {}", cs.product().getId(), e.getMessage());
            }
        }

        return results;
    }

    /**
     * Tính điểm tương thích giá theo phân khúc giá người dùng.
     */
    private double calculatePriceScore(BigDecimal price, BigDecimal minPrice, BigDecimal maxPrice) {
        if (price == null || price.signum() <= 0) {
            return 0.50;
        }
        if (minPrice == null || maxPrice == null || minPrice.signum() <= 0 || maxPrice.signum() <= 0) {
            return 0.85; // Chưa đủ dữ liệu giá, không phạt
        }

        double p = price.doubleValue();
        double pMin = minPrice.doubleValue();
        double pMax = maxPrice.doubleValue();

        if (p >= pMin && p <= pMax) {
            return 1.00;
        } else if (p < pMin) {
            double ratio = p / Math.max(1.0, pMin);
            return Math.max(0.20, ratio);
        } else {
            double ratio = pMax / p;
            return Math.max(0.20, ratio);
        }
    }

    /**
     * Đánh giá độ tương đồng cấu hình cá nhân hóa theo từng loại thiết bị (P1 - Issue 4).
     * So sánh cấu hình ứng viên với gu suy luận của người dùng trong CHÍNH DANH MỤC ĐÓ.
     */
    private double calculateCategorySpecScore(Product candidate, Map<String, Set<String>> userCategorySpecMap) {
        if (candidate == null) {
            return 0.60;
        }

        DeviceGroup group = detectDeviceGroup(candidate);
        Set<String> candidateTokens = extractTokensForDeviceGroup(candidate, group);

        if (candidateTokens.isEmpty()) {
            return 0.65;
        }

        if (userCategorySpecMap == null || userCategorySpecMap.isEmpty()) {
            return 0.70; // Cold start cấu hình: điểm trung tính
        }

        Set<String> userGroupTokens = userCategorySpecMap.get(group.getCode());
        if (userGroupTokens == null || userGroupTokens.isEmpty()) {
            // Người dùng chưa có lịch sử trong danh mục này (cross-category) -> đánh giá chuẩn theo phân khúc
            return 0.70;
        }

        // Đo độ trùng khớp cấu hình giữa ứng viên và gu của người dùng trong cùng loại thiết bị
        long matched = candidateTokens.stream().filter(userGroupTokens::contains).count();
        double overlap = (double) matched / Math.max(1, userGroupTokens.size());

        // Điểm dao động từ 0.35 (hoàn toàn ngược gu: ví dụ user thích ultrabook nhưng ứng viên là máy gaming nặng)
        // lên đến 1.00 (trùng khớp hoàn hảo)
        return Math.min(1.00, 0.35 + 0.65 * overlap);
    }

    /**
     * Phân loại thiết bị dựa vào tên sản phẩm, danh mục và mô tả.
     */
    public static DeviceGroup detectDeviceGroup(Product p) {
        if (p == null) {
            return DeviceGroup.OTHER;
        }
        String cat = (p.getCategory() != null && p.getCategory().getName() != null)
                ? p.getCategory().getName().toLowerCase()
                : "";
        String name = p.getName() != null ? p.getName().toLowerCase() : "";
        String text = cat + " " + name;

        if (text.contains("laptop") || text.contains("macbook") || text.contains("notebook") || text.contains("máy tính xách tay")) {
            return DeviceGroup.LAPTOP;
        }
        if (text.contains("điện thoại") || text.contains("dien thoai") || text.contains("phone") || text.contains("smartphone")
                || text.contains("iphone") || text.contains("galaxy") || text.contains("tablet") || text.contains("ipad")) {
            return DeviceGroup.SMARTPHONE;
        }
        if (text.contains("tai nghe") || text.contains("earphone") || text.contains("headphone") || text.contains("loa")
                || text.contains("speaker") || text.contains("audio") || text.contains("soundbar")) {
            return DeviceGroup.AUDIO;
        }
        if (text.contains("chuột") || text.contains("chuot") || text.contains("bàn phím") || text.contains("ban phim")
                || text.contains("mouse") || text.contains("keyboard") || text.contains("phụ kiện") || text.contains("cáp") || text.contains("sạc")) {
            return DeviceGroup.ACCESSORY;
        }
        return DeviceGroup.OTHER;
    }

    /**
     * Trích xuất các token cấu hình chuyên biệt theo nhóm thiết bị.
     */
    public static Set<String> extractTokensForDeviceGroup(Product p, DeviceGroup group) {
        if (p == null) {
            return Collections.emptySet();
        }
        StringBuilder sb = new StringBuilder();
        if (p.getName() != null) sb.append(p.getName()).append(" ");
        if (p.getShortDescription() != null) sb.append(p.getShortDescription()).append(" ");
        if (p.getSpecifications() != null) {
            for (Map.Entry<String, String> entry : p.getSpecifications().entrySet()) {
                sb.append(entry.getKey()).append(" ").append(entry.getValue()).append(" ");
            }
        }
        String text = sb.toString().toLowerCase();
        Set<String> tokens = new HashSet<>();

        switch (group) {
            case LAPTOP -> {
                // 1. Phân khúc Laptop
                if (text.contains("mỏng nhẹ") || text.contains("slim") || text.contains("ultrabook") || text.contains("văn phòng")) tokens.add("laptop:form:ultrabook");
                if (text.contains("gaming") || text.contains("loq") || text.contains("legion") || text.contains("tuf") || text.contains("rog") || text.contains("predator")) tokens.add("laptop:form:gaming");
                if (text.contains("đồ họa") || text.contains("creator") || text.contains("workstation") || text.contains("proart")) tokens.add("laptop:form:creator");

                // 2. RAM Laptop
                if (text.contains("8gb") || text.contains("8 gb")) tokens.add("laptop:ram:8gb");
                if (text.contains("16gb") || text.contains("16 gb")) tokens.add("laptop:ram:16gb");
                if (text.contains("24gb") || text.contains("32gb") || text.contains("64gb")) tokens.add("laptop:ram:32gb_plus");

                // 3. GPU Laptop
                if (text.contains("rtx") || text.contains("geforce") || text.contains("radeon rx")) tokens.add("laptop:gpu:discrete");
                if (text.contains("tích hợp") || text.contains("iris") || text.contains("intel arc") || text.contains("uhd")) tokens.add("laptop:gpu:integrated");
                if (text.contains("apple") || text.contains("m1") || text.contains("m2") || text.contains("m3") || text.contains("m4")) tokens.add("laptop:gpu:apple_silicon");

                // 4. Màn hình Laptop
                if (text.contains("13 inch") || text.contains("13.") || text.contains("14 inch") || text.contains("14.")) tokens.add("laptop:size:compact");
                if (text.contains("15 inch") || text.contains("15.") || text.contains("16 inch") || text.contains("16.")) tokens.add("laptop:size:large");
            }
            case SMARTPHONE -> {
                // 1. Bộ nhớ trong (ROM) Điện thoại
                if (text.contains("128gb") || text.contains("128 gb")) tokens.add("phone:rom:128gb");
                if (text.contains("256gb") || text.contains("256 gb")) tokens.add("phone:rom:256gb");
                if (text.contains("512gb") || text.contains("1tb") || text.contains("1 tb")) tokens.add("phone:rom:512gb_plus");

                // 2. Màn hình Điện thoại
                if (text.contains("120hz") || text.contains("120 hz") || text.contains("144hz") || text.contains("promotion")) tokens.add("phone:screen:120hz");
                if (text.contains("oled") || text.contains("amoled") || text.contains("super retina") || text.contains("dynamic amoled")) tokens.add("phone:screen:oled");

                // 3. Camera Điện thoại
                if (text.contains("ois") || text.contains("chống rung") || text.contains("tele") || text.contains("tiềm vọng") || text.contains("zoom")) tokens.add("phone:camera:pro_ois");
                if (text.contains("50mp") || text.contains("48mp") || text.contains("108mp") || text.contains("200mp")) tokens.add("phone:camera:high_res");

                // 4. Hệ điều hành / Hệ sinh thái
                if (text.contains("ios") || text.contains("iphone") || text.contains("apple")) tokens.add("phone:os:ios");
                if (text.contains("android") || text.contains("galaxy") || text.contains("xiaomi") || text.contains("oppo")) tokens.add("phone:os:android");

                // 5. Pin & Sạc
                if (text.contains("5000mah") || text.contains("6000mah")) tokens.add("phone:battery:large");
                if (text.contains("67w") || text.contains("80w") || text.contains("100w") || text.contains("120w") || text.contains("sạc nhanh")) tokens.add("phone:battery:fast_charge");
            }
            case AUDIO -> {
                // 1. Phân loại Âm thanh
                if (text.contains("true wireless") || text.contains("tws") || text.contains("in-ear") || text.contains("in ear")) tokens.add("audio:form:tws");
                if (text.contains("over-ear") || text.contains("chụp tai") || text.contains("headphone")) tokens.add("audio:form:overear");
                if (text.contains("loa") || text.contains("speaker") || text.contains("bluetooth")) tokens.add("audio:form:speaker");

                // 2. Tính năng Âm thanh
                if (text.contains("chống ồn") || text.contains("anc") || text.contains("noise cancelling")) tokens.add("audio:feature:anc");
                if (text.contains("hi-res") || text.contains("ldac") || text.contains("spatial")) tokens.add("audio:feature:hires");
                if (text.contains("ipx") || text.contains("chống nước") || text.contains("waterproof")) tokens.add("audio:feature:waterproof");
            }
            case ACCESSORY -> {
                if (text.contains("không dây") || text.contains("wireless") || text.contains("bluetooth")) tokens.add("acc:wireless");
                if (text.contains("cơ") || text.contains("mechanical")) tokens.add("acc:mechanical");
                if (text.contains("công thái học") || text.contains("ergonomic")) tokens.add("acc:ergonomic");
            }
            case OTHER -> {
                if (text.contains("chính hãng")) tokens.add("gen:genuine");
                if (text.contains("bảo hành 24")) tokens.add("gen:warranty24");
            }
        }

        return tokens;
    }

    /**
     * Tương thích ngược: Trích xuất token cấu hình cho sản phẩm.
     */
    public static Set<String> extractSpecTokens(Product p) {
        if (p == null) {
            return Collections.emptySet();
        }
        DeviceGroup group = detectDeviceGroup(p);
        return extractTokensForDeviceGroup(p, group);
    }

    /**
     * Phân nhóm tập token phẳng về từng nhóm thiết bị.
     */
    public static Map<String, Set<String>> partitionSpecTokensByGroup(Set<String> flatTokens) {
        Map<String, Set<String>> result = new HashMap<>();
        if (flatTokens == null || flatTokens.isEmpty()) {
            return result;
        }
        for (String token : flatTokens) {
            if (token == null) continue;
            String lower = token.toLowerCase();
            if (lower.startsWith("laptop:")) {
                result.computeIfAbsent(DeviceGroup.LAPTOP.getCode(), k -> new HashSet<>()).add(token);
            } else if (lower.startsWith("phone:")) {
                result.computeIfAbsent(DeviceGroup.SMARTPHONE.getCode(), k -> new HashSet<>()).add(token);
            } else if (lower.startsWith("audio:")) {
                result.computeIfAbsent(DeviceGroup.AUDIO.getCode(), k -> new HashSet<>()).add(token);
            } else if (lower.startsWith("acc:")) {
                result.computeIfAbsent(DeviceGroup.ACCESSORY.getCode(), k -> new HashSet<>()).add(token);
            } else {
                result.computeIfAbsent(DeviceGroup.OTHER.getCode(), k -> new HashSet<>()).add(token);
            }
        }
        return result;
    }
}
