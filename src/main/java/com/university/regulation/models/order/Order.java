package com.university.regulation.models.order;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.university.regulation.models.enums.OrderStatus;
import com.university.regulation.models.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(
            name = "order_code",
            nullable = false,
            unique = true,
            length = 50
    )
    private String orderCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(
            name = "recipient_name",
            nullable = false,
            length = 255
    )
    private String recipientName;

    @Column(
            name = "recipient_phone",
            nullable = false,
            length = 20
    )
    private String recipientPhone;

    @Column(name = "shipping_address", nullable = false)
    private String shippingAddress;

    @Column(
            name = "subtotal",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal subtotal;

    @Column(
            name = "discount_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(
            name = "shipping_fee",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @Column(
            name = "total_amount",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal totalAmount;

    @Column(name = "note", length = 1000)
    private String note;

    @CreationTimestamp
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
