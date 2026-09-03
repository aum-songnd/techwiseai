package com.university.regulation.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.university.regulation.models.product.ProductImage;

public interface ProductImageRepository
        extends JpaRepository<ProductImage, UUID> {

    /*
     * Lấy toàn bộ ảnh của sản phẩm,
     * sắp xếp theo displayOrder và thời gian tạo.
     */
    List<ProductImage>
            findAllByProductIdOrderByDisplayOrderAscCreatedAtAsc(
                    UUID productId
            );

    /*
     * Tìm ảnh bằng imageId và productId.
     * Ngăn cập nhật ảnh thuộc sản phẩm khác.
     */
    Optional<ProductImage> findByIdAndProductId(
            UUID imageId,
            UUID productId
    );

    /*
     * Lấy ảnh đầu tiên để đặt làm ảnh chính
     * khi ảnh chính hiện tại bị xóa.
     */
    Optional<ProductImage>
            findFirstByProductIdOrderByDisplayOrderAscCreatedAtAsc(
                    UUID productId
            );

    /*
     * Kiểm tra một URL đã tồn tại trong sản phẩm.
     */
    boolean existsByProductIdAndImageUrl(
            UUID productId,
            String imageUrl
    );

    /*
     * Đếm số lượng ảnh của sản phẩm.
     */
    long countByProductId(UUID productId);

    /*
     * Bỏ trạng thái ảnh chính của tất cả ảnh
     * thuộc sản phẩm.
     */
    @Modifying(
            clearAutomatically = true,
            flushAutomatically = true
    )
    @Query("""
            UPDATE ProductImage image
            SET image.primaryImage = false
            WHERE image.product.id = :productId
              AND image.primaryImage = true
            """)
    int clearPrimaryImage(
            @Param("productId") UUID productId
    );
}