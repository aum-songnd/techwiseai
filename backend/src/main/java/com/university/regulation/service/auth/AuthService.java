package com.university.regulation.service.auth;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.auth.LoginRequest;
import com.university.regulation.dto.auth.LoginResponse;
import com.university.regulation.dto.auth.RegisterRequest;
import com.university.regulation.dto.auth.RegisterResponse;
import com.university.regulation.models.enums.RoleCode;
import com.university.regulation.models.role.Role;
import com.university.regulation.models.user.User;
import com.university.regulation.repository.RoleRepository;
import com.university.regulation.repository.UserRepository;

@Service
public class AuthService {

        private final AuthenticationManager authenticationManager;
        private final JwtTokenService jwtTokenService;
        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final long accessTokenExpiration;
        private final RoleRepository roleRepository;

        public AuthService(
                        AuthenticationManager authenticationManager,
                        JwtTokenService jwtTokenService,
                        UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        RoleRepository roleRepository,
                        @Value("${app.jwt.access-token-expiration}") long accessTokenExpiration) {
                this.authenticationManager = authenticationManager;
                this.jwtTokenService = jwtTokenService;
                this.userRepository = userRepository;
                this.passwordEncoder = passwordEncoder;
                this.accessTokenExpiration = accessTokenExpiration;
                this.roleRepository = roleRepository;
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

                return new LoginResponse(
                                accessToken,
                                "Bearer",
                                accessTokenExpiration,
                                authentication.getName(),
                                authorities);
        }
}