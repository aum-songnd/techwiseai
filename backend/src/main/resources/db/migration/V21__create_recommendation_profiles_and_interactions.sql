-- V21: Tạo bảng lưu trữ hồ sơ gợi ý cá nhân hóa và lịch sử hành vi tương tác
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Bảng hồ sơ sở thích người dùng (User Recommendation Profile)
CREATE TABLE IF NOT EXISTS user_recommendation_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) UNIQUE,
    profile_vector vector(384),
    favorite_categories JSONB DEFAULT '[]'::jsonb,
    preferred_price_min NUMERIC(15, 2) DEFAULT 0,
    preferred_price_max NUMERIC(15, 2) DEFAULT 0,
    interaction_count INT DEFAULT 0,
    last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profile_user ON user_recommendation_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_session ON user_recommendation_profiles(session_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_vector ON user_recommendation_profiles USING hnsw (profile_vector vector_cosine_ops) WHERE profile_vector IS NOT NULL;

-- 2. Bảng sự kiện tương tác người dùng (User Interaction Events)
CREATE TABLE IF NOT EXISTS user_interaction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,
    duration_seconds INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_time ON user_interaction_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_session_time ON user_interaction_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_product ON user_interaction_events(product_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_dedup ON user_interaction_events(session_id, product_id, event_type, created_at);
