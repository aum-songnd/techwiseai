package com.university.regulation.service;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.dto.products.ProductImageResponse;
import com.university.regulation.models.product.Product;
import com.university.regulation.models.product.ProductImage;
import com.university.regulation.repository.ProductImageRepository;
import com.university.regulation.repository.ProductRepository;
import com.university.regulation.service.storage.ImageStorageService;
import com.university.regulation.service.storage.ImageUploadResult;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductImageService {
        private static final long MAX_FILE_SIZE = 5L * 1024L * 1024L;
        private static final int MAX_IMAGES_PER_PRODUCT = 10;

        private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
                        "image/jpeg",
                        "image/png",
                        "image/webp");

        private final ProductRepository productRepository;

        private final ProductImageRepository productImageRepository;

        private final ImageStorageService imageStorageService;

        @Transactional(readOnly = true)
        public List<ProductImageResponse> getImages(
                        UUID productId) {
                requireProduct(productId);

                return productImageRepository
                                .findAllByProductIdOrderByDisplayOrderAscCreatedAtAsc(
                                                productId)
                                .stream()
                                .map(this::toResponse)
                                .toList();
        }

        @Transactional
        public ProductImageResponse uploadImage(
                        UUID productId,
                        MultipartFile file,
                        String altText,
                        int displayOrder,
                        boolean primaryImage) {
                Product product = requireProduct(productId);

                validateFile(file);
                validateDisplayOrder(displayOrder);

                long imageCount = productImageRepository.countByProductId(productId);

                if (imageCount >= MAX_IMAGES_PER_PRODUCT) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Mỗi sản phẩm chỉ được có tối đa 10 ảnh");
                }

                ImageUploadResult uploadResult = imageStorageService.upload(
                                file,
                                "products/" + productId);

                try {
                        /*
                         * Ảnh đầu tiên luôn được đặt làm ảnh chính.
                         */
                        boolean makePrimary = imageCount == 0 || primaryImage;

                        if (makePrimary) {
                                productImageRepository.clearPrimaryImage(
                                                productId);
                        }

                        ProductImage image = new ProductImage();

                        image.setProduct(product);
                        image.setImageUrl(uploadResult.imageUrl());
                        image.setPublicId(uploadResult.publicId());
                        image.setAltText(normalizeText(altText));
                        image.setDisplayOrder(displayOrder);
                        image.setPrimaryImage(makePrimary);

                        ProductImage savedImage = productImageRepository.save(image);

                        if (makePrimary) {
                                product.setThumbnailUrl(
                                                savedImage.getImageUrl());

                                productRepository.save(product);
                        }

                        return toResponse(savedImage);

                } catch (RuntimeException exception) {
                        safeDeleteFromStorage(
                                        uploadResult.publicId());

                        throw exception;
                }
        }

        @Transactional
        public ProductImageResponse updateImage(
                        UUID productId,
                        UUID imageId,
                        MultipartFile newFile,
                        String altText,
                        Integer displayOrder) {
                Product product = requireProduct(productId);

                ProductImage image = requireProductImage(
                                productId,
                                imageId);

                ImageUploadResult newUpload = null;

                String oldPublicId = image.getPublicId();

                /*
                 * Nếu có file mới thì upload file mới.
                 */
                if (newFile != null && !newFile.isEmpty()) {
                        validateFile(newFile);

                        newUpload = imageStorageService.upload(
                                        newFile,
                                        "products/" + productId);
                }

                try {
                        if (newUpload != null) {
                                image.setImageUrl(
                                                newUpload.imageUrl());

                                image.setPublicId(
                                                newUpload.publicId());
                        }

                        if (altText != null) {
                                image.setAltText(
                                                normalizeText(altText));
                        }

                        if (displayOrder != null) {
                                validateDisplayOrder(displayOrder);

                                image.setDisplayOrder(displayOrder);
                        }

                        ProductImage savedImage = productImageRepository.save(image);

                        /*
                         * Nếu ảnh đang là ảnh chính và file bị thay,
                         * cần cập nhật thumbnail của Product.
                         */
                        if (savedImage.isPrimaryImage()) {
                                product.setThumbnailUrl(
                                                savedImage.getImageUrl());

                                productRepository.save(product);
                        }

                        /*
                         * Chỉ xóa file cũ sau khi đã lưu ảnh mới.
                         */
                        if (newUpload != null) {
                                safeDeleteFromStorage(oldPublicId);
                        }

                        return toResponse(savedImage);

                } catch (RuntimeException exception) {
                        /*
                         * Nếu lưu database thất bại thì xóa file mới
                         * vừa upload để tránh file rác.
                         */
                        if (newUpload != null) {
                                safeDeleteFromStorage(
                                                newUpload.publicId());
                        }

                        throw exception;
                }
        }

        @Transactional
        public ProductImageResponse setPrimaryImage(
                        UUID productId,
                        UUID imageId) {
                Product product = requireProduct(productId);

                /*
                 * Kiểm tra ảnh có thuộc sản phẩm không.
                 */
                requireProductImage(productId, imageId);

                /*
                 * Bỏ trạng thái ảnh chính của các ảnh cũ.
                 */
                productImageRepository.clearPrimaryImage(
                                productId);

                /*
                 * Repository clear persistence context,
                 * vì vậy phải truy vấn lại ảnh.
                 */
                ProductImage image = requireProductImage(
                                productId,
                                imageId);

                image.setPrimaryImage(true);

                ProductImage savedImage = productImageRepository.save(image);

                product.setThumbnailUrl(
                                savedImage.getImageUrl());

                productRepository.save(product);

                return toResponse(savedImage);
        }

        @Transactional
        public void deleteImage(
                        UUID productId,
                        UUID imageId) {
                Product product = requireProduct(productId);

                ProductImage image = requireProductImage(
                                productId,
                                imageId);

                boolean wasPrimary = image.isPrimaryImage();

                String publicId = image.getPublicId();

                productImageRepository.delete(image);
                productImageRepository.flush();

                /*
                 * Nếu xóa ảnh chính thì chọn ảnh tiếp theo.
                 */
                if (wasPrimary) {
                        ProductImage nextImage = productImageRepository
                                        .findFirstByProductIdOrderByDisplayOrderAscCreatedAtAsc(
                                                        productId)
                                        .orElse(null);

                        if (nextImage != null) {
                                nextImage.setPrimaryImage(true);

                                productImageRepository.save(
                                                nextImage);

                                product.setThumbnailUrl(
                                                nextImage.getImageUrl());
                        } else {
                                /*
                                 * Sản phẩm không còn ảnh.
                                 */
                                product.setThumbnailUrl(null);
                        }

                        productRepository.save(product);
                }

                safeDeleteFromStorage(publicId);
        }

        private Product requireProduct(
                        UUID productId) {
                return productRepository
                                .findById(productId)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy sản phẩm"));
        }

        private ProductImage requireProductImage(
                        UUID productId,
                        UUID imageId) {
                return productImageRepository
                                .findByIdAndProductId(
                                                imageId,
                                                productId)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy ảnh của sản phẩm"));
        }

        private void validateFile(MultipartFile file) {

                if (file == null || file.isEmpty()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "File ảnh không được để trống");
                }

                if (file.getSize() > MAX_FILE_SIZE) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Dung lượng ảnh không được vượt quá 5 MB");
                }

                String contentType = file.getContentType();

                String fileName = file.getOriginalFilename();

                if (contentType != null) {
                        contentType = contentType.toLowerCase();
                }

                if (fileName != null) {
                        fileName = fileName.toLowerCase();
                }

                boolean validContentType = contentType != null
                                && ALLOWED_CONTENT_TYPES.contains(contentType);

                boolean genericContentType = contentType == null
                                || "application/octet-stream".equals(contentType);

                boolean validExtension = fileName != null
                                && (fileName.endsWith(".jpg")
                                                || fileName.endsWith(".jpeg")
                                                || fileName.endsWith(".png")
                                                || fileName.endsWith(".webp"));
                if (!validContentType
                                && !(genericContentType && validExtension)) {

                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP");
                }
        }

        private void validateDisplayOrder(
                        int displayOrder) {
                if (displayOrder < 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Thứ tự hiển thị không được âm");
                }
        }

        private String normalizeText(
                        String text) {
                if (text == null || text.isBlank()) {
                        return null;
                }

                return text.trim();
        }

        private void safeDeleteFromStorage(
                        String publicId) {
                if (publicId == null
                                || publicId.isBlank()) {
                        return;
                }

                try {
                        imageStorageService.delete(publicId);

                } catch (RuntimeException exception) {
                        log.warn(
                                        "Không thể xóa ảnh trên Cloudinary: {}",
                                        publicId,
                                        exception);
                }
        }

        private ProductImageResponse toResponse(
                        ProductImage image) {
                return new ProductImageResponse(
                                image.getId(),
                                image.getProduct().getId(),
                                image.getImageUrl(),
                                image.getAltText(),
                                image.getDisplayOrder(),
                                image.isPrimaryImage());
        }
}
