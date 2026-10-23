package com.university.regulation.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.common.api.PageResponse;
import com.university.regulation.dto.categories.CategoryResponse;
import com.university.regulation.dto.products.ProductDetailResponse;
import com.university.regulation.dto.products.ProductImageResponse;
import com.university.regulation.dto.products.ProductRequest;
import com.university.regulation.dto.products.ProductResponse;
import com.university.regulation.dto.products.UpdateProductRequest;
import com.university.regulation.models.category.Category;
import com.university.regulation.models.product.Product;
import com.university.regulation.models.product.ProductImage;
import com.university.regulation.repository.CategoryRepository;
import com.university.regulation.repository.CartItemRepository;
import com.university.regulation.repository.OrderItemRepository;
import com.university.regulation.repository.ProductImageRepository;
import com.university.regulation.repository.ProductRepository;
import com.university.regulation.service.storage.ImageStorageService;
import com.university.regulation.specification.ProductSpecification;
import org.springframework.data.domain.PageRequest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

        private final ProductRepository productRepository;
        private final CategoryRepository categoryRepository;
        private final ProductImageRepository productImageRepository;
        private final CartItemRepository cartItemRepository;
        private final OrderItemRepository orderItemRepository;
        private final ImageStorageService imageStorageService;

        @Transactional(readOnly = true)
        public ProductResponse getProductById(UUID id) {
                Product product = productRepository
                                .findById(id)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy sản phẩm"));

                return toResponse(product);
        }

        @Transactional(readOnly = true)
        public PageResponse<ProductResponse> getProducts(
                        String category,
                        Boolean featured,
                        Boolean hot,
                        Pageable pageable) {
                Page<Product> productPage;

                if (category != null && !category.isBlank()) {
                        productPage = productRepository
                                        .findAllByActiveTrueAndCategorySlug(
                                                        category,
                                                        pageable);
                } else if (Boolean.TRUE.equals(featured)) {
                        productPage = productRepository
                                        .findAllByActiveTrueAndFeaturedTrue(
                                                        pageable);
                } else if (Boolean.TRUE.equals(hot)) {
                        productPage = productRepository
                                        .findAllByActiveTrueAndHotTrue(
                                                        pageable);
                } else {
                        productPage = productRepository
                                        .findAllByActiveTrue(pageable);
                }

                Page<ProductResponse> responsePage = productPage.map(this::toResponse);

                return PageResponse.from(responsePage);
        }

        public ProductResponse toResponse(Product product) {
                CategoryResponse categoryResponse = new CategoryResponse(
                                product.getCategory().getId(),
                                product.getCategory().getName(),
                                product.getCategory().getSlug(),
                                product.getCategory().getDescription(),
                                product.getCategory().getImageUrl(),
                                product.getCategory().getDisplayOrder());

                boolean onSale = isOnSale(product);
                boolean inStock = product.getStockQuantity() > 0;

                return new ProductResponse(
                                product.getId(),
                                product.getName(),
                                product.getSlug(),
                                product.getSku(),
                                product.getBrand(),
                                product.getShortDescription(),
                                product.getDescription(),
                                product.getThumbnailUrl(),

                                categoryResponse,

                                product.getPrice(),
                                product.getOriginalPrice(),
                                calculateDiscountPercent(product),

                                product.getStockQuantity(),
                                product.getRatingAverage(),
                                product.getReviewCount(),

                                product.isFeatured(),
                                product.isHot(),
                                onSale,
                                inStock,
                                product.isActive(),
                                product.getSpecifications());
        }

        private boolean isOnSale(Product product) {
                return product.getOriginalPrice() != null
                                && product.getOriginalPrice()
                                                .compareTo(product.getPrice()) > 0;
        }

        private int calculateDiscountPercent(Product product) {
                BigDecimal originalPrice = product.getOriginalPrice();
                BigDecimal price = product.getPrice();

                if (originalPrice == null
                                || originalPrice.compareTo(BigDecimal.ZERO) <= 0
                                || originalPrice.compareTo(price) <= 0) {
                        return 0;
                }

                return originalPrice
                                .subtract(price)
                                .multiply(BigDecimal.valueOf(100))
                                .divide(
                                                originalPrice,
                                                0,
                                                RoundingMode.HALF_UP)
                                .intValue();
        }

        @Transactional
        public ProductResponse createProduct(ProductRequest request) {
                String normalizedSlug = request.slug()
                                .trim()
                                .toLowerCase();

                String normalizedSku = request.sku()
                                .trim()
                                .toUpperCase();

                if (productRepository.existsBySlugIgnoreCase(normalizedSlug)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Slug sản phẩm đã tồn tại");
                }

                if (productRepository.existsBySkuIgnoreCase(normalizedSku)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "SKU sản phẩm đã tồn tại");
                }

                if (request.originalPrice() != null
                                && request.originalPrice()
                                                .compareTo(request.price()) < 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Giá gốc phải lớn hơn hoặc bằng giá bán");
                }

                Category category = categoryRepository
                                .findById(request.categoryId())
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy danh mục"));

                Product product = new Product();

                product.setCategory(category);
                product.setName(request.name().trim());
                product.setSlug(normalizedSlug);
                product.setSku(normalizedSku);
                product.setBrand(request.brand());
                product.setShortDescription(request.shortDescription());
                product.setDescription(request.description());
                product.setPrice(request.price());
                product.setOriginalPrice(request.originalPrice());
                product.setStockQuantity(request.stockQuantity());
                product.setThumbnailUrl(request.thumbnailUrl());

                product.setFeatured(Boolean.TRUE.equals(request.featured()));
                product.setHot(Boolean.TRUE.equals(request.hot()));

                product.setActive(
                                request.active() == null
                                                || Boolean.TRUE.equals(request.active()));

                Product savedProduct = productRepository.save(product);

                return toResponse(savedProduct);
        }

        @Transactional
        public ProductResponse updateProduct(
                        UUID id,
                        UpdateProductRequest request) {
                Product product = productRepository
                                .findById(id)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy sản phẩm"));

                Category category = categoryRepository
                                .findById(request.getCategoryId())
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy danh mục"));

                String normalizedSlug = request
                                .getSlug()
                                .trim()
                                .toLowerCase();

                String normalizedSku = request
                                .getSku()
                                .trim()
                                .toUpperCase();

                boolean slugExists = productRepository.existsBySlugIgnoreCaseAndIdNot(
                                normalizedSlug,
                                id);

                if (slugExists) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Slug sản phẩm đã tồn tại");
                }

                boolean skuExists = productRepository.existsBySkuIgnoreCaseAndIdNot(
                                normalizedSku,
                                id);

                if (skuExists) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "SKU sản phẩm đã tồn tại");
                }

                if (request.getOriginalPrice() != null
                                && request.getOriginalPrice()
                                                .compareTo(request.getPrice()) < 0) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Giá gốc phải lớn hơn hoặc bằng giá bán");
                }

                product.setCategory(category);
                product.setName(request.getName().trim());
                product.setSlug(normalizedSlug);
                product.setSku(normalizedSku);
                product.setBrand(trimToNull(request.getBrand()));
                product.setShortDescription(
                                trimToNull(request.getShortDescription()));
                product.setDescription(
                                trimToNull(request.getDescription()));
                product.setPrice(request.getPrice());
                product.setOriginalPrice(request.getOriginalPrice());
                product.setStockQuantity(request.getStockQuantity());
                product.setThumbnailUrl(
                                trimToNull(request.getThumbnailUrl()));
                product.setFeatured(request.getFeatured());
                product.setHot(request.getHot());
                product.setActive(request.getActive());

                Product updatedProduct = productRepository.save(product);

                return toResponse(updatedProduct);
        }

        private String trimToNull(String value) {
                if (value == null) {
                        return null;
                }

                String trimmedValue = value.trim();

                return trimmedValue.isEmpty()
                                ? null
                                : trimmedValue;
        }

        @Transactional(readOnly = true)
        public List<ProductResponse> getRecommendations(
                UUID productId,
                int limit
        ) {
        Product currentProduct = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm"
                ));

        if (!currentProduct.isActive()
                || currentProduct.getCategory() == null
                || !currentProduct.getCategory().isActive()) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm"
                );
        }

        int safeLimit = Math.max(1, Math.min(limit, 20));

        BigDecimal price = currentProduct.getPrice();
        BigDecimal minPrice = null;
        BigDecimal maxPrice = null;
        if (price != null && price.signum() > 0) {
                // Ngưỡng chênh lệch giá tối đa 35%: không đề xuất sản phẩm chênh lệch quá xa
                minPrice = price.multiply(BigDecimal.valueOf(0.65));
                maxPrice = price.multiply(BigDecimal.valueOf(1.35));
        }

        List<Product> candidates =
                productRepository.findRecommendedCandidates(
                        currentProduct.getId(),
                        currentProduct.getCategory().getId(),
                        currentProduct.getBrand(),
                        minPrice,
                        maxPrice,
                        PageRequest.of(0, safeLimit)
                );

        return candidates.stream()
                .map(this::toResponse)
                .toList();
        }

        @Transactional(readOnly = true)
        public ProductDetailResponse getProductDetail(UUID productId) {

                Product product = productRepository.findById(productId)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy sản phẩm"));

                // API public không cho xem sản phẩm hoặc danh mục đã bị ẩn.
                if (!product.isActive()
                                || product.getCategory() == null
                                || !product.getCategory().isActive()) {

                        throw new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Không tìm thấy sản phẩm");
                }

                List<ProductImageResponse> images = productImageRepository
                                .findAllByProduct_IdOrderByDisplayOrderAsc(productId)
                                .stream()
                                .map(this::toImageResponse)
                                .toList();

                ProductResponse baseResponse = toResponse(product);

                return new ProductDetailResponse(
                                baseResponse.id(),
                                baseResponse.name(),
                                baseResponse.slug(),
                                baseResponse.sku(),
                                product.getBrand(),
                                baseResponse.shortDescription(),
                                baseResponse.description(),
                                baseResponse.thumbnailUrl(),
                                baseResponse.category(),
                                baseResponse.price(),
                                baseResponse.originalPrice(),
                                baseResponse.discountPercent(),
                                baseResponse.stockQuantity(),
                                baseResponse.ratingAverage(),
                                baseResponse.reviewCount(),
                                baseResponse.featured(),
                                baseResponse.hot(),
                                baseResponse.onSale(),
                                baseResponse.inStock(),
                                baseResponse.active(),
                                product.getSpecifications(),
                                images);
        }

        private ProductImageResponse toImageResponse(
                        ProductImage image) {

                return new ProductImageResponse(
                                image.getId(),
                                image.getProduct().getId(),
                                image.getImageUrl(),
                                image.getAltText(),
                                image.getDisplayOrder(),
                                image.isPrimaryImage());
        }

        @Transactional(readOnly = true)
        public PageResponse<ProductResponse> getAdminProducts(
                        String category,
                        Boolean active,
                        Pageable pageable) {
                Page<Product> productPage;

                if (category != null && !category.isBlank() && active != null) {
                        productPage = productRepository.findAllByActiveAndCategorySlug(active, category, pageable);
                } else if (category != null && !category.isBlank()) {
                        productPage = productRepository.findAllByCategorySlug(category, pageable);
                } else if (active != null) {
                        productPage = productRepository.findAllByActive(active, pageable);
                } else {
                        productPage = productRepository.findAll(pageable);
                }

                return PageResponse.from(productPage.map(this::toResponse));
        }

        @Transactional
        public ProductResponse toggleProductStatus(UUID productId, boolean active) {
                Product product = productRepository.findById(productId)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy sản phẩm"));

                product.setActive(active);
                Product savedProduct = productRepository.save(product);
                return toResponse(savedProduct);
        }

        @Transactional
        public void deleteProduct(UUID productId) {
                deleteProduct(productId, false);
        }

        @Transactional
        public void deleteProduct(UUID productId, boolean hardDelete) {
                Product product = productRepository.findById(productId)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Không tìm thấy sản phẩm"));

                if (!hardDelete) {
                        // Xóa mềm: ẩn sản phẩm khỏi web, không hiển thị cho khách hàng nhưng giữ lại trong DB
                        product.setActive(false);
                        productRepository.save(product);
                        return;
                }

                // Xóa vĩnh viễn (Hard delete): kiểm tra lịch sử đơn hàng
                if (orderItemRepository.existsByProductId(productId)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Không thể xóa vĩnh viễn sản phẩm đã có trong đơn hàng của khách. Đã tự động chuyển sản phẩm sang trạng thái ngưng bán.");
                }

                // 1. Xóa các mục trong giỏ hàng có chứa sản phẩm này (tránh lỗi khóa ngoại ON DELETE RESTRICT)
                cartItemRepository.deleteAllByProductId(productId);

                // 2. Dọn dẹp ảnh trên Cloudinary và bảng product_images
                List<ProductImage> images = productImageRepository
                                .findAllByProductIdOrderByDisplayOrderAscCreatedAtAsc(productId);
                for (ProductImage image : images) {
                        if (image.getPublicId() != null && !image.getPublicId().isBlank()) {
                                try {
                                        imageStorageService.delete(image.getPublicId());
                                } catch (Exception e) {
                                        log.warn("Lỗi khi xóa ảnh Cloudinary cho sản phẩm {}: publicId={}", productId, image.getPublicId(), e);
                                }
                        }
                }
                productImageRepository.deleteAll(images);

                // 3. Thực sự xóa sản phẩm khỏi cơ sở dữ liệu
                productRepository.delete(product);
        }

        @Transactional(readOnly = true)
        public PageResponse<ProductResponse> searchProducts(
                        String keyword,
                        Pageable pageable) {

                if (keyword == null || keyword.isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Từ khóa tìm kiếm không được để trống");
                }

                Page<Product> productPage = productRepository.findAll(
                                ProductSpecification.searchByKeyword(keyword),
                                pageable);

                Page<ProductResponse> responsePage = productPage.map(this::toResponse);

                return PageResponse.from(responsePage);
        }
}
