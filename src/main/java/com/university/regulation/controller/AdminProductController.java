package com.university.regulation.controller;

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
import com.university.regulation.dto.products.ProductRequest;
import com.university.regulation.dto.products.ProductResponse;
import com.university.regulation.dto.products.UpdateProductRequest;
import com.university.regulation.service.CategoryService;
import com.university.regulation.service.ProductService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/")
@RequiredArgsConstructor
public class AdminProductController {

        private final ProductService productService;
        private final CategoryService categoryService;

        @PostMapping("/products")
        public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
                        @Valid @RequestBody ProductRequest request,
                        HttpServletRequest httpRequest) {
                ProductResponse product = productService.createProduct(request);

                ApiResponse<ProductResponse> response = ApiResponse.success(
                                HttpStatus.CREATED,
                                "Tạo sản phẩm thành công",
                                product,
                                httpRequest.getRequestURI());

                return ResponseEntity
                                .status(HttpStatus.CREATED)
                                .body(response);
        }

        @PutMapping("/products/{id}")
        public ApiResponse<ProductResponse> updateProduct(
                        @PathVariable UUID id,
                        @Valid @RequestBody UpdateProductRequest request,
                        HttpServletRequest httpRequest) {
                ProductResponse product = productService.updateProduct(id, request);

                return ApiResponse.success(
                                "Cập nhật sản phẩm thành công",
                                product,
                                httpRequest.getRequestURI());
        }

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
