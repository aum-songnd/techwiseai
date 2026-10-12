CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_id UUID NOT NULL,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(300) NOT NULL,
    sku VARCHAR(100) NOT NULL,

    short_description VARCHAR(1000),
    description TEXT,

    price NUMERIC(15, 2) NOT NULL,
    original_price NUMERIC(15, 2),

    stock_quantity INTEGER NOT NULL DEFAULT 0,
    thumbnail_url VARCHAR(1000),

    rating_average NUMERIC(2, 1) NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,

    featured BOOLEAN NOT NULL DEFAULT FALSE,
    hot BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_products_slug
        UNIQUE (slug),

    CONSTRAINT uk_products_sku
        UNIQUE (sku),

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id)
        REFERENCES categories (id),

    CONSTRAINT chk_products_price
        CHECK (price >= 0),

    CONSTRAINT chk_products_original_price
        CHECK (
            original_price IS NULL
            OR original_price >= price
        ),

    CONSTRAINT chk_products_stock_quantity
        CHECK (stock_quantity >= 0),

    CONSTRAINT chk_products_rating_average
        CHECK (
            rating_average >= 0
            AND rating_average <= 5
        ),

    CONSTRAINT chk_products_review_count
        CHECK (review_count >= 0)
);

CREATE INDEX idx_products_category_id
    ON products (category_id);

CREATE INDEX idx_products_active_created_at
    ON products (active, created_at DESC);

CREATE INDEX idx_products_active_featured
    ON products (active, featured);

CREATE INDEX idx_products_active_hot
    ON products (active, hot);