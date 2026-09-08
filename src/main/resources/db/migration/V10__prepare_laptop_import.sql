ALTER TABLE products
    ADD COLUMN brand VARCHAR(100);

ALTER TABLE products
    ADD COLUMN specifications JSONB
        NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE product_images
    ALTER COLUMN public_id DROP NOT NULL;