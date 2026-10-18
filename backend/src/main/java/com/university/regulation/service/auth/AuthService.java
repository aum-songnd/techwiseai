package com.university.regulation.service.auth;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.auth.ChangePasswordRequest;
import com.university.regulation.dto.auth.ForgotPasswordRequest;
import com.university.regulation.dto.auth.ForgotPasswordResponse;
import com.university.regulation.dto.auth.LoginRequest;
import com.university.regulation.dto.auth.LoginResponse;
import com.university.regulation.dto.auth.RegisterRequest;
import com.university.regulation.dto.auth.RegisterResponse;
import com.university.regulation.dto.auth.ResetPasswordRequest;
import com.university.regulation.dto.auth.UserProfileResponse;
import com.university.regulation.models.enums.RoleCode;
import com.university.regulation.models.role.Role;
import com.university.regulation.models.user.PasswordResetToken;
import com.university.regulation.models.user.User;
import com.university.regulation.repository.PasswordResetTokenRepository;
import com.university.regulation.repository.RoleRepository;
import com.university.regulation.repository.UserRepository;

@Service
public class AuthService {

        private static final Logger log = LoggerFactory.getLogger(AuthService.class);

        private final AuthenticationManager authenticationManager;
        private final JwtTokenService jwtTokenService;
        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final long accessTokenExpiration;
        private final RoleRepository roleRepository;
        private final PasswordResetTokenRepository passwordResetTokenRepository;
        private final SecureRandom secureRandom = new SecureRandom();

        public AuthService(
                        AuthenticationManager authenticationManager,
                        JwtTokenService jwtTokenService,
                        UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        RoleRepository roleRepository,
                        PasswordResetTokenRepository passwordResetTokenRepository,
                        @Value("${app.jwt.access-token-expiration}") long accessTokenExpiration) {
                this.authenticationManager = authenticationManager;
                this.jwtTokenService = jwtTokenService;
                this.userRepository = userRepository;
                this.passwordEncoder = passwordEncoder;
                this.roleRepository = roleRepository;
                this.passwordResetTokenRepository = passwordResetTokenRepository;
                this.accessTokenExpiration = accessTokenExpiration;
        }

        @Transactional
        public RegisterResponse register(RegisterRequest request) {

                String username = request.username().trim();
                String email = request.email().trim().toLowerCase();
                String fullName = request.fullName().trim();
                String phoneNumber = request.phoneNumber().trim();

                if (userRepository.existsByUsernameIgnoreCase(username)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Tên đăng nhập đã tồn tại");
                }

                if (userRepository.existsByEmailIgnoreCase(email)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Email đã được sử dụng");
                }

                if(userRepository.existsByPhone(phoneNumber)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Số điện thoại đã được sử dụng");
                }

                User user = new User();
                user.setUsername(username);
                user.setEmail(email);
                user.setFullName(fullName);
                user.setPhone(phoneNumber);
                user.setPasswordHash(
                                passwordEncoder.encode(request.password()));
                user.setEnabled(true);
                user.setLocked(false);
                Role userRole = roleRepository.findByCode(RoleCode.CUSTOMER)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.INTERNAL_SERVER_ERROR,
                                                "Không tìm thấy vai trò CUSTOMER"));

                Set<Role> roles = new HashSet<>();
                roles.add(userRole);

                user.setRoles(roles);

                User savedUser = userRepository.save(user);

                List<String> authorities = savedUser.getAuthorities()
                                .stream()
                                .map(authority -> authority.getAuthority())
                                .toList();

                return new RegisterResponse(
                                savedUser.getId(),
                                savedUser.getUsername(),
                                savedUser.getEmail(),
                                savedUser.getFullName(),
                                savedUser.getPhone(),
                                savedUser.isEnabled(),
                                authorities,
                                savedUser.getCreatedAt());
        }

        public LoginResponse login(LoginRequest request) {

                Authentication authentication = authenticationManager.authenticate(
                                UsernamePasswordAuthenticationToken.unauthenticated(
                                                request.username(),
                                                request.password()));

                String accessToken = jwtTokenService.generateAccessToken(authentication);

                List<String> authorities = authentication.getAuthorities()
                                .stream()
                                .map(authority -> authority.getAuthority())
                                .filter(authority -> authority.startsWith("ROLE_"))
                                .toList();

                User user = userRepository.findByUsernameIgnoreCase(authentication.getName()).orElse(null);
                String fullName = user != null ? user.getFullName() : null;
                String phoneNumber = user != null ? user.getPhone() : null;
                String email = user != null ? user.getEmail() : null;

                return new LoginResponse(
                                accessToken,
                                "Bearer",
                                accessTokenExpiration,
                                authentication.getName(),
                                authorities,
                                fullName,
                                phoneNumber,
                                email);
        }

        @Transactional(readOnly = true)
        public UserProfileResponse getCurrentUserProfile(String username) {
                User user = userRepository.findByUsernameIgnoreCase(username)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy tài khoản"));

                List<String> authorities = user.getAuthorities()
                                .stream()
                                .map(authority -> authority.getAuthority())
                                .filter(authority -> authority.startsWith("ROLE_"))
                                .toList();

                return new UserProfileResponse(
                                user.getId(),
                                user.getUsername(),
                                user.getEmail(),
                                user.getFullName(),
                                user.getPhone(),
                                authorities);
        }

        @Transactional
        public void changePassword(String username, ChangePasswordRequest request) {
                User user = userRepository.findByUsernameIgnoreCase(username)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy tài khoản"));

                if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Mật khẩu hiện tại không chính xác");
                }

                if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Mật khẩu mới không được trùng với mật khẩu hiện tại");
                }

                user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
                userRepository.save(user);
                log.info("Người dùng '{}' đã đổi mật khẩu thành công", username);
        }

        @Transactional
        public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
                String email = request.email().trim().toLowerCase();
                User user = userRepository.findByEmailIgnoreCase(email)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy tài khoản với email này"));

                String otp = String.format("%06d", secureRandom.nextInt(1000000));
                OffsetDateTime expiryDate = OffsetDateTime.now().plusMinutes(15);

                PasswordResetToken token = new PasswordResetToken();
                token.setUser(user);
                token.setToken(otp);
                token.setExpiryDate(expiryDate);
                token.setUsed(false);
                passwordResetTokenRepository.save(token);

                log.info("Mã OTP khôi phục mật khẩu cho email {}: {}", email, otp);

                return new ForgotPasswordResponse(
                                email,
                                "Mã xác nhận đặt lại mật khẩu đã được tạo. Mã có hiệu lực trong 15 phút.",
                                otp);
        }

        @Transactional
        public void resetPassword(ResetPasswordRequest request) {
                String email = request.email().trim().toLowerCase();
                User user = userRepository.findByEmailIgnoreCase(email)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy tài khoản với email này"));

                String otp = request.otp().trim();
                PasswordResetToken resetToken = passwordResetTokenRepository
                                .findFirstByUserAndTokenAndUsedFalseOrderByCreatedAtDesc(user, otp)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Mã xác thực không hợp lệ hoặc đã được sử dụng"));

                if (resetToken.isExpired()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới");
                }

                if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Mật khẩu mới không được trùng với mật khẩu cũ");
                }

                resetToken.setUsed(true);
                passwordResetTokenRepository.save(resetToken);

                user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
                userRepository.save(user);
                log.info("Đặt lại mật khẩu thành công cho tài khoản email '{}'", email);
        }
}