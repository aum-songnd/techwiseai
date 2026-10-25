package com.university.regulation.service.recommendation;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

/**
 * Dịch vụ khởi tạo và xác minh Session ID có chữ ký mật mã (Cryptographically Signed Session).
 * 
 * Định dạng Session: sid_<32_hex_chars>.<16_hex_hmac_signature>
 * 
 * Mục tiêu bảo mật:
 * 1. Ngăn chặn triệt để hành vi giả mạo Session ID của khách vãng lai khác (IDOR on guest session).
 * 2. Chỉ chấp nhận các session do chính backend sinh ra và ký bằng HMAC-SHA256.
 * 3. Bất kỳ session nào bị can thiệp hoặc không có chữ ký hợp lệ sẽ bị hủy và thay thế bằng session mới an toàn.
 */
@Slf4j
@Service
public class SecureSessionService {

    public static final String GUEST_SESSION_COOKIE = "tw_guest_session";
    private final byte[] secretKeyBytes;

    public SecureSessionService(
            @Value("${app.jwt.secret:techwiseai-secure-hmac-session-signing-key-2026-384d}") String secret
    ) {
        String key = (secret != null && secret.length() >= 32)
                ? secret
                : secret + "_techwiseai_recommendation_system_fallback_key_2026";
        this.secretKeyBytes = key.getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Xác thực hoặc cấp phát Session có chữ ký bảo mật qua Cookie HttpOnly và Header.
     * Hoàn toàn không nhận Session ID tùy ý từ Query Parameters (Chống IDOR P0).
     */
    public String resolveGuestSession(jakarta.servlet.http.HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) {
        String candidate = null;

        // 1. Ưu tiên đọc từ Cookie bảo mật HttpOnly
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if (GUEST_SESSION_COOKIE.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                    candidate = cookie.getValue();
                    break;
                }
            }
        }

        // 2. Fallback sang Header X-Session-Id nếu client không dùng cookie (API / Mobile)
        if (candidate == null || candidate.isBlank()) {
            candidate = request.getHeader("X-Session-Id");
        }

        // 3. Xác minh chữ ký HMAC
        String verifiedRawId = verifyAndExtract(candidate);
        if (verifiedRawId != null) {
            return verifiedRawId;
        }

        // 4. Nếu chưa có hoặc token bị giả mạo: Tự động cấp phát session mới có chữ ký
        String newSignedToken = generateSignedSessionId();
        if (response != null) {
            attachGuestCookie(response, newSignedToken);
            response.setHeader("X-Session-Id", newSignedToken);
        }
        return verifyAndExtract(newSignedToken);
    }

    /**
     * Gắn Cookie HttpOnly bảo mật cho khách vãng lai.
     */
    public void attachGuestCookie(jakarta.servlet.http.HttpServletResponse response, String signedToken) {
        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from(GUEST_SESSION_COOKIE, signedToken)
                .httpOnly(true)
                .secure(false) // Đặt true nếu chạy HTTPS production
                .sameSite("Lax")
                .path("/")
                .maxAge(java.time.Duration.ofDays(30))
                .build();
        response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * Xóa Cookie HttpOnly của khách vãng lai (khi user đăng nhập hoặc đăng xuất).
     */
    public void clearGuestCookie(jakarta.servlet.http.HttpServletResponse response) {
        if (response == null) {
            return;
        }
        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from(GUEST_SESSION_COOKIE, "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(java.time.Duration.ZERO)
                .build();
        response.addHeader(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * Sinh Session ID mới có chữ ký mật mã cho khách vãng lai.
     */
    public String generateSignedSessionId() {
        String rawId = "s_" + UUID.randomUUID().toString().replace("-", "");
        String signature = computeSignature(rawId);
        return rawId + "." + signature;
    }

    /**
     * Xác minh tính toàn vẹn của Session ID và trích xuất raw ID để lưu trữ database.
     * Trả về rawId nếu chữ ký hợp lệ, ngược lại trả về null.
     */
    public String verifyAndExtract(String signedToken) {
        if (signedToken == null || signedToken.isBlank()) {
            return null;
        }

        String trimmed = signedToken.trim();
        int dotIndex = trimmed.lastIndexOf('.');
        if (dotIndex <= 0 || dotIndex >= trimmed.length() - 1) {
            log.debug("Session token không đúng định dạng: {}", trimmed);
            return null;
        }

        String rawId = trimmed.substring(0, dotIndex);
        String providedSig = trimmed.substring(dotIndex + 1);

        // Kiểm tra tính hợp lệ của rawId
        if (!rawId.matches("^s_[a-fA-F0-9]{32}$") && !rawId.matches("^[a-zA-Z0-9_\\-]{1,64}$")) {
            return null;
        }

        String expectedSig = computeSignature(rawId);

        // So sánh an toàn chống tấn công timing attack
        if (MessageDigest.isEqual(
                providedSig.getBytes(StandardCharsets.UTF_8),
                expectedSig.getBytes(StandardCharsets.UTF_8))) {
            return rawId;
        }

        log.warn("Phát hiện Session ID bị giả mạo hoặc chữ ký không khớp: rawId={}", rawId);
        return null;
    }

    /**
     * Ký chữ ký HMAC-SHA256 cho rawId (lấy 16 ký tự hex đầu).
     */
    public String sign(String rawId) {
        if (rawId == null || rawId.isBlank()) {
            return null;
        }
        return rawId + "." + computeSignature(rawId);
    }

    private String computeSignature(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(secretKeyBytes, "HmacSHA256");
            mac.init(keySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            String hex = HexFormat.of().formatHex(hmacBytes);
            return hex.substring(0, 16);
        } catch (Exception e) {
            throw new IllegalStateException("Lỗi khi tạo chữ ký HMAC cho session", e);
        }
    }
}
