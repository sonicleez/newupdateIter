-- =============================================
-- ADMIN SETUP - SIMPLE VERSION
-- Copy and run this entire script
-- =============================================

-- Step 1: Add columns to profiles (ignore errors if already exist)
DO $$ 
BEGIN
    BEGIN ALTER TABLE profiles ADD COLUMN email TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE profiles ADD COLUMN display_name TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- Step 2: Create or replace is_admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Set admin users
UPDATE profiles SET role = 'admin' WHERE email IN (
    'admin@example.com',
    'dangle@renoschuyler.com', 
    'xvirion@gmail.com'
);

-- Step 4: Drop ALL existing RLS policies on profiles (clean slate)
DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_name);
    END LOOP;
END $$;

-- Step 5: Create simple RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT 
    USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_update" ON profiles FOR UPDATE 
    USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_insert" ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Step 6: Fix user_global_stats policies
DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'user_global_stats'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_global_stats', policy_name);
    END LOOP;
END $$;

ALTER TABLE user_global_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stats_select" ON user_global_stats FOR SELECT 
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "stats_insert" ON user_global_stats FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stats_update" ON user_global_stats FOR UPDATE 
    USING (auth.uid() = user_id);

-- Step 7: Fix generated_images_history policies
DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'generated_images_history'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON generated_images_history', policy_name);
    END LOOP;
END $$;

ALTER TABLE generated_images_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "images_select" ON generated_images_history FOR SELECT 
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "images_insert" ON generated_images_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "images_update" ON generated_images_history FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "images_delete" ON generated_images_history FOR DELETE 
    USING (auth.uid() = user_id OR is_admin());

-- Step 8: Create user_api_keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_type TEXT NOT NULL,
    key_value TEXT NOT NULL,
    key_preview TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key_type)
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on user_api_keys
DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'user_api_keys'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_api_keys', policy_name);
    END LOOP;
END $$;

CREATE POLICY "keys_select" ON user_api_keys FOR SELECT 
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "keys_insert" ON user_api_keys FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "keys_update" ON user_api_keys FOR UPDATE 
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "keys_delete" ON user_api_keys FOR DELETE 
    USING (auth.uid() = user_id OR is_admin());

-- Step 9: Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON user_api_keys(user_id);

-- Step 10: Verify
SELECT 'Admin users:' as info;
SELECT id, email, role FROM profiles WHERE role = 'admin';

SELECT 'is_admin function test:' as info;
SELECT is_admin() as current_user_is_admin;

SELECT '✅ SETUP COMPLETE!' as status;
