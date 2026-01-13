-- =============================================
-- PART 2: USER STATS & IMAGE HISTORY
-- Run this SECOND
-- =============================================

-- 1. USER GLOBAL STATS
CREATE TABLE IF NOT EXISTS user_global_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    stats JSONB NOT NULL DEFAULT '{
        "totalImages": 0, "scenesGenerated": 0, "charactersGenerated": 0,
        "productsGenerated": 0, "conceptsGenerated": 0,
        "geminiImages": 0, "gommoImages": 0,
        "resolution1K": 0, "resolution2K": 0, "resolution4K": 0,
        "textTokens": 0, "promptTokens": 0, "candidateTokens": 0, "textCalls": 0,
        "estimatedImagePromptTokens": 0, "projectCount": 0
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GENERATED IMAGES HISTORY
CREATE TABLE IF NOT EXISTS generated_images_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    generation_type TEXT NOT NULL CHECK (generation_type IN ('scene', 'character', 'product', 'concept')),
    scene_id TEXT,
    character_id TEXT,
    product_id TEXT,
    prompt TEXT,
    model_id TEXT NOT NULL,
    model_type TEXT NOT NULL,
    aspect_ratio TEXT DEFAULT '16:9',
    resolution TEXT DEFAULT '1K',
    quality_score REAL,
    was_liked BOOLEAN DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_stats_user ON user_global_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_images_history_user ON generated_images_history(user_id);
CREATE INDEX IF NOT EXISTS idx_images_history_project ON generated_images_history(project_id);
CREATE INDEX IF NOT EXISTS idx_images_history_type ON generated_images_history(generation_type);
CREATE INDEX IF NOT EXISTS idx_images_history_created ON generated_images_history(created_at DESC);

-- 3. DIRECTOR BRAIN MEMORY
CREATE TABLE IF NOT EXISTS director_brain_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_memory UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_director_brain_user_id ON director_brain_memory(user_id);

SELECT 'PART 2 COMPLETE - Stats & History tables created' AS status;
