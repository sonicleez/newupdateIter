-- =============================================
-- PART 1: EXTENSIONS & CORE TABLES
-- Run this FIRST
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. PROFILES TABLE
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

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS system_key_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    project_data JSONB DEFAULT '{}'::jsonb,
    is_archived BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USER API KEYS TABLE
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

-- 4. SYSTEM API KEYS TABLE
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

-- 5. GOMMO CREDENTIALS TABLE
CREATE TABLE IF NOT EXISTS public.gommo_credentials (
    user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    domain TEXT NOT NULL,
    access_token TEXT NOT NULL,
    credits_ai INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RESEARCH PRESETS TABLE
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

SELECT 'PART 1 COMPLETE - Core tables created' AS status;
