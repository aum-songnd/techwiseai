package com.university.regulation.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.university.regulation.models.recommendation.InteractionEventType;
import com.university.regulation.models.recommendation.UserInteractionEvent;

@Repository
public interface UserInteractionRepository extends JpaRepository<UserInteractionEvent, UUID> {

    List<UserInteractionEvent> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<UserInteractionEvent> findBySessionIdOrderByCreatedAtDesc(String sessionId, Pageable pageable);

    @Query("SELECT e FROM UserInteractionEvent e JOIN FETCH e.product p LEFT JOIN FETCH p.category c WHERE ((:userId IS NOT NULL AND e.user.id = :userId) OR (e.sessionId = :sessionId)) AND e.createdAt >= :since ORDER BY e.createdAt DESC")
    List<UserInteractionEvent> findRecentInteractions(
            @Param("userId") UUID userId,
            @Param("sessionId") String sessionId,
            @Param("since") OffsetDateTime since,
            Pageable pageable);

    @Query("SELECT COUNT(e) FROM UserInteractionEvent e WHERE (:userId IS NOT NULL AND e.user.id = :userId) OR (e.sessionId = :sessionId)")
    long countInteractions(@Param("userId") UUID userId, @Param("sessionId") String sessionId);

    @Query("SELECT COUNT(e) > 0 FROM UserInteractionEvent e WHERE e.sessionId = :sessionId AND e.product.id = :productId AND e.eventType = :eventType AND e.createdAt >= :windowStart")
    boolean existsRecentInteraction(
            @Param("sessionId") String sessionId,
            @Param("productId") UUID productId,
            @Param("eventType") InteractionEventType eventType,
            @Param("windowStart") OffsetDateTime windowStart);

    @Query("SELECT e FROM UserInteractionEvent e WHERE e.sessionId = :sessionId AND e.product.id = :productId AND e.eventType = :eventType AND e.createdAt >= :windowStart ORDER BY e.createdAt DESC")
    List<UserInteractionEvent> findRecentMatchingInteractions(
            @Param("sessionId") String sessionId,
            @Param("productId") UUID productId,
            @Param("eventType") InteractionEventType eventType,
            @Param("windowStart") OffsetDateTime windowStart,
            Pageable pageable);

    @Query("SELECT DISTINCT e.product.id FROM UserInteractionEvent e WHERE (e.user.id = :userId OR e.sessionId = :sessionId) AND e.eventType = 'PURCHASE' AND e.createdAt >= :since")
    List<UUID> findRecentPurchasedProductIds(
            @Param("userId") UUID userId,
            @Param("sessionId") String sessionId,
            @Param("since") OffsetDateTime since);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE UserInteractionEvent e SET e.user = :user WHERE e.sessionId = :guestSessionId AND e.user IS NULL")
    int mergeGuestInteractionsToUser(
            @Param("user") com.university.regulation.models.user.User user,
            @Param("guestSessionId") String guestSessionId);
}
