package com.university.regulation.event.recommendation;

import java.util.UUID;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Sự kiện miền (Domain Event) phát ra khi một tương tác người dùng được ghi nhận vào cơ sở dữ liệu.
 * Dùng để kích hoạt tác vụ cập nhật hồ sơ cá nhân hóa sau khi Transaction đã commit thành công.
 */
@Getter
@RequiredArgsConstructor
public class UserInteractionRecordedEvent {

    private final UUID userId;
    private final String sessionId;
    private final UUID productId;
}
