package com.university.regulation.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.university.regulation.models.enums.OrderStatus;
import com.university.regulation.models.order.Order;

public interface OrderRepository
        extends JpaRepository<Order, UUID>,
        JpaSpecificationExecutor<Order> {

    Optional<Order> findByIdAndUserId(
            UUID orderId,
            UUID userId
    );

    Optional<Order> findByOrderCodeAndUserId(
            String orderCode,
            UUID userId
    );

    Page<Order> findAllByUserIdOrderByCreatedAtDesc(
            UUID userId,
            Pageable pageable
    );

    Page<Order> findAllByStatusOrderByCreatedAtDesc(
            OrderStatus status,
            Pageable pageable
    );

    Page<Order> findAllByOrderByCreatedAtDesc(
            Pageable pageable
    );

    boolean existsByOrderCode(String orderCode);
}
