package com.university.regulation.event.recommendation;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.university.regulation.service.recommendation.UserProfileService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Lắng nghe sự kiện ghi nhận tương tác người dùng.
 * 
 * BẢO MẬT & NHẤT QUÁN DỮ LIỆU (P0):
 * Sử dụng @TransactionalEventListener với phase = AFTER_COMMIT để đảm bảo:
 * 1. Transaction ghi sự kiện đã commit 100% vào PostgreSQL trước khi tiến hành tính toán lại hồ sơ.
 * 2. Luồng tính toán bất đồng bộ trong UserProfileService luôn đọc được dữ liệu tương tác mới nhất,
 *    không bao giờ gặp race condition với transaction đang mở.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserRecommendationEventListener {

    private final UserProfileService userProfileService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInteractionRecorded(UserInteractionRecordedEvent event) {
        log.debug("Nhận sự kiện UserInteractionRecordedEvent sau khi Transaction commit: userId={}, sessionId={}, productId={}",
                event.getUserId(), event.getSessionId(), event.getProductId());
        userProfileService.updateProfileAsync(event.getUserId(), event.getSessionId());
    }
}
