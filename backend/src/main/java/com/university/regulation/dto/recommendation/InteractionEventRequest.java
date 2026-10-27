package com.university.regulation.dto.recommendation;

import java.util.UUID;

import com.university.regulation.models.recommendation.InteractionEventType;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InteractionEventRequest {

    // Bảo mật: userId chỉ được lấy từ Authentication Context, không chấp nhận từ body
    private String sessionId;

    @NotNull(message = "Product ID is required")
    private UUID productId;

    @NotNull(message = "Event type is required")
    private InteractionEventType eventType;

    private Integer durationSeconds;

    private String metadata;
}
