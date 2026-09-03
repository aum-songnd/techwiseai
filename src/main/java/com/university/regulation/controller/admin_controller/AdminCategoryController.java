package com.university.regulation.controller.admin_controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.categories.CategoryRequest;
import com.university.regulation.dto.categories.CategoryResponse;
import com.university.regulation.service.CategoryService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping("/api/v1/admin/")
@RequiredArgsConstructor
public class AdminCategoryController {
        private final CategoryService categoryService;

        @PostMapping("/categories")
        public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
                        @Valid @RequestBody CategoryRequest request,
                        HttpServletRequest httpRequest) {
                CategoryResponse category = categoryService.createCategory(request);
                ApiResponse<CategoryResponse> response = ApiResponse.success(
                                HttpStatus.CREATED,
                                "Tạo danh mục thành công",
                                category,
                                httpRequest.getRequestURI());

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(response);
        }

        @PutMapping("/categories/{id}")
        public ApiResponse<CategoryResponse> updateCategory(
                        @PathVariable UUID id,
                        @Valid @RequestBody CategoryRequest request,
                        HttpServletRequest httpRequest) {
                CategoryResponse category = categoryService.updateCategory(id, request);
                return ApiResponse.success(
                                "Cập nhật danh mục thành công",
                                category,
                                httpRequest.getRequestURI());
        }
}
