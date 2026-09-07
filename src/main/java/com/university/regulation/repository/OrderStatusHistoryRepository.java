package com.university.regulation.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.university.regulation.models.order.OrderStatusHistory;

public interface OrderStatusHistoryRepository
        extends JpaRepository<OrderStatusHistory, UUID> {

    @EntityGraph(attributePaths = "changedBy")
    List<OrderStatusHistory>
            findAllByOrderIdOrderByCreatedAtAsc(
                    UUID orderId
            );
}
