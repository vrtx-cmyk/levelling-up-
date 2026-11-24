-- ==============================================================================
-- Levelling Up - Fix Profiles RLS, Trigger, and Helper Functions
-- Migration: 002_fix_profiles_rls.sql
-- ==============================================================================

-- 1. Ensure reference_code has default generator in table schema
ALTER TABLE public.profiles 
    ALTER COLUMN reference_code SET DEFAULT public.generate_reference_code();

-- 2. Robust is_admin() function with PL/pgSQL and exception handling
-- (Prevents recursive RLS evaluation or query failures)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO v_admin FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(v_admin, false);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 3. Robust is_approved_user() function
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_approved BOOLEAN;
BEGIN
    SELECT (status = 'approved' OR is_admin = true) INTO v_approved 
    FROM public.profiles 
    WHERE id = auth.uid();
    RETURN COALESCE(v_approved, false);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 4. Robust Signup Trigger (handle_new_user)
-- Safely inserts profile row on signup and ignores conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        is_admin,
        status,
        reference_code
    ) VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
        FALSE,
        'none',
        public.generate_reference_code()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Fix Profiles RLS Policies
-- Users can read their own profile without recursion
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Admins can read all profiles
DROP POLICY IF EXISTS "Admin read all profiles" ON public.profiles;
CREATE POLICY "Admin read all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Users can insert/upsert their own profile row if missing
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile (field protections enforced by trigger)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin has full control on profiles
DROP POLICY IF EXISTS "Admin full control on profiles" ON public.profiles;
CREATE POLICY "Admin full control on profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_admin());

