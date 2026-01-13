-- =============================================
-- PART 4: FUNCTIONS & TRIGGERS
-- Run this FOURTH
-- =============================================

-- 1. is_admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Handle new user signup (auto-create profile)
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

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Director Brain timestamp trigger
CREATE OR REPLACE FUNCTION update_director_brain_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = COALESCE(OLD.version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_director_brain_memory_timestamp ON director_brain_memory;
CREATE TRIGGER update_director_brain_memory_timestamp
    BEFORE UPDATE ON director_brain_memory
    FOR EACH ROW EXECUTE FUNCTION update_director_brain_timestamp();

-- 4. Storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

SELECT 'PART 4 COMPLETE - Functions & Triggers created' AS status;
