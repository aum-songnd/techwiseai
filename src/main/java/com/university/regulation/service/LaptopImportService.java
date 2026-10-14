package com.university.regulation.service;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.university.regulation.dto.importdata.LaptopImageImportItem;
import com.university.regulation.dto.importdata.LaptopImportFile;
import com.university.regulation.dto.importdata.LaptopImportItem;
import com.university.regulation.dto.importdata.LaptopImportResult;
import com.university.regulation.models.category.Category;
import com.university.regulation.models.product.Product;
import com.university.regulation.models.product.ProductImage;
import com.university.regulation.repository.CategoryRepository;
import com.university.regulation.repository.ProductImageRepository;
import com.university.regulation.repository.ProductRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Slf4j
public class LaptopImportService {

    private static final String DATA_FILE =
            "data/laptops_cleaned_for_import.json";

    private final ObjectMapper objectMapper;

    private final CategoryRepository categoryRepository;

    private final ProductRepository productRepository;

    private final ProductImageRepository productImageRepository;

    @Transactional
    public LaptopImportResult importLaptops(int maxProducts) {

        LaptopImportFile importFile = readImportFile();

        List<LaptopImportItem> items =
                importFile.products() == null
                        ? List.of()
                        : importFile.products();

        int limit = resolveLimit(maxProducts, items.size());

        int productsCreated = 0;
        int productsSkipped = 0;
        int imagesCreated = 0;

        for (int index = 0; index < limit; index++) {

            LaptopImportItem item = items.get(index);

            try {
                Optional<Product> existingProduct =
                        findExistingProduct(item);

                if (existingProduct.isPresent()) {

                    productsSkipped++;

                    imagesCreated += importImages(
                            existingProduct.get(),
                            item.images()
                    );

                    log.info(
                            "Bỏ qua sản phẩm đã tồn tại: {}",
                            item.sku()
                    );

                    continue;
                }

                Category category = findCategory(
                        item.categorySlug()
                );

                Product product = createProduct(
                        item,
                        category
                );

                Product savedProduct =
                        productRepository.save(product);

                productsCreated++;

                imagesCreated += importImages(
                        savedProduct,
                        item.images()
                );

                log.info(
                        "Đã import sản phẩm: {} - {}",
                        savedProduct.getSku(),
                        savedProduct.getName()
                );

            } catch (Exception exception) {

                log.error(
                        "Không thể import sản phẩm SKU {}: {}",
                        item.sku(),
                        exception.getMessage(),
                        exception
                );

                throw exception;
            }
        }

        return new LaptopImportResult(
                limit,
                productsCreated,
                productsSkipped,
                imagesCreated
        );
    }

    private LaptopImportFile readImportFile() {

        ClassPathResource resource =
                new ClassPathResource(DATA_FILE);

        try (InputStream inputStream =
                     resource.getInputStream()) {

            return objectMapper.readValue(
                    inputStream,
                    LaptopImportFile.class
            );

        } catch (IOException exception) {

            throw new IllegalStateException(
                    "Không thể đọc file " + DATA_FILE,
                    exception
            );
        }
    }

    private int resolveLimit(
            int maxProducts,
            int totalProducts
    ) {

        if (maxProducts <= 0) {
            return totalProducts;
        }

        return Math.min(
                maxProducts,
                totalProducts
        );
    }

    private Optional<Product> findExistingProduct(
            LaptopImportItem item
    ) {

        Optional<Product> productBySku =
                productRepository.findBySkuIgnoreCase(
                        item.sku()
                );

        if (productBySku.isPresent()) {
            return productBySku;
        }

        return productRepository.findBySlugIgnoreCase(
                item.slug()
        );
    }

    private Category findCategory(String categorySlug) {

        String slug =
                categorySlug == null
                        || categorySlug.isBlank()
                        ? "laptop"
                        : categorySlug.trim();

        return categoryRepository
                .findBySlugIgnoreCase(slug)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Không tìm thấy danh mục: "
                                        + slug
                        )
                );
    }

    private Product createProduct(
            LaptopImportItem item,
            Category category
    ) {

        Product product = new Product();

        product.setCategory(category);

        product.setName(item.name());
        product.setSlug(item.slug());
        product.setSku(item.sku());

        product.setBrand(item.brand());

        product.setShortDescription(
                item.shortDescription()
        );

        product.setDescription(
                item.description()
        );

        product.setPrice(item.price());

        product.setOriginalPrice(
                item.originalPrice()
        );

        product.setStockQuantity(
                valueOrDefault(
                        item.stockQuantity(),
                        0
                )
        );

        product.setThumbnailUrl(
                item.thumbnailUrl()
        );

        product.setActive(
                valueOrDefault(
                        item.active(),
                        true
                )
        );

        product.setFeatured(
                valueOrDefault(
                        item.featured(),
                        false
                )
        );

        product.setHot(
                valueOrDefault(
                        item.hot(),
                        false
                )
        );

        product.setRatingAverage(
                item.ratingAverage() == null
                        ? BigDecimal.ZERO
                        : item.ratingAverage()
        );

        Map<String, String> specifications =
                item.specifications() == null
                        ? Map.of()
                        : item.specifications();

        product.setSpecifications(specifications);

        return product;
    }

    private int importImages(
            Product product,
            List<LaptopImageImportItem> imageItems
    ) {

        if (imageItems == null || imageItems.isEmpty()) {
            return 0;
        }

        int imagesCreated = 0;

        for (LaptopImageImportItem item : imageItems) {

            if (item.imageUrl() == null
                    || item.imageUrl().isBlank()) {
                continue;
            }

            boolean imageExists =
                    productImageRepository
                            .existsByProductIdAndImageUrl(
                                    product.getId(),
                                    item.imageUrl()
                            );

            if (imageExists) {
                continue;
            }

            ProductImage image = new ProductImage();

            image.setProduct(product);

            image.setImageUrl(
                    item.imageUrl().trim()
            );

            // Ảnh nguồn ngoài, chưa nằm trên Cloudinary.
            image.setPublicId(null);

            image.setAltText(
                    item.altText()
            );

            image.setDisplayOrder(
                    valueOrDefault(
                            item.displayOrder(),
                            0
                    )
            );

            image.setPrimaryImage(
                    valueOrDefault(
                            item.primaryImage(),
                            false
                    )
            );

            productImageRepository.save(image);

            imagesCreated++;
        }

        return imagesCreated;
    }

    private int valueOrDefault(
            Integer value,
            int defaultValue
    ) {

        return value == null
                ? defaultValue
                : value;
    }

    private boolean valueOrDefault(
            Boolean value,
            boolean defaultValue
    ) {

        return value == null
                ? defaultValue
                : value;
    }
}
