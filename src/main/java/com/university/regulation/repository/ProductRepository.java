package com.university.regulation.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.university.regulation.models.product.Product;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    Page<Product> findAllByActiveTrue(Pageable pageable);

    Page<Product> findAllByActiveTrueAndCategorySlug(
            String categorySlug,
            Pageable pageable
    );

    Page<Product> findAllByActiveTrueAndFeaturedTrue(
            Pageable pageable
    );

    Page<Product> findAllByActiveTrueAndHotTrue(
            Pageable pageable
    );

    Optional<Product> findBySlugAndActiveTrue(String slug);

    boolean existsBySlugIgnoreCase(String slug);

    boolean existsBySkuIgnoreCase(String sku);
}
