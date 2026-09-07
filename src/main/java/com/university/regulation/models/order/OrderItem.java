package com.university.regulation.models.order;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import com.university.regulation.models.product.Product;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(
            name = "product_name",
            nullable = false,
            length = 255
    )
    private String productName;

    @Column(
            name = "product_sku",
            nullable = false,
            length = 100
    )
    private String productSku;

    @Column(
            name = "product_thumbnail_url",
            length = 1000
    )
    private String productThumbnailUrl;

    @Column(
            name = "unit_price",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal unitPrice;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(
            name = "subtotal",
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal subtotal;

    @CreationTimestamp
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private OffsetDateTime createdAt;
}
