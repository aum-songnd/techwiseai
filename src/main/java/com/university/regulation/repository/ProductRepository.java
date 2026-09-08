package com.university.regulation.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.regulation.models.product.Product;

import jakarta.persistence.LockModeType;

public interface ProductRepository extends JpaRepository<Product, UUID> {

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
}
