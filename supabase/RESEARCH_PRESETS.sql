-- =============================================
-- MIGRATION: Research Presets Table
-- =============================================

-- CREATE TABLE
CREATE TABLE IF NOT EXISTS public.research_presets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    director_notes TEXT,
    dop_notes TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE public.research_presets ENABLE ROW LEVEL SECURITY;

-- POLICIES
DROP POLICY IF EXISTS "research_presets_all" ON research_presets;
CREATE POLICY "research_presets_all" ON research_presets 
    FOR ALL USING (auth.uid() = user_id);

-- INDEX
CREATE INDEX IF NOT EXISTS idx_research_presets_user ON research_presets(user_id);
