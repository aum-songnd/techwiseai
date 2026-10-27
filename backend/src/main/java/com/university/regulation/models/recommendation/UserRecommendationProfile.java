package com.university.regulation.models.recommendation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import com.university.regulation.models.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "user_recommendation_profiles",
    indexes = {
        @Index(name = "idx_user_profile_user", columnList = "user_id"),
        @Index(name = "idx_user_profile_session", columnList = "session_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRecommendationProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "session_id", length = 100, unique = true)
    private String sessionId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "favorite_categories", columnDefinition = "jsonb")
    @Builder.Default
    private String favoriteCategories = "[]";

    @Column(name = "preferred_price_min", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal preferredPriceMin = BigDecimal.ZERO;

    @Column(name = "preferred_price_max", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal preferredPriceMax = BigDecimal.ZERO;

    @Column(name = "interaction_count")
    @Builder.Default
    private Integer interactionCount = 0;

    @Column(name = "last_active_at")
    private OffsetDateTime lastActiveAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
