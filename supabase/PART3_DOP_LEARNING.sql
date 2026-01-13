-- =============================================
-- PART 3: DOP LEARNING SYSTEM
-- Run this THIRD
-- =============================================

-- 1. DOP PROMPT RECORDS
CREATE TABLE IF NOT EXISTS public.dop_prompt_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    original_prompt TEXT NOT NULL,
    normalized_prompt TEXT NOT NULL,
    embedding vector(768),
    model_id TEXT NOT NULL,
    model_type TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('character', 'scene')),
    aspect_ratio TEXT DEFAULT '16:9',
    quality_score REAL,
    full_body_score REAL,
    background_score REAL,
    face_clarity_score REAL,
    match_score REAL,
    was_approved BOOLEAN DEFAULT false,
    was_retried BOOLEAN DEFAULT false,
    retry_count INTEGER DEFAULT 0,
    was_rejected BOOLEAN DEFAULT FALSE,
    rejection_reasons TEXT[] DEFAULT '{}',
    rejection_notes TEXT,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    keywords TEXT[],
    tags TEXT[]
);

ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS was_rejected BOOLEAN DEFAULT FALSE;
ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS rejection_reasons TEXT[] DEFAULT '{}';
ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS rejection_notes TEXT;
ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS dop_prompt_model_idx ON public.dop_prompt_records(model_type, mode);
CREATE INDEX IF NOT EXISTS dop_prompt_user_idx ON public.dop_prompt_records(user_id);
CREATE INDEX IF NOT EXISTS dop_prompt_approved_idx ON public.dop_prompt_records(was_approved) WHERE was_approved = true;
CREATE INDEX IF NOT EXISTS idx_dop_records_rejected ON dop_prompt_records(was_rejected);

-- 2. DOP MODEL LEARNINGS
CREATE TABLE IF NOT EXISTS public.dop_model_learnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_type TEXT NOT NULL UNIQUE,
    total_generations INTEGER DEFAULT 0,
    approved_count INTEGER DEFAULT 0,
    avg_quality_score REAL DEFAULT 0,
    approval_rate REAL DEFAULT 0,
    best_aspect_ratios JSONB DEFAULT '{}'::jsonb,
    common_keywords JSONB DEFAULT '{}'::jsonb,
    successful_patterns TEXT[],
    failure_patterns JSONB DEFAULT '{}'::jsonb,
    rejection_counts JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dop_model_learnings ADD COLUMN IF NOT EXISTS failure_patterns JSONB DEFAULT '{}';
ALTER TABLE dop_model_learnings ADD COLUMN IF NOT EXISTS rejection_counts JSONB DEFAULT '{}';

SELECT 'PART 3 COMPLETE - DOP Learning tables created' AS status;
