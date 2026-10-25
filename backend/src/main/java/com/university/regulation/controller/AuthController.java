package com.university.regulation.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.auth.ChangePasswordRequest;
import com.university.regulation.dto.auth.ForgotPasswordRequest;
import com.university.regulation.dto.auth.ForgotPasswordResponse;
import com.university.regulation.dto.auth.LoginRequest;
import com.university.regulation.dto.auth.LoginResponse;
import com.university.regulation.dto.auth.RegisterRequest;
import com.university.regulation.dto.auth.RegisterResponse;
import com.university.regulation.dto.auth.ResetPasswordRequest;
import com.university.regulation.dto.auth.UpdateProfileRequest;
import com.university.regulation.dto.auth.UserProfileResponse;
import com.university.regulation.repository.UserRepository;
import com.university.regulation.service.auth.AuthService;
import com.university.regulation.service.recommendation.SecureSessionService;
import com.university.regulation.service.recommendation.UserProfileService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

        private final AuthService authService;
        private final UserProfileService userProfileService;
        private final SecureSessionService secureSessionService;
        private final UserRepository userRepository;

        public AuthController(
                        AuthService authService,
                        UserProfileService userProfileService,
                        SecureSessionService secureSessionService,
                        UserRepository userRepository) {
                this.authService = authService;
                this.userProfileService = userProfileService;
                this.secureSessionService = secureSessionService;
                this.userRepository = userRepository;
        }

        @PostMapping("/login")
        public ResponseEntity<ApiResponse<LoginResponse>> login(
                        @Valid @RequestBody LoginRequest loginRequest,
                        HttpServletRequest request,
                        HttpServletResponse response) {
                LoginResponse loginResponse = authService.login(loginRequest);

                // HỢP NHẤT PHIÊN KHÁCH VÀO TÀI KHOẢN (Guest Session -> Account Merge):
                // Nếu người dùng đã duyệt web ẩn danh trước khi đăng nhập, hợp nhất toàn bộ hành vi vào tài khoản
                try {
                    String candidateSession = null;
                    if (request.getCookies() != null) {
                        for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                            if (SecureSessionService.GUEST_SESSION_COOKIE.equals(cookie.getName())) {
                                candidateSession = cookie.getValue();
                                break;
                            }
                        }
                    }
                    if (candidateSession == null || candidateSession.isBlank()) {
                        candidateSession = request.getHeader("X-Session-Id");
                    }

                    String verifiedGuestSession = secureSessionService.verifyAndExtract(candidateSession);
                    if (verifiedGuestSession != null && !verifiedGuestSession.isBlank()) {
                        userRepository.findByUsernameIgnoreCase(loginResponse.username()).ifPresent(user -> {
                            userProfileService.mergeGuestSessionToUser(user.getId(), verifiedGuestSession);
                        });
                    }

                    // Sau khi đã hợp nhất xong, xóa bỏ cookie guest session cũ
                    secureSessionService.clearGuestCookie(response);
                } catch (Exception e) {
                    log.warn("Không thể hợp nhất guest session khi đăng nhập: {}", e.getMessage());
                }

                ApiResponse<LoginResponse> apiResponse = ApiResponse.success(
                                "Đăng nhập thành công",
                                loginResponse,
                                request.getRequestURI());

                return ResponseEntity.ok(apiResponse);
        }

        @PostMapping("/logout")
        public ResponseEntity<ApiResponse<Map<String, String>>> logout(
                        HttpServletRequest request,
                        HttpServletResponse response) {

                // ĐĂNG XUẤT: TÁCH BIỆT HOÀN TOÀN DỮ LIỆU CÁ NHÂN & CẤP GUEST SESSION MỚI
                // 1. Xóa cookie phiên khách cũ
                secureSessionService.clearGuestCookie(response);

                // 2. Cấp phát ngay một phiên khách mới toanh có chữ ký HMAC độc lập (Cold Start mới)
                String newGuestSession = secureSessionService.generateSignedSessionId();
                secureSessionService.attachGuestCookie(response, newGuestSession);
                response.setHeader("X-Session-Id", newGuestSession);

                ApiResponse<Map<String, String>> apiResponse = ApiResponse.success(
                                "Đăng xuất thành công, phiên khách mới đã được khởi tạo",
                                Map.of("newGuestSessionId", newGuestSession),
                                request.getRequestURI());

                return ResponseEntity.ok(apiResponse);
        }

        @PostMapping("/register")
        @ResponseStatus(HttpStatus.CREATED)
        public ApiResponse<RegisterResponse> register(
                        @Valid @RequestBody RegisterRequest request,
                        HttpServletRequest httpRequest) {

                RegisterResponse response = authService.register(request);

                return ApiResponse.success(
                                "Đăng ký tài khoản thành công",
                                response,
                                httpRequest.getRequestURI());
        }

        @GetMapping("/me")
        public ResponseEntity<ApiResponse<UserProfileResponse>> getCurrentUser(
                        Authentication authentication,
                        HttpServletRequest request) {

                UserProfileResponse response = authService.getCurrentUserProfile(authentication.getName());

                ApiResponse<UserProfileResponse> apiResponse = ApiResponse.success(
                                "Lấy thông tin tài khoản thành công",
                                response,
                                request.getRequestURI());

                return ResponseEntity.ok(apiResponse);
        }

        @PutMapping("/me")
        public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
                        @Valid @RequestBody UpdateProfileRequest updateProfileRequest,
                        Authentication authentication,
                        HttpServletRequest request) {

                UserProfileResponse response = authService.updateUserProfile(authentication.getName(), updateProfileRequest);

                ApiResponse<UserProfileResponse> apiResponse = ApiResponse.success(
                                "Cập nhật thông tin tài khoản thành công",
                                response,
                                request.getRequestURI());

                return ResponseEntity.ok(apiResponse);
        }

        @PostMapping("/change-password")
        public ResponseEntity<ApiResponse<Void>> changePassword(
                        @Valid @RequestBody ChangePasswordRequest changePasswordRequest,
                        Authentication authentication,
                        HttpServletRequest request) {

                authService.changePassword(authentication.getName(), changePasswordRequest);

                ApiResponse<Void> response = ApiResponse.success(
                                "Đổi mật khẩu thành công",
                                null,
                                request.getRequestURI());

                return ResponseEntity.ok(response);
        }

        @PostMapping("/forgot-password")
        public ResponseEntity<ApiResponse<ForgotPasswordResponse>> forgotPassword(
                        @Valid @RequestBody ForgotPasswordRequest forgotPasswordRequest,
                        HttpServletRequest request) {

                ForgotPasswordResponse response = authService.forgotPassword(forgotPasswordRequest);

                ApiResponse<ForgotPasswordResponse> apiResponse = ApiResponse.success(
                                "Yêu cầu mã xác nhận khôi phục mật khẩu thành công",
                                response,
                                request.getRequestURI());

                return ResponseEntity.ok(apiResponse);
        }

        @PostMapping("/reset-password")
        public ResponseEntity<ApiResponse<Void>> resetPassword(
                        @Valid @RequestBody ResetPasswordRequest resetPasswordRequest,
                        HttpServletRequest request) {

                authService.resetPassword(resetPasswordRequest);

                ApiResponse<Void> apiResponse = ApiResponse.success(
                                "Đặt lại mật khẩu thành công",
                                null,
                                request.getRequestURI());

                return ResponseEntity.ok(apiResponse);
        }
}
