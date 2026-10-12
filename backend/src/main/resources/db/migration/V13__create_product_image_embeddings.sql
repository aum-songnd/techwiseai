CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE product_image_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_image_id UUID NOT NULL,

    model_name VARCHAR(200) NOT NULL,
    model_revision VARCHAR(100) NOT NULL DEFAULT 'main',

    embedding VECTOR(768) NOT NULL,

    image_checksum CHAR(64) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_product_image_embeddings_product_image
        FOREIGN KEY (product_image_id)
        REFERENCES product_images(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_product_image_embeddings_image_model
        UNIQUE (
            product_image_id,
            model_name,
            model_revision
        ),

    CONSTRAINT chk_product_image_embeddings_checksum
        CHECK (image_checksum ~ '^[0-9a-f]{64}$')
);

CREATE INDEX idx_product_image_embeddings_product_image
    ON product_image_embeddings(product_image_id);

CREATE INDEX idx_product_image_embeddings_embedding_hnsw
    ON product_image_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (
        m = 16,
        ef_construction = 64
    );