package com.university.regulation.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.university.regulation.models.cart.CartItem;

public interface CartItemRepository
        extends JpaRepository<CartItem, UUID> {

    @EntityGraph(attributePaths = "product")
    List<CartItem> findAllByCartIdOrderByCreatedAtAsc(
            UUID cartId
    );

    @EntityGraph(attributePaths = "product")
    Optional<CartItem> findByIdAndCartId(
            UUID itemId,
            UUID cartId
    );

    Optional<CartItem> findByCartIdAndProductId(
            UUID cartId,
            UUID productId
    );

    boolean existsByCartIdAndProductId(
            UUID cartId,
            UUID productId
    );

    long countByCartId(UUID cartId);

    void deleteAllByCartId(UUID cartId);
}
