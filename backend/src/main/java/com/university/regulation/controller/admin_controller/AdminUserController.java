package com.university.regulation.controller.admin_controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.SortDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.user.AdminUserResponse;
import com.university.regulation.dto.user.UpdateUserStatusRequest;
import com.university.regulation.models.user.User;
import com.university.regulation.repository.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;

    public AdminUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public ApiResponse<Page<AdminUserResponse>> getUsers(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10)
            @SortDefault(sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable,
            HttpServletRequest httpRequest
    ) {
        String trimmed = keyword != null ? keyword.trim() : null;
        Page<User> users = userRepository.searchUsers(trimmed, pageable);
        Page<AdminUserResponse> dtos = users.map(this::toDto);

        return ApiResponse.success(
                "Lấy danh sách người dùng thành công",
                dtos,
                httpRequest.getRequestURI()
        );
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<AdminUserResponse> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy người dùng"
                ));

        boolean willActivate = Boolean.TRUE.equals(request.active());

        // Do not allow admin to self-lock
        if (!willActivate && authentication != null && user.getUsername().equalsIgnoreCase(authentication.getName())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Không thể tự khóa tài khoản quản trị hiện tại"
            );
        }

        if (willActivate) {
            user.setLocked(false);
            user.setEnabled(true);
        } else {
            user.setLocked(true);
        }

        User saved = userRepository.save(user);

        return ApiResponse.success(
                "Cập nhật trạng thái người dùng thành công",
                toDto(saved),
                httpRequest.getRequestURI()
        );
    }

    private AdminUserResponse toDto(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getAvatarUrl(),
                user.getRoles().stream()
                        .map(r -> "ROLE_" + r.getCode().name())
                        .toList(),
                !user.isLocked() && user.isEnabled(),
                user.getCreatedAt()
        );
    }
}
