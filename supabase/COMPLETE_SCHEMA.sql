-- ==============================================================================
-- GENYU COMPLETE DATABASE SCHEMA
-- Version: 2.0 | Last Updated: 2026-01-13
-- ==============================================================================
-- 
-- USAGE: Run this ONCE when setting up a new Supabase project
-- 
-- Contains:
-- 1. Core Tables (profiles, projects, user_api_keys, etc.)
-- 2. Storage Bucket & Policies
-- 3. DOP Learning System (RAG Vector Search)  
-- 4. User Stats & Image History
-- 5. Gommo Credentials
-- 6. Director Brain Memory
-- 7. Admin System & RLS Policies
--
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- SECTION 1: CORE TABLES
-- ==============================================================================

-- 1.1 PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    display_name TEXT,
    role TEXT DEFAULT 'user',
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    system_key_id UUID,
    usage_stats JSONB DEFAULT '{
        "1K": 0, "2K": 0, "4K": 0, "total": 0,
        "scenes": 0, "characters": 0, "products": 0, "concepts": 0,
        "textTokens": 0, "promptTokens": 0, "candidateTokens": 0, "textCalls": 0
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if table already exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS system_key_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_api_key TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 1.2 PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    project_data JSONB DEFAULT '{}'::jsonb,
    is_archived BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3 USER API KEYS TABLE
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'gemini',
    key_type TEXT,
    encrypted_key TEXT NOT NULL,
    key_value TEXT,
    key_preview TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

ALTER TABLE public.user_api_keys ADD COLUMN IF NOT EXISTS key_type TEXT;
ALTER TABLE public.user_api_keys ADD COLUMN IF NOT EXISTS key_value TEXT;
ALTER TABLE public.user_api_keys ADD COLUMN IF NOT EXISTS key_preview TEXT;

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);

-- 1.4 SYSTEM API KEYS TABLE (Admin-managed)
CREATE TABLE IF NOT EXISTS public.system_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    provider TEXT DEFAULT 'gemini',
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 GOMMO CREDENTIALS TABLE
CREATE TABLE IF NOT EXISTS public.gommo_credentials (
    user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    domain TEXT NOT NULL,
    access_token TEXT NOT NULL,
    credits_ai INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- SECTION 2: USER STATS & IMAGE HISTORY
-- ==============================================================================

-- 2.1 USER GLOBAL STATS
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

-- 2.2 GENERATED IMAGES HISTORY
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

-- 2.3 USER USAGE SUMMARY VIEW
CREATE OR REPLACE VIEW user_usage_summary AS
SELECT 
    u.id as user_id,
    u.email,
    COALESCE((gs.stats->>'totalImages')::int, 0) as total_images,
    COALESCE((gs.stats->>'scenesGenerated')::int, 0) as scenes,
    COALESCE((gs.stats->>'charactersGenerated')::int, 0) as characters,
    COALESCE((gs.stats->>'geminiImages')::int, 0) as gemini_images,
    COALESCE((gs.stats->>'gommoImages')::int, 0) as gommo_images,
    COALESCE((gs.stats->>'textTokens')::int, 0) as text_tokens,
    (SELECT COUNT(*) FROM generated_images_history WHERE user_id = u.id) as history_count,
    gs.updated_at as last_activity
FROM auth.users u
LEFT JOIN user_global_stats gs ON u.id = gs.user_id;

-- 2.4 FUNCTION: Get user image counts by type
CREATE OR REPLACE FUNCTION get_user_image_counts(target_user_id UUID)
RETURNS TABLE (generation_type TEXT, count BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT gih.generation_type, COUNT(*)
    FROM generated_images_history gih
    WHERE gih.user_id = target_user_id
    GROUP BY gih.generation_type;
END;
$$;

-- ==============================================================================
-- SECTION 3: DOP LEARNING SYSTEM (RAG Vector Search)
-- ==============================================================================

-- 3.1 DOP PROMPT RECORDS
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

-- Add rejection columns if table exists
ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS was_rejected BOOLEAN DEFAULT FALSE;
ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS rejection_reasons TEXT[] DEFAULT '{}';
ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS rejection_notes TEXT;
ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS dop_prompt_embedding_idx ON public.dop_prompt_records 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS dop_prompt_model_idx ON public.dop_prompt_records(model_type, mode);
CREATE INDEX IF NOT EXISTS dop_prompt_user_idx ON public.dop_prompt_records(user_id);
CREATE INDEX IF NOT EXISTS dop_prompt_approved_idx ON public.dop_prompt_records(was_approved) WHERE was_approved = true;
CREATE INDEX IF NOT EXISTS idx_dop_records_rejected ON dop_prompt_records(was_rejected);
CREATE INDEX IF NOT EXISTS idx_dop_records_rejection_reasons ON dop_prompt_records USING GIN(rejection_reasons);

-- 3.2 DOP MODEL LEARNINGS
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

-- 3.3 FUNCTION: Search similar prompts
CREATE OR REPLACE FUNCTION search_similar_prompts(
    query_embedding vector(768),
    match_model_type TEXT DEFAULT NULL,
    match_mode TEXT DEFAULT NULL,
    match_count INT DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID, original_prompt TEXT, normalized_prompt TEXT,
    model_type TEXT, mode TEXT, quality_score REAL, similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.original_prompt, r.normalized_prompt, r.model_type, r.mode, r.quality_score,
           1 - (r.embedding <=> query_embedding) AS similarity
    FROM public.dop_prompt_records r
    WHERE r.was_approved = true AND r.quality_score >= 0.7
        AND (match_model_type IS NULL OR r.model_type = match_model_type)
        AND (match_mode IS NULL OR r.mode = match_mode)
        AND r.embedding IS NOT NULL
        AND 1 - (r.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY r.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 3.4 FUNCTION: Get best keywords for model
CREATE OR REPLACE FUNCTION get_model_best_keywords(target_model_type TEXT, keyword_limit INT DEFAULT 20)
RETURNS TABLE (keyword TEXT, frequency INT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT k.keyword::TEXT, k.frequency::INT
    FROM (
        SELECT jsonb_object_keys(common_keywords) AS keyword,
               (common_keywords->>jsonb_object_keys(common_keywords))::INT AS frequency
        FROM public.dop_model_learnings
        WHERE model_type = target_model_type
    ) k
    ORDER BY k.frequency DESC LIMIT keyword_limit;
END;
$$;

-- 3.5 VIEW: DOP Rejection Analysis
CREATE OR REPLACE VIEW dop_rejection_analysis AS
SELECT 
    model_type,
    COUNT(*) FILTER (WHERE was_rejected = true) as rejection_count,
    COUNT(*) FILTER (WHERE was_approved = true) as approval_count,
    COUNT(*) as total_count,
    ROUND(COUNT(*) FILTER (WHERE was_rejected = true)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100, 2) as rejection_rate
FROM dop_prompt_records
GROUP BY model_type ORDER BY rejection_count DESC;

-- ==============================================================================
-- SECTION 4: DIRECTOR BRAIN MEMORY
-- ==============================================================================

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

-- 4.2 RESEARCH PRESETS TABLE (Manual Script Analysis)
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

CREATE INDEX IF NOT EXISTS idx_research_presets_user ON research_presets(user_id);

-- Trigger for auto-updating timestamp and version
CREATE OR REPLACE FUNCTION update_director_brain_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_director_brain_memory_timestamp ON director_brain_memory;
CREATE TRIGGER update_director_brain_memory_timestamp
    BEFORE UPDATE ON director_brain_memory
    FOR EACH ROW EXECUTE FUNCTION update_director_brain_timestamp();

-- ==============================================================================
-- SECTION 5: STORAGE BUCKET
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- SECTION 6: ADMIN FUNCTIONS
-- ==============================================================================

-- is_admin function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set admin users (EDIT THESE EMAILS)
UPDATE profiles SET role = 'admin' WHERE email IN (
    'admin@example.com',
    'dangle@renoschuyler.com',
    'xvirion@gmail.com'
);

-- ==============================================================================
-- SECTION 7: TRIGGER - Auto-create profile on signup
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, subscription_tier)
    VALUES (
        new.id, 
        COALESCE(new.email, new.raw_user_meta_data->>'email', ''),
        COALESCE(new.raw_user_meta_data->>'full_name', ''), 
        'free'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- SECTION 8: ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gommo_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_global_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dop_prompt_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dop_model_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.director_brain_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_presets ENABLE ROW LEVEL SECURITY;

-- Helper: Drop all policies on a table
CREATE OR REPLACE FUNCTION drop_all_policies(target_table TEXT) RETURNS VOID AS $$
DECLARE policy_name TEXT;
BEGIN
    FOR policy_name IN SELECT policyname FROM pg_policies WHERE tablename = target_table
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, target_table);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Clear existing policies
SELECT drop_all_policies('profiles');
SELECT drop_all_policies('projects');
SELECT drop_all_policies('user_api_keys');
SELECT drop_all_policies('gommo_credentials');
SELECT drop_all_policies('user_global_stats');
SELECT drop_all_policies('generated_images_history');
SELECT drop_all_policies('dop_prompt_records');
SELECT drop_all_policies('director_brain_memory');
SELECT drop_all_policies('research_presets');

-- 8.1 PROFILES Policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());

-- 8.2 PROJECTS Policies
CREATE POLICY "projects_all" ON projects FOR ALL USING (auth.uid() = user_id);

-- 8.3 USER_API_KEYS Policies
CREATE POLICY "keys_select" ON user_api_keys FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "keys_insert" ON user_api_keys FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "keys_update" ON user_api_keys FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "keys_delete" ON user_api_keys FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- 8.4 SYSTEM_API_KEYS Policies
CREATE POLICY "system_keys_select" ON system_api_keys 
    FOR SELECT USING (id IN (SELECT system_key_id FROM profiles WHERE id = auth.uid()));

-- 8.5 GOMMO_CREDENTIALS Policies
CREATE POLICY "gommo_select" ON gommo_credentials FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "gommo_insert" ON gommo_credentials FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "gommo_update" ON gommo_credentials FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "gommo_delete" ON gommo_credentials FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- 8.6 USER_GLOBAL_STATS Policies
CREATE POLICY "stats_select" ON user_global_stats FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "stats_insert" ON user_global_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stats_update" ON user_global_stats FOR UPDATE USING (auth.uid() = user_id);

-- 8.7 GENERATED_IMAGES_HISTORY Policies
CREATE POLICY "images_select" ON generated_images_history FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "images_insert" ON generated_images_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "images_update" ON generated_images_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "images_delete" ON generated_images_history FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- 8.8 DOP_PROMPT_RECORDS Policies
CREATE POLICY "dop_records_all" ON dop_prompt_records FOR ALL USING (auth.uid() = user_id);

-- 8.9 DOP_MODEL_LEARNINGS Policies (shared, read-only for users)
CREATE POLICY "dop_learnings_select" ON dop_model_learnings FOR SELECT USING (true);
CREATE POLICY "dop_learnings_all" ON dop_model_learnings FOR ALL USING (auth.role() = 'service_role');

-- 8.10 DIRECTOR_BRAIN_MEMORY Policies
CREATE POLICY "brain_select" ON director_brain_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "brain_insert" ON director_brain_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brain_update" ON director_brain_memory FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brain_delete" ON director_brain_memory FOR DELETE USING (auth.uid() = user_id);

-- 8.11 RESEARCH_PRESETS Policies
CREATE POLICY "research_presets_all" ON research_presets FOR ALL USING (auth.uid() = user_id);

-- 8.11 STORAGE Policies
CREATE POLICY "storage_public_access" ON storage.objects 
    FOR SELECT USING (bucket_id = 'project-assets');
CREATE POLICY "storage_user_upload" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'project-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "storage_user_manage" ON storage.objects 
    FOR ALL USING (bucket_id = 'project-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

SELECT '✅ GENYU DATABASE SETUP COMPLETE!' AS status;
SELECT 'Tables created:' AS info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

SELECT 'Admin users:' AS info;
SELECT id, email, role FROM profiles WHERE role = 'admin';

SELECT 'Run is_admin() test:' AS info;
SELECT is_admin() as current_user_is_admin;
