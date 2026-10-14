package com.university.regulation.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.auth.LoginRequest;
import com.university.regulation.dto.auth.LoginResponse;
import com.university.regulation.dto.auth.RegisterRequest;
import com.university.regulation.dto.auth.RegisterResponse;
import com.university.regulation.service.auth.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

        private final AuthService authService;

        public AuthController(
                        AuthService authService) {
                this.authService = authService;
        }

        @PostMapping("/login")
        public ResponseEntity<ApiResponse<LoginResponse>> login(
                        @Valid @RequestBody LoginRequest loginRequest,
                        HttpServletRequest request) {
                LoginResponse loginResponse = authService.login(loginRequest);

                ApiResponse<LoginResponse> response = ApiResponse.success(
                                "Đăng nhập thành công",
                                loginResponse,
                                request.getRequestURI());

                return ResponseEntity.ok(response);
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
}
