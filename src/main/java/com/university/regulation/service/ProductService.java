package com.university.regulation.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.university.regulation.common.api.PageResponse;
import com.university.regulation.dto.categories.CategoryResponse;
import com.university.regulation.dto.products.ProductRequest;
import com.university.regulation.dto.products.ProductResponse;
import com.university.regulation.models.category.Category;
import com.university.regulation.models.product.Product;
import com.university.regulation.repository.CategoryRepository;
import com.university.regulation.repository.ProductRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

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

    private ProductResponse toResponse(Product product) {
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
                inStock);
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
}
