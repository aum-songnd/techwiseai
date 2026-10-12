CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL,

    payment_method VARCHAR(30) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    amount NUMERIC(15, 2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'VND',

    transaction_code VARCHAR(255),

    provider_transaction_id VARCHAR(255),

    payment_url VARCHAR(2000),

    failure_reason VARCHAR(1000),

    paid_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE RESTRICT,

    CONSTRAINT uk_payments_order
        UNIQUE (order_id),

    CONSTRAINT chk_payments_amount
        CHECK (amount >= 0),

    CONSTRAINT chk_payments_method
        CHECK (payment_method IN (
            'COD',
            'VNPAY'
        )),

    CONSTRAINT chk_payments_status
        CHECK (status IN (
            'PENDING',
            'PAID',
            'FAILED',
            'CANCELLED',
            'REFUNDED'
        ))
);

CREATE UNIQUE INDEX uk_payments_transaction_code
    ON payments(transaction_code)
    WHERE transaction_code IS NOT NULL;

CREATE UNIQUE INDEX uk_payments_provider_transaction_id
    ON payments(provider_transaction_id)
    WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX idx_payments_status
    ON payments(status);

CREATE INDEX idx_payments_created_at
    ON payments(created_at);