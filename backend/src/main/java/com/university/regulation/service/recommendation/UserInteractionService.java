package com.university.regulation.service.recommendation;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.recommendation.InteractionEventRequest;
import com.university.regulation.models.product.Product;
import com.university.regulation.models.recommendation.InteractionEventType;
import com.university.regulation.models.recommendation.UserInteractionEvent;
import com.university.regulation.models.user.User;
import com.university.regulation.repository.ProductRepository;
import com.university.regulation.repository.UserInteractionRepository;
import com.university.regulation.repository.UserRepository;

import org.springframework.context.ApplicationEventPublisher;
import com.university.regulation.event.recommendation.UserInteractionRecordedEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserInteractionService {

    private final UserInteractionRepository interactionRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final UserProfileService userProfileService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public UserInteractionEvent recordInteraction(InteractionEventRequest request, String currentUsername) {
        return recordInteraction(request, currentUsername, null);
    }

    @Transactional
    public UserInteractionEvent recordInteraction(InteractionEventRequest request, String currentUsername, String verifiedSession) {
        if (request == null || request.getProductId() == null || request.getEventType() == null) {
            log.warn("Bỏ qua interaction do thiếu productId hoặc eventType");
            return null;
        }

        // BẢO MẬT: Tuyệt đối không cho phép client công khai gửi sự kiện PURCHASE (chống gian lận sở thích)
        if (request.getEventType() == InteractionEventType.PURCHASE) {
            log.warn("Từ chối ghi nhận sự kiện PURCHASE từ client API công khai");
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Sự kiện PURCHASE chỉ được xác nhận tự động từ nghiệp vụ đặt hàng thực tế");
        }

        // BẢO MẬT: Chỉ lấy user từ JWT đã xác thực (currentUsername), không tin cậy request.getUserId()
        User user = null;
        if (currentUsername != null && !currentUsername.isBlank() && !"anonymousUser".equalsIgnoreCase(currentUsername)) {
            user = userRepository.findByUsername(currentUsername).orElse(null);
        }

        String sessionId = (verifiedSession != null && !verifiedSession.isBlank())
                ? verifiedSession
                : request.getSessionId();

        if (sessionId != null) {
            sessionId = sessionId.trim();
            if (sessionId.equalsIgnoreCase("anon:default") || sessionId.length() > 64) {
                sessionId = null;
            }
        }
        if ((sessionId == null || sessionId.isBlank()) && user != null) {
            sessionId = "u:" + user.getId().toString();
        }

        if (user == null && (sessionId == null || sessionId.isBlank())) {
            log.warn("Bỏ qua tương tác do thiếu session_id cho khách vãng lai");
            return null;
        }

        // XỬ LÝ ĐO THỜI LƯỢNG VIEW CHÍNH XÁC & CHỐNG TRÙNG LẶP:
        // Nếu là sự kiện VIEW: nếu người dùng đang tiếp tục xem sản phẩm này trong cùng session (trong 30 phút),
        // cập nhật lại thời lượng cao hơn thay vì tạo bản ghi rác trùng lặp.
        if (request.getEventType() == InteractionEventType.VIEW && sessionId != null) {
            List<UserInteractionEvent> recentViews = interactionRepository.findRecentMatchingInteractions(
                    sessionId,
                    request.getProductId(),
                    InteractionEventType.VIEW,
                    OffsetDateTime.now().minusMinutes(30),
                    org.springframework.data.domain.PageRequest.of(0, 1));

            if (!recentViews.isEmpty()) {
                UserInteractionEvent existingView = recentViews.get(0);
                int incomingDuration = request.getDurationSeconds() != null ? request.getDurationSeconds() : 0;
                int updatedDuration = Math.max(existingView.getDurationSeconds(), incomingDuration);
                existingView.setDurationSeconds(updatedDuration);
                UserInteractionEvent updated = interactionRepository.save(existingView);

                triggerProfileUpdateAfterCommit(user != null ? user.getId() : null, sessionId, request.getProductId());
                return updated;
            }
        }

        // Kiểm tra chống trùng lặp trong 15s cho các hành vi click/favorite/cart
        if (sessionId != null && !sessionId.isBlank()) {
            boolean duplicate = interactionRepository.existsRecentInteraction(
                    sessionId,
                    request.getProductId(),
                    request.getEventType(),
                    OffsetDateTime.now().minusSeconds(15));
            if (duplicate) {
                log.debug("Bỏ qua ghi nhận tương tác trùng trong 15s: session={}, product={}, event={}",
                        sessionId, request.getProductId(), request.getEventType());
                return null;
            }
        }

        Product product = productRepository.findById(request.getProductId()).orElse(null);
        if (product == null) {
            log.warn("Không tìm thấy sản phẩm {} để ghi nhận tương tác", request.getProductId());
            return null;
        }

        String meta = request.getMetadata();
        if (meta == null || meta.isBlank()) {
            meta = "{}";
        }

        UserInteractionEvent event = UserInteractionEvent.builder()
                .user(user)
                .sessionId(sessionId)
                .product(product)
                .eventType(request.getEventType())
                .durationSeconds(request.getDurationSeconds() != null ? request.getDurationSeconds() : 0)
                .metadata(meta)
                .build();

        UserInteractionEvent saved = interactionRepository.save(event);

        // Kích hoạt cập nhật vector hồ sơ bất đồng bộ CHỈ SAU KHI TRANSACTION COMMIT
        UUID userId = user != null ? user.getId() : null;
        triggerProfileUpdateAfterCommit(userId, sessionId, product.getId());

        return saved;
    }

    /**
     * Ghi nhận sự kiện PURCHASE chỉ từ nghiệp vụ đặt hàng thực tế đã được xác nhận.
     */
    @Transactional
    public void recordOrderPurchase(User user, String sessionId, List<Product> products) {
        if (products == null || products.isEmpty()) {
            return;
        }
        String effectiveSession = sessionId;
        if ((effectiveSession == null || effectiveSession.isBlank()) && user != null) {
            effectiveSession = "u:" + user.getId().toString();
        }

        for (Product product : products) {
            UserInteractionEvent event = UserInteractionEvent.builder()
                    .user(user)
                    .sessionId(effectiveSession)
                    .product(product)
                    .eventType(InteractionEventType.PURCHASE)
                    .durationSeconds(60)
                    .metadata("{\"source\":\"ORDER_CONFIRMED\"}")
                    .build();
            interactionRepository.save(event);
        }

        UUID userId = user != null ? user.getId() : null;
        triggerProfileUpdateAfterCommit(userId, effectiveSession, null);
    }

    /**
     * BẢO MẬT & NHẤT QUÁN DỮ LIỆU (P0):
     * Phát sự kiện Domain Event qua ApplicationEventPublisher.
     * UserRecommendationEventListener sử dụng @TransactionalEventListener(phase = AFTER_COMMIT)
     * đảm bảo 100% transaction commit xong vào DB mới kích hoạt cập nhật profile bất đồng bộ.
     */
    private void triggerProfileUpdateAfterCommit(UUID userId, String sessionId, UUID productId) {
        eventPublisher.publishEvent(new UserInteractionRecordedEvent(userId, sessionId, productId));
        if (!org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            userProfileService.updateProfileAsync(userId, sessionId);
        }
    }
}
