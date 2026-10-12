package com.university.regulation.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

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

    private String toLiteral(float[] vector) {
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
