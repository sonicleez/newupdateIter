-- ========================================================
-- Director Brain Memory - Supabase Schema
-- Auto-syncs user's AI director learning preferences
-- ========================================================

-- Create table for storing director brain memory per user
CREATE TABLE IF NOT EXISTS director_brain_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Core memory data (stored as JSONB for flexibility)
    memory_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Version for conflict resolution (higher wins)
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one memory per user
    CONSTRAINT unique_user_memory UNIQUE (user_id)
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_director_brain_user_id ON director_brain_memory(user_id);

-- Enable RLS
ALTER TABLE director_brain_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own memory
CREATE POLICY "Users can view own memory"
    ON director_brain_memory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory"
    ON director_brain_memory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory"
    ON director_brain_memory FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory"
    ON director_brain_memory FOR DELETE
    USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_director_brain_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp and version
DROP TRIGGER IF EXISTS update_director_brain_memory_timestamp ON director_brain_memory;
CREATE TRIGGER update_director_brain_memory_timestamp
    BEFORE UPDATE ON director_brain_memory
    FOR EACH ROW
    EXECUTE FUNCTION update_director_brain_timestamp();

-- ========================================================
-- HOW TO RUN:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
-- ========================================================
