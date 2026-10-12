CREATE TABLE product_search_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL,

    model_name VARCHAR(200) NOT NULL,
    model_revision VARCHAR(100) NOT NULL DEFAULT 'main',
    pipeline_version VARCHAR(50) NOT NULL DEFAULT 'v1',

    image_embedding VECTOR(768) NOT NULL,
    text_embedding VECTOR(768) NOT NULL,
    multimodal_embedding VECTOR(768) NOT NULL,

    text_content TEXT NOT NULL,
    image_count INTEGER NOT NULL,

    image_weight NUMERIC(5, 4) NOT NULL DEFAULT 0.8000,
    text_weight NUMERIC(5, 4) NOT NULL DEFAULT 0.2000,

    aggregation_method VARCHAR(50)
        NOT NULL DEFAULT 'weighted_mean',

    content_checksum CHAR(64) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_product_search_embeddings_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_product_search_embeddings_product_model
        UNIQUE (
            product_id,
            model_name,
            model_revision,
            pipeline_version
        ),

    CONSTRAINT chk_product_search_embeddings_image_count
        CHECK (image_count > 0),

    CONSTRAINT chk_product_search_embeddings_image_weight
        CHECK (
            image_weight >= 0
            AND image_weight <= 1
        ),

    CONSTRAINT chk_product_search_embeddings_text_weight
        CHECK (
            text_weight >= 0
            AND text_weight <= 1
        ),

    CONSTRAINT chk_product_search_embeddings_total_weight
        CHECK (image_weight + text_weight = 1.0000),

    CONSTRAINT chk_product_search_embeddings_checksum
        CHECK (content_checksum ~ '^[0-9a-f]{64}$')
);

CREATE INDEX idx_product_search_embeddings_product
    ON product_search_embeddings(product_id);

CREATE INDEX idx_product_search_embeddings_multimodal_hnsw
    ON product_search_embeddings
    USING hnsw (multimodal_embedding vector_cosine_ops)
    WITH (
        m = 16,
        ef_construction = 64
    );