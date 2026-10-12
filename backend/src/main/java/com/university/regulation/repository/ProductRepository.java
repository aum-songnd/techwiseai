package com.university.regulation.repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.regulation.models.product.Product;

import jakarta.persistence.LockModeType;

public interface ProductRepository extends JpaRepository<Product, UUID>,
                                JpaSpecificationExecutor<Product> {

        Page<Product> findAllByActiveTrue(Pageable pageable);

        Page<Product> findAllByActiveTrueAndCategorySlug(
                        String categorySlug,
                        Pageable pageable);

        Page<Product> findAllByActiveTrueAndFeaturedTrue(
                        Pageable pageable);

        Page<Product> findAllByActiveTrueAndHotTrue(
                        Pageable pageable);

        Optional<Product> findBySlugAndActiveTrue(String slug);

        Optional<Product> findBySkuIgnoreCase(String sku);

        Optional<Product> findBySlugIgnoreCase(String slug);

        Optional<Product> findByIdAndActiveTrue(UUID id);

        boolean existsBySlugIgnoreCase(String slug);

        boolean existsBySkuIgnoreCase(String sku);

        boolean existsBySlugIgnoreCaseAndIdNot(
                        String slug,
                        UUID id);

        boolean existsBySkuIgnoreCaseAndIdNot(
                        String sku,
                        UUID id);

        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("""
                        SELECT product
                        FROM Product product
                        JOIN FETCH product.category
                        WHERE product.id = :productId
                        """)
        Optional<Product> findByIdForUpdate(
                        @Param("productId") UUID productId);

        @Query("""
            SELECT p
            FROM Product p
            JOIN p.category c
            WHERE p.active = true
            AND c.active = true
            AND p.id <> :productId
            AND (
                c.id = :categoryId
                OR (
                    :brand IS NOT NULL
                    AND LOWER(p.brand) = LOWER(:brand)
                )
            )
            ORDER BY
            CASE WHEN c.id = :categoryId THEN 0 ELSE 1 END,
            CASE
                WHEN :brand IS NOT NULL
                    AND LOWER(p.brand) = LOWER(:brand)
                THEN 0 ELSE 1
            END,
            p.ratingAverage DESC,
            p.reviewCount DESC
            """)
        List<Product> findRecommendedCandidates(
            @Param("productId") UUID productId,
            @Param("categoryId") UUID categoryId,
            @Param("brand") String brand,
            Pageable pageable
        );
}
