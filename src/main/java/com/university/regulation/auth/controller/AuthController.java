package com.university.regulation.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.auth.dto.LoginRequest;
import com.university.regulation.auth.dto.LoginResponse;
import com.university.regulation.auth.service.AuthService;
import com.university.regulation.common.response.ApiResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(
            AuthService authService
    ) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request
    ) {
        LoginResponse loginResponse =
                authService.login(loginRequest);

        ApiResponse<LoginResponse> response =
                ApiResponse.success(
                        "Đăng nhập thành công",
                        loginResponse,
                        request.getRequestURI()
                );

        return ResponseEntity.ok(response);
    }
}
