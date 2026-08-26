package com.university.regulation.controller;

import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.university.regulation.common.api.PageResponse;
import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.products.ProductResponse;
import com.university.regulation.service.ProductService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {
        private final ProductService productService;

        @GetMapping("/{id}")
        public ApiResponse<ProductResponse> getProductById(
                        @PathVariable UUID id,
                        HttpServletRequest request) {
                ProductResponse product = productService.getProductById(id);

                return ApiResponse.success(
                                "Lấy thông tin sản phẩm thành công",
                                product,
                                request.getRequestURI());
        }

        @GetMapping
        public ApiResponse<PageResponse<ProductResponse>> getProducts(
                        @RequestParam(required = false) String category,

                        @RequestParam(required = false) Boolean featured,

                        @RequestParam(required = false) Boolean hot,

                        @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,

                        HttpServletRequest request) {
                PageResponse<ProductResponse> products = productService.getProducts(
                                category,
                                featured,
                                hot,
                                pageable);

                return ApiResponse.success(
                                "Lấy danh sách sản phẩm thành công",
                                products,
                                request.getRequestURI());
        }
}
