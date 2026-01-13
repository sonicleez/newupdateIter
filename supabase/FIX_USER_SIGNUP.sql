-- ========================================================
-- FIX: User Signup Profile Creation Error
-- Chạy script này nếu tạo user mới báo lỗi database
-- ========================================================

-- Vấn đề: RLS policy chặn trigger insert khi tạo user mới
-- Fix: Bỏ qua RLS cho trigger function

-- 1. Drop trigger cũ
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Tạo lại function với RLS bypass
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, subscription_tier, role, created_at)
    VALUES (
        new.id, 
        COALESCE(new.email, new.raw_user_meta_data->>'email', ''),
        COALESCE(new.raw_user_meta_data->>'full_name', ''), 
        'free',
        'user',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- 4. Tạo lại trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Fix RLS policy cho profiles - cho phép service_role insert
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_service_insert" ON profiles;

-- Policy cho user tự insert (nếu không có trigger)
CREATE POLICY "profiles_insert" ON profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy cho trigger/service_role insert
CREATE POLICY "profiles_service_insert" ON profiles 
    FOR INSERT WITH CHECK (true);

SELECT '✅ User signup fix applied!' AS status;
