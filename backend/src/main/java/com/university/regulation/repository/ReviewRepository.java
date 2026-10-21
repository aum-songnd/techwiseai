package com.university.regulation.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.regulation.models.review.Review;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    Page<Review> findByProductIdAndStatus(UUID productId, String status, Pageable pageable);

    Page<Review> findByProductIdAndStatusAndRating(UUID productId, String status, int rating, Pageable pageable);

    long countByProductIdAndStatus(UUID productId, String status);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = :productId AND r.status = 'APPROVED'")
    Optional<Double> calculateAverageRating(@Param("productId") UUID productId);

    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.product.id = :productId AND r.status = 'APPROVED' GROUP BY r.rating")
    List<Object[]> countRatingsGrouped(@Param("productId") UUID productId);

    boolean existsByProductIdAndUserId(UUID productId, UUID userId);

    @Query(
        value = "SELECT r FROM Review r JOIN r.product p WHERE " +
                "(:keyword IS NULL OR LOWER(r.userFullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
                "AND (:status IS NULL OR r.status = :status) " +
                "AND (:rating IS NULL OR r.rating = :rating) " +
                "AND (:productId IS NULL OR p.id = :productId)",
        countQuery = "SELECT COUNT(r) FROM Review r JOIN r.product p WHERE " +
                "(:keyword IS NULL OR LOWER(r.userFullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
                "AND (:status IS NULL OR r.status = :status) " +
                "AND (:rating IS NULL OR r.rating = :rating) " +
                "AND (:productId IS NULL OR p.id = :productId)"
    )
    Page<Review> searchReviews(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("rating") Integer rating,
            @Param("productId") UUID productId,
            Pageable pageable
    );
}
