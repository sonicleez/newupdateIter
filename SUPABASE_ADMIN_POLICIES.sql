-- =============================================
-- ADMIN RLS POLICIES
-- Run this in Supabase SQL Editor to allow admins to view all data
-- =============================================

-- 1. First, ensure profiles has role column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 2. Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add admin policies to profiles (allow admins to view all)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        auth.uid() = id 
        OR is_admin()
    );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        auth.uid() = id 
        OR is_admin()
    );

-- 4. Add admin policies to user_global_stats
DROP POLICY IF EXISTS "Admins can view all stats" ON user_global_stats;
CREATE POLICY "Admins can view all stats" ON user_global_stats
    FOR SELECT USING (
        auth.uid() = user_id 
        OR is_admin()
    );

DROP POLICY IF EXISTS "Admins can update all stats" ON user_global_stats;
CREATE POLICY "Admins can update all stats" ON user_global_stats
    FOR UPDATE USING (
        auth.uid() = user_id 
        OR is_admin()
    );

-- 5. Add admin policies to generated_images_history
DROP POLICY IF EXISTS "Admins can view all images" ON generated_images_history;
CREATE POLICY "Admins can view all images" ON generated_images_history
    FOR SELECT USING (
        auth.uid() = user_id 
        OR is_admin()
    );

DROP POLICY IF EXISTS "Admins can delete any images" ON generated_images_history;
CREATE POLICY "Admins can delete any images" ON generated_images_history
    FOR DELETE USING (
        auth.uid() = user_id 
        OR is_admin()
    );

-- 6. Add admin policies to dop_prompt_records (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dop_prompt_records') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Admins can view all records" ON dop_prompt_records';
        EXECUTE 'CREATE POLICY "Admins can view all records" ON dop_prompt_records
            FOR SELECT USING (auth.uid() = user_id OR is_admin())';
    END IF;
END $$;

-- 7. Add admin policies to dop_model_learnings (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dop_model_learnings') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Admins can view all model learnings" ON dop_model_learnings';
        EXECUTE 'CREATE POLICY "Admins can view all model learnings" ON dop_model_learnings
            FOR SELECT USING (true)'; -- Model learnings are aggregated, so visible to all authenticated
    END IF;
END $$;

-- 8. Set admin users (IMPORTANT: Replace with actual admin emails)
UPDATE profiles SET role = 'admin' WHERE email IN (
    'admin@example.com',
    'dangle@renoschuyler.com',
    'xvirion@gmail.com'
);

-- 9. Verify admin users
SELECT id, email, role FROM profiles WHERE role = 'admin';

-- 10. Test function
SELECT is_admin() as current_user_is_admin;

-- Done!
SELECT 'Admin RLS policies created successfully!' AS status;
