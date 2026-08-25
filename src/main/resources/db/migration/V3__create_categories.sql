CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description VARCHAR(1000),
    image_url VARCHAR(1000),

    active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_categories_slug UNIQUE (slug),

    CONSTRAINT chk_categories_display_order
        CHECK (display_order >= 0)
);

CREATE UNIQUE INDEX uk_categories_name_lower
    ON categories (LOWER(name));

CREATE INDEX idx_categories_active_display_order
    ON categories (active, display_order);