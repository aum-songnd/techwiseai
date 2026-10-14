package com.university.regulation.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.university.regulation.models.payment.Payment;

public interface PaymentRepository
        extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByOrderId(UUID orderId);

    boolean existsByOrderId(UUID orderId);

    Optional<Payment> findByTransactionCode(
            String transactionCode
    );

    Optional<Payment> findByProviderTransactionId(
            String providerTransactionId
    );
}
