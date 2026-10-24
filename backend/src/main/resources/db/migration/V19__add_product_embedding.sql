CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS embedding VECTOR(384);

CREATE INDEX IF NOT EXISTS idx_products_embedding_hnsw
    ON products
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
