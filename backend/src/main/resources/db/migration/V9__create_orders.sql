CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    order_code VARCHAR(50) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    recipient_name VARCHAR(255) NOT NULL,

    recipient_phone VARCHAR(20) NOT NULL,

    shipping_address TEXT NOT NULL,

    subtotal NUMERIC(15, 2) NOT NULL,

    discount_amount NUMERIC(15, 2)
        NOT NULL DEFAULT 0,

    shipping_fee NUMERIC(15, 2)
        NOT NULL DEFAULT 0,

    total_amount NUMERIC(15, 2) NOT NULL,

    note VARCHAR(1000),

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_orders_order_code
        UNIQUE (order_code),

    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_orders_subtotal
        CHECK (subtotal >= 0),

    CONSTRAINT chk_orders_discount_amount
        CHECK (discount_amount >= 0),

    CONSTRAINT chk_orders_shipping_fee
        CHECK (shipping_fee >= 0),

    CONSTRAINT chk_orders_total_amount
        CHECK (total_amount >= 0)
);


CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL,

    product_id UUID NOT NULL,

    product_name VARCHAR(255) NOT NULL,

    product_sku VARCHAR(100) NOT NULL,

    product_thumbnail_url VARCHAR(1000),

    unit_price NUMERIC(15, 2) NOT NULL,

    quantity INTEGER NOT NULL,

    subtotal NUMERIC(15, 2) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products (id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_order_items_unit_price
        CHECK (unit_price >= 0),

    CONSTRAINT chk_order_items_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_order_items_subtotal
        CHECK (subtotal >= 0)
);


CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL,

    changed_by UUID,

    old_status VARCHAR(30),

    new_status VARCHAR(30) NOT NULL,

    note VARCHAR(1000),

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_status_history_order
        FOREIGN KEY (order_id)
        REFERENCES orders (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_status_history_user
        FOREIGN KEY (changed_by)
        REFERENCES users (id)
        ON DELETE SET NULL
);


CREATE INDEX idx_orders_user_id
    ON orders (user_id);

CREATE INDEX idx_orders_status
    ON orders (status);

CREATE INDEX idx_orders_created_at
    ON orders (created_at DESC);

CREATE INDEX idx_order_items_order_id
    ON order_items (order_id);

CREATE INDEX idx_order_items_product_id
    ON order_items (product_id);

CREATE INDEX idx_order_status_history_order_id
    ON order_status_history (order_id);

CREATE INDEX idx_order_status_history_created_at
    ON order_status_history (created_at);