-- =============================================
-- PART 5: ROW LEVEL SECURITY (RLS)
-- Run this LAST
-- =============================================

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

-- Drop existing policies (ignore errors if not exist)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_service_insert" ON profiles;
DROP POLICY IF EXISTS "projects_all" ON projects;
DROP POLICY IF EXISTS "keys_select" ON user_api_keys;
DROP POLICY IF EXISTS "keys_insert" ON user_api_keys;
DROP POLICY IF EXISTS "keys_update" ON user_api_keys;
DROP POLICY IF EXISTS "keys_delete" ON user_api_keys;
DROP POLICY IF EXISTS "gommo_select" ON gommo_credentials;
DROP POLICY IF EXISTS "gommo_insert" ON gommo_credentials;
DROP POLICY IF EXISTS "gommo_update" ON gommo_credentials;
DROP POLICY IF EXISTS "gommo_delete" ON gommo_credentials;
DROP POLICY IF EXISTS "stats_select" ON user_global_stats;
DROP POLICY IF EXISTS "stats_insert" ON user_global_stats;
DROP POLICY IF EXISTS "stats_update" ON user_global_stats;
DROP POLICY IF EXISTS "images_select" ON generated_images_history;
DROP POLICY IF EXISTS "images_insert" ON generated_images_history;
DROP POLICY IF EXISTS "images_update" ON generated_images_history;
DROP POLICY IF EXISTS "images_delete" ON generated_images_history;
DROP POLICY IF EXISTS "dop_records_all" ON dop_prompt_records;
DROP POLICY IF EXISTS "dop_learnings_select" ON dop_model_learnings;
DROP POLICY IF EXISTS "dop_learnings_all" ON dop_model_learnings;
DROP POLICY IF EXISTS "brain_select" ON director_brain_memory;
DROP POLICY IF EXISTS "brain_insert" ON director_brain_memory;
DROP POLICY IF EXISTS "brain_update" ON director_brain_memory;
DROP POLICY IF EXISTS "brain_delete" ON director_brain_memory;
DROP POLICY IF EXISTS "research_presets_all" ON research_presets;

-- PROFILES Policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_service_insert" ON profiles FOR INSERT WITH CHECK (true);

-- PROJECTS Policies
CREATE POLICY "projects_all" ON projects FOR ALL USING (auth.uid() = user_id);

-- USER_API_KEYS Policies
CREATE POLICY "keys_select" ON user_api_keys FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "keys_insert" ON user_api_keys FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "keys_update" ON user_api_keys FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "keys_delete" ON user_api_keys FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- SYSTEM_API_KEYS Policies
DROP POLICY IF EXISTS "system_keys_select" ON system_api_keys;
CREATE POLICY "system_keys_select" ON system_api_keys 
    FOR SELECT USING (id IN (SELECT system_key_id FROM profiles WHERE id = auth.uid()));

-- GOMMO_CREDENTIALS Policies
CREATE POLICY "gommo_select" ON gommo_credentials FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "gommo_insert" ON gommo_credentials FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY "gommo_update" ON gommo_credentials FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "gommo_delete" ON gommo_credentials FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- USER_GLOBAL_STATS Policies
CREATE POLICY "stats_select" ON user_global_stats FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "stats_insert" ON user_global_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stats_update" ON user_global_stats FOR UPDATE USING (auth.uid() = user_id);

-- GENERATED_IMAGES_HISTORY Policies
CREATE POLICY "images_select" ON generated_images_history FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "images_insert" ON generated_images_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "images_update" ON generated_images_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "images_delete" ON generated_images_history FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- DOP_PROMPT_RECORDS Policies
CREATE POLICY "dop_records_all" ON dop_prompt_records FOR ALL USING (auth.uid() = user_id);

-- DOP_MODEL_LEARNINGS Policies
CREATE POLICY "dop_learnings_select" ON dop_model_learnings FOR SELECT USING (true);

-- DIRECTOR_BRAIN_MEMORY Policies
CREATE POLICY "brain_select" ON director_brain_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "brain_insert" ON director_brain_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brain_update" ON director_brain_memory FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brain_delete" ON director_brain_memory FOR DELETE USING (auth.uid() = user_id);

-- RESEARCH_PRESETS Policies
CREATE POLICY "research_presets_all" ON research_presets FOR ALL USING (auth.uid() = user_id);

SELECT 'PART 5 COMPLETE - RLS Policies created' AS status;
SELECT '✅ ALL DONE! Database setup complete.' AS final_status;
