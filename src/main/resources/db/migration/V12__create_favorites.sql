CREATE TABLE favorites (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_favorites_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorites_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_favorites_user_product
        UNIQUE (user_id, product_id)
);

CREATE INDEX idx_favorites_user_created_at
    ON favorites(user_id, created_at DESC);

CREATE INDEX idx_favorites_product
    ON favorites(product_id);