-- =============================================
-- FIX RLS FOR EXISTING user_api_keys TABLE
-- Run this AFTER SUPABASE_ADMIN_SIMPLE.sql
-- =============================================

-- Drop ALL existing policies on user_api_keys
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

-- Enable RLS
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Create admin-friendly policies
CREATE POLICY "keys_select_admin" ON user_api_keys FOR SELECT 
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "keys_insert_admin" ON user_api_keys FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "keys_update_admin" ON user_api_keys FOR UPDATE 
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "keys_delete_admin" ON user_api_keys FOR DELETE 
    USING (auth.uid() = user_id OR is_admin());

-- Verify
SELECT 'API Keys table policies updated!' as status;
SELECT * FROM user_api_keys LIMIT 5;
