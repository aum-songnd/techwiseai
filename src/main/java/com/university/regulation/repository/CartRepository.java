package com.university.regulation.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.regulation.models.cart.Cart;

public interface CartRepository extends JpaRepository<Cart, UUID> {

    Optional<Cart> findByUserId(UUID userId);

    Optional<Cart> findByUserUsernameIgnoreCase(String username);

    boolean existsByUserId(UUID userId);
}
