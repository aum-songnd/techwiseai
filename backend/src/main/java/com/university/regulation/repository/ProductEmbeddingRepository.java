package com.university.regulation.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/**
 * Thao tác với cột products.embedding (pgvector) bằng JDBC để không phải map kiểu vector vào entity.
 * Giả định: bảng "products", các cột id, category_id, active, stock_quantity, price, embedding.
 */
@Repository
@RequiredArgsConstructor
public class ProductEmbeddingRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public record SimilarProduct(UUID id, double similarity) {
    }

    @Transactional
    public void save(UUID productId, float[] vector) {
        jdbc.update(
                "UPDATE products SET embedding = CAST(:vec AS vector) WHERE id = :id",
                Map.of("vec", toLiteral(vector), "id", productId));
    }

    public boolean hasEmbedding(UUID productId) {
        List<Boolean> rows = jdbc.queryForList(
                "SELECT embedding IS NOT NULL FROM products WHERE id = :id",
                Map.of("id", productId),
                Boolean.class);
        return !rows.isEmpty() && Boolean.TRUE.equals(rows.get(0));
    }

    public List<UUID> findIdsWithoutEmbedding(int limit) {
        return jdbc.query(
                "SELECT id FROM products WHERE embedding IS NULL AND active = true LIMIT :limit",
                Map.of("limit", limit),
                (rs, i) -> rs.getObject("id", UUID.class));
    }

    /**
     * Tìm sản phẩm gần nhất (cosine) với sản phẩm đang xem, đã lọc: đang bán, còn hàng,
     * cùng danh mục, trong khoảng giá. similarity = 1 - cosine distance (0..1).
     */
    public List<SimilarProduct> findSimilar(
            UUID productId,
            UUID categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            int limit) {

        String sql = """
                SELECT p.id, 1 - (p.embedding <=> src.embedding) AS similarity
                FROM products p,
                     (SELECT embedding FROM products WHERE id = :id) src
                WHERE p.id <> :id
                  AND p.active = true
                  AND p.stock_quantity > 0
                  AND p.embedding IS NOT NULL
                  AND p.category_id = :categoryId
                  AND p.price BETWEEN :minPrice AND :maxPrice
                ORDER BY p.embedding <=> src.embedding
                LIMIT :limit
                """;

        return jdbc.query(
                sql,
                Map.of(
                        "id", productId,
                        "categoryId", categoryId,
                        "minPrice", minPrice,
                        "maxPrice", maxPrice,
                        "limit", limit),
                (rs, i) -> new SimilarProduct(
                        rs.getObject("id", UUID.class),
                        rs.getDouble("similarity")));
    }

    public float[] getProductEmbedding(UUID productId) {
        List<String> rows = jdbc.query(
                "SELECT embedding::text FROM products WHERE id = :id AND embedding IS NOT NULL",
                Map.of("id", productId),
                (rs, i) -> rs.getString(1));
        if (rows.isEmpty() || rows.get(0) == null) {
            return null;
        }
        return parseVector(rows.get(0));
    }

    public Map<UUID, float[]> getProductEmbeddings(java.util.Collection<UUID> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, float[]> result = new java.util.HashMap<>();
        jdbc.query(
                "SELECT id, embedding::text AS vec_str FROM products WHERE id IN (:ids) AND embedding IS NOT NULL",
                Map.of("ids", productIds),
                rs -> {
                    UUID id = rs.getObject("id", UUID.class);
                    String vecStr = rs.getString("vec_str");
                    float[] vec = parseVector(vecStr);
                    if (vec != null) {
                        result.put(id, vec);
                    }
                });
        return result;
    }

    @Transactional
    public void saveUserProfileVector(UUID profileId, float[] vector) {
        jdbc.update(
                "UPDATE user_recommendation_profiles SET profile_vector = CAST(:vec AS vector), updated_at = NOW() WHERE id = :id",
                Map.of("vec", toLiteral(vector), "id", profileId));
    }

    public float[] getUserProfileVector(UUID profileId) {
        List<String> rows = jdbc.query(
                "SELECT profile_vector::text FROM user_recommendation_profiles WHERE id = :id AND profile_vector IS NOT NULL",
                Map.of("id", profileId),
                (rs, i) -> rs.getString(1));
        if (rows.isEmpty() || rows.get(0) == null) {
            return null;
        }
        return parseVector(rows.get(0));
    }

    public List<SimilarProduct> findSimilarToVector(
            float[] vector,
            UUID categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            List<UUID> excludedIds,
            int limit) {
        if (vector == null) {
            return List.of();
        }
        boolean hasExcludes = excludedIds != null && !excludedIds.isEmpty();
        boolean hasCategory = categoryId != null;
        boolean hasMinPrice = minPrice != null && minPrice.signum() > 0;
        boolean hasMaxPrice = maxPrice != null && maxPrice.signum() > 0;

        StringBuilder sql = new StringBuilder();
        sql.append("SELECT p.id, 1 - (p.embedding <=> CAST(:vec AS vector)) AS similarity ")
           .append("FROM products p ")
           .append("WHERE p.active = true ")
           .append("  AND p.stock_quantity > 0 ")
           .append("  AND p.embedding IS NOT NULL ");

        if (hasCategory) {
            sql.append("  AND p.category_id = :categoryId ");
        }
        if (hasMinPrice) {
            sql.append("  AND p.price >= :minPrice ");
        }
        if (hasMaxPrice) {
            sql.append("  AND p.price <= :maxPrice ");
        }
        if (hasExcludes) {
            sql.append("  AND p.id NOT IN (:excludedIds) ");
        }
        sql.append("ORDER BY p.embedding <=> CAST(:vec AS vector) ");
        sql.append("LIMIT :limit");

        Map<String, Object> params = new java.util.HashMap<>();
        params.put("vec", toLiteral(vector));
        params.put("limit", limit);
        if (hasCategory) {
            params.put("categoryId", categoryId);
        }
        if (hasMinPrice) {
            params.put("minPrice", minPrice);
        }
        if (hasMaxPrice) {
            params.put("maxPrice", maxPrice);
        }
        if (hasExcludes) {
            params.put("excludedIds", excludedIds);
        }

        return jdbc.query(
                sql.toString(),
                params,
                (rs, i) -> new SimilarProduct(
                        rs.getObject("id", UUID.class),
                        rs.getDouble("similarity")));
    }

    public List<SimilarProduct> findSimilarToVector(float[] vector, List<UUID> excludedIds, int limit) {
        return findSimilarToVector(vector, null, null, null, excludedIds, limit);
    }

    public static float[] parseVector(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String clean = text.trim();
        if (clean.startsWith("[") && clean.endsWith("]")) {
            clean = clean.substring(1, clean.length() - 1).trim();
        }
        if (clean.isEmpty()) {
            return new float[0];
        }
        String[] tokens = clean.split(",");
        float[] vector = new float[tokens.length];
        for (int i = 0; i < tokens.length; i++) {
            vector[i] = Float.parseFloat(tokens[i].trim());
        }
        return vector;
    }

    public String toLiteral(float[] vector) {
        StringBuilder sb = new StringBuilder(vector.length * 8).append('[');
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(vector[i]);
        }
        return sb.append(']').toString();
    }
}
