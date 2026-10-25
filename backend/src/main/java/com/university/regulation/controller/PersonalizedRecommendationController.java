package com.university.regulation.controller;

import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.recommendation.InteractionEventRequest;
import com.university.regulation.dto.recommendation.PersonalizedRecommendationResponse;
import com.university.regulation.dto.recommendation.UserProfileResponse;
import com.university.regulation.models.recommendation.UserInteractionEvent;
import com.university.regulation.models.user.User;
import com.university.regulation.repository.UserRepository;
import com.university.regulation.service.recommendation.PersonalizedRecommendationService;
import com.university.regulation.service.recommendation.SecureSessionService;
import com.university.regulation.service.recommendation.UserInteractionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PersonalizedRecommendationController {

    private final UserInteractionService userInteractionService;
    private final PersonalizedRecommendationService personalizedRecommendationService;
    private final UserRepository userRepository;
    private final SecureSessionService secureSessionService;

    @PostMapping("/interactions")
    public ApiResponse<Map<String, Object>> recordInteraction(
            @Valid @RequestBody InteractionEventRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest,
            jakarta.servlet.http.HttpServletResponse httpResponse) {

        String currentUsername = authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())
                ? authentication.getName()
                : null;

        String verifiedSession = null;
        if (currentUsername == null) {
            if (request.getSessionId() != null && !request.getSessionId().isBlank()) {
                verifiedSession = secureSessionService.verifyAndExtract(request.getSessionId());
            }
            if (verifiedSession == null) {
                verifiedSession = secureSessionService.resolveGuestSession(httpRequest, httpResponse);
            }
        }

        UserInteractionEvent event = userInteractionService.recordInteraction(request, currentUsername, verifiedSession);

        Map<String, Object> data = Map.of(
                "status", event != null ? "RECORDED" : "SKIPPED",
                "id", event != null ? event.getId().toString() : "",
                "eventType", request.getEventType() != null ? request.getEventType().name() : "UNKNOWN",
                "productId", request.getProductId() != null ? request.getProductId().toString() : "");

        return ApiResponse.success("Ghi nhận hành vi tương tác thành công", data, httpRequest.getRequestURI());
    }

    @GetMapping("/recommendations/for-you")
    public ApiResponse<PersonalizedRecommendationResponse> getForYouRecommendations(
            @RequestParam(defaultValue = "8") int limit,
            @RequestParam(defaultValue = "false") boolean refresh,
            Authentication authentication,
            HttpServletRequest httpRequest,
            jakarta.servlet.http.HttpServletResponse httpResponse) {

        // BẢO MẬT: Chỉ xác định userId từ Authentication Context đã xác thực (chống IDOR)
        UUID authenticatedUserId = getAuthenticatedUserId(authentication);
        String safeSessionId = resolveSessionId(authenticatedUserId, httpRequest, httpResponse);

        PersonalizedRecommendationResponse response = personalizedRecommendationService.getForYouRecommendations(
                authenticatedUserId, safeSessionId, limit, refresh);

        return ApiResponse.success("Lấy danh sách gợi ý dành riêng cho bạn thành công", response, httpRequest.getRequestURI());
    }

    @GetMapping("/recommendations/profile")
    public ApiResponse<UserProfileResponse> getUserProfile(
            Authentication authentication,
            HttpServletRequest httpRequest,
            jakarta.servlet.http.HttpServletResponse httpResponse) {

        UUID authenticatedUserId = getAuthenticatedUserId(authentication);
        String safeSessionId = resolveSessionId(authenticatedUserId, httpRequest, httpResponse);

        UserProfileResponse response = personalizedRecommendationService.getUserProfileSummary(
                authenticatedUserId, safeSessionId);

        return ApiResponse.success("Lấy thông tin hồ sơ sở thích thành công", response, httpRequest.getRequestURI());
    }

    private UUID getAuthenticatedUserId(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal())) {
            String username = authentication.getName();
            return userRepository.findByUsername(username)
                    .map(User::getId)
                    .orElse(null);
        }
        return null;
    }

    /**
     * BẢO MẬT P0:
     * 1. Đối với người dùng đã đăng nhập: Khóa cứng định danh theo "u:<userId>".
     * 2. Đối với khách vãng lai: Tuyệt đối KHÔNG nhận sessionId tùy ý từ query params (chống IDOR).
     *    Chỉ xác thực hoặc cấp mới qua Cookie bảo mật HttpOnly hoặc Header X-Session-Id có chữ ký HMAC-SHA256.
     */
    private String resolveSessionId(UUID userId, HttpServletRequest request, HttpServletResponse response) {
        if (userId != null) {
            return "u:" + userId.toString();
        }
        return secureSessionService.resolveGuestSession(request, response);
    }
}
