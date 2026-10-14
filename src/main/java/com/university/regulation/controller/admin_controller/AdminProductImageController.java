package com.university.regulation.controller.admin_controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.university.regulation.common.response.ApiResponse;
import com.university.regulation.dto.products.ProductImageResponse;
import com.university.regulation.service.ProductImageService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/products/{productId}/images")
@RequiredArgsConstructor
public class AdminProductImageController {

    private final ProductImageService productImageService;

    @GetMapping
    public ApiResponse<List<ProductImageResponse>> getImages(
            @PathVariable UUID productId,
            HttpServletRequest httpRequest
    ) {
        return ApiResponse.success(
                "Lấy danh sách ảnh thành công",
                productImageService.getImages(productId),
                httpRequest.getRequestURI()
        );
    }

    @PostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ApiResponse<ProductImageResponse> uploadImage(
            @PathVariable UUID productId,

            @RequestPart("file")
            MultipartFile file,

            @RequestParam(required = false)
            String altText,

            @RequestParam(defaultValue = "0")
            int displayOrder,

            @RequestParam(defaultValue = "false")
            boolean primaryImage,

            HttpServletRequest httpRequest
    ) {
        ProductImageResponse response =
                productImageService.uploadImage(
                        productId,
                        file,
                        altText,
                        displayOrder,
                        primaryImage
                );

        return ApiResponse.success(
                "Tải ảnh sản phẩm thành công",
                response,
                httpRequest.getRequestURI()
        );
    }

    @PutMapping(
            value = "/{imageId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ApiResponse<ProductImageResponse> updateImage(
            @PathVariable UUID productId,
            @PathVariable UUID imageId,

            @RequestPart(
                    value = "file",
                    required = false
            )
            MultipartFile file,

            @RequestParam(required = false)
            String altText,

            @RequestParam(required = false)
            Integer displayOrder,

            HttpServletRequest httpRequest
    ) {
        ProductImageResponse response =
                productImageService.updateImage(
                        productId,
                        imageId,
                        file,
                        altText,
                        displayOrder
                );

        return ApiResponse.success(
                "Cập nhật ảnh sản phẩm thành công",
                response,
                httpRequest.getRequestURI()
        );
    }

    @PatchMapping("/{imageId}/primary")
    public ApiResponse<ProductImageResponse> setPrimaryImage(
            @PathVariable UUID productId,
            @PathVariable UUID imageId,
            HttpServletRequest httpRequest
    ) {
        ProductImageResponse response =
                productImageService.setPrimaryImage(
                        productId,
                        imageId
                );

        return ApiResponse.success(
                "Đặt ảnh chính thành công",
                response,
                httpRequest.getRequestURI()
        );
    }

    @DeleteMapping("/{imageId}")
    public ApiResponse<Void> deleteImage(
            @PathVariable UUID productId,
            @PathVariable UUID imageId,
            HttpServletRequest httpRequest
    ) {
        productImageService.deleteImage(
                productId,
                imageId
        );

        return ApiResponse.success(
                "Xóa ảnh sản phẩm thành công",
                null,
                httpRequest.getRequestURI()
        );
    }
}
