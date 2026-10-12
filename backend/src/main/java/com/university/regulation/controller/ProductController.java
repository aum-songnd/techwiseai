package com.university.regulation.controller;

import java.util.UUID;
import java.util.List;

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
import com.university.regulation.dto.products.ProductDetailResponse;
import com.university.regulation.dto.products.ProductResponse;
import com.university.regulation.service.ProductService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

import com.university.regulation.dto.products.RecommendedProductResponse;
import com.university.regulation.service.AiRecommendationService;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {
        private final ProductService productService;
        private final AiRecommendationService aiRecommendationService;

        @GetMapping("/{id}")
        public ApiResponse<ProductDetailResponse> getProductDetail(
                        @PathVariable UUID id,
                        HttpServletRequest httpRequest) {

                ProductDetailResponse product = productService.getProductDetail(id);

                return ApiResponse.success(
                                "Lấy thông tin sản phẩm thành công",
                                product,
                                httpRequest.getRequestURI());
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

        @GetMapping("/search")
        public ApiResponse<PageResponse<ProductResponse>> searchProducts(
                        @RequestParam String keyword,
                        @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
                        HttpServletRequest request) {
                PageResponse<ProductResponse> products = productService.searchProducts(
                                keyword,
                                pageable);

                return ApiResponse.success(
                                "Tìm kiếm sản phẩm thành công",
                                products,
                                request.getRequestURI());
        }

        @GetMapping("/{id}/recommendations")
        public ApiResponse<List<ProductResponse>> getRecommendations(
                @PathVariable UUID id,
                @RequestParam(defaultValue = "8") int limit,
                HttpServletRequest request
        ) {
        List<ProductResponse> products =
                productService.getRecommendations(id, limit);

        return ApiResponse.success(
                "Lấy danh sách sản phẩm gợi ý thành công",
                products,
                request.getRequestURI()
        );
        }

        @GetMapping("/{id}/recommendations/ai")
        public ApiResponse<List<RecommendedProductResponse>> getAiRecommendations(
                        @PathVariable UUID id,
                        @RequestParam(defaultValue = "8") int limit,
                        HttpServletRequest request) {
                return ApiResponse.success(
                                "Lấy danh sách sản phẩm gợi ý thành công",
                                aiRecommendationService.getRecommendations(id, limit),
                                request.getRequestURI());
        }
}
