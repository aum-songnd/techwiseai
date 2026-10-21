package com.university.regulation.controller.admin_controller;

import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.api.PageResponse;
import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.products.ProductRequest;
import com.university.regulation.dto.products.ProductResponse;
import com.university.regulation.dto.products.UpdateProductRequest;
import com.university.regulation.service.ProductService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminProductController {

        private final ProductService productService;

        @GetMapping({ "/products", "" })
        public ApiResponse<PageResponse<ProductResponse>> getAdminProducts(
                        @RequestParam(required = false) String category,
                        @RequestParam(required = false) Boolean active,
                        @PageableDefault(page = 0, size = 2000, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
                        HttpServletRequest request) {
                PageResponse<ProductResponse> products = productService.getAdminProducts(
                                category,
                                active,
                                pageable);

                return ApiResponse.success(
                                "Lấy danh sách sản phẩm quản trị thành công",
                                products,
                                request.getRequestURI());
        }

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

        @DeleteMapping({ "/products/{productId}", "/{productId}" })
        public ApiResponse<Void> deleteProduct(
                        @PathVariable UUID productId,
                        @RequestParam(defaultValue = "false") boolean hard,
                        HttpServletRequest httpRequest) {
                productService.deleteProduct(productId, hard);

                return ApiResponse.success(
                                hard ? "Đã xóa vĩnh viễn sản phẩm khỏi cơ sở dữ liệu" : "Đã ẩn sản phẩm khỏi website thành công",
                                null,
                                httpRequest.getRequestURI());
        }

        @PatchMapping({ "/products/{productId}/status", "/{productId}/status" })
        public ApiResponse<ProductResponse> toggleProductStatus(
                        @PathVariable UUID productId,
                        @RequestParam boolean active,
                        HttpServletRequest httpRequest) {
                ProductResponse product = productService.toggleProductStatus(productId, active);

                return ApiResponse.success(
                                active ? "Đã mở bán lại sản phẩm trên website" : "Đã ẩn sản phẩm khỏi website",
                                product,
                                httpRequest.getRequestURI());
        }
}
