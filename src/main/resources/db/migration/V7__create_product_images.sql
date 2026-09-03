CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL,

    image_url VARCHAR(1000) NOT NULL,

    public_id VARCHAR(500) NOT NULL,

    alt_text VARCHAR(255),

    display_order INTEGER NOT NULL DEFAULT 0,

    primary_image BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_product_images_display_order
        CHECK (display_order >= 0)
);

CREATE INDEX idx_product_images_product_id
    ON product_images(product_id);

CREATE INDEX idx_product_images_product_order
    ON product_images(product_id, display_order);

CREATE UNIQUE INDEX uk_product_images_one_primary
    ON product_images(product_id)
    WHERE primary_image = TRUE;