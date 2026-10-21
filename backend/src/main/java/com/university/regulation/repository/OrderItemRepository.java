package com.university.regulation.repository;


import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.regulation.models.order.OrderItem;

public interface OrderItemRepository
        extends JpaRepository<OrderItem, UUID> {

    List<OrderItem> findAllByOrderIdOrderByCreatedAtAsc(
            UUID orderId
    );

    long countByOrderId(UUID orderId);

    boolean existsByProductId(UUID productId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(oi) > 0 FROM OrderItem oi WHERE oi.order.user.id = :userId AND oi.product.id = :productId")
    boolean existsByUserIdAndProductId(@org.springframework.data.repository.query.Param("userId") UUID userId, @org.springframework.data.repository.query.Param("productId") UUID productId);
}
