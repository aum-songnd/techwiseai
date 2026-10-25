package com.university.regulation.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.university.regulation.models.recommendation.UserRecommendationProfile;

@Repository
public interface UserRecommendationProfileRepository extends JpaRepository<UserRecommendationProfile, UUID> {

    Optional<UserRecommendationProfile> findByUserId(UUID userId);

    Optional<UserRecommendationProfile> findBySessionId(String sessionId);

    @Query("SELECT p FROM UserRecommendationProfile p WHERE (:userId IS NOT NULL AND p.user.id = :userId) OR (:sessionId IS NOT NULL AND p.sessionId = :sessionId)")
    Optional<UserRecommendationProfile> findByUserIdOrSessionId(
            @Param("userId") UUID userId,
            @Param("sessionId") String sessionId);
}
