package com.university.regulation.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.regulation.models.favorite.Favorite;

public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {

    boolean existsByUserUsernameAndProductId(
            String username,
            UUID productId
    );

    Optional<Favorite> findByUserUsernameAndProductId(
            String username,
            UUID productId
    );

    long deleteByUserUsernameAndProductId(
            String username,
            UUID productId
    );

    long deleteAllByUserUsername(String username);

    @Query("""
            SELECT f
            FROM Favorite f
            JOIN FETCH f.product p
            JOIN FETCH p.category
            WHERE f.user.username = :username
              AND p.active = true
            ORDER BY f.createdAt DESC
            """)
    List<Favorite> findAllActiveByUsername(
            @Param("username") String username
    );
}