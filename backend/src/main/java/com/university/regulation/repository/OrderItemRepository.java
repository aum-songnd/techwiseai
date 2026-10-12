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
}
