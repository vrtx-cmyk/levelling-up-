-- ==============================================================================
-- Levelling Up - Supabase Initial Database Migration & Storage Policies
-- Migration: 001_init.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    status TEXT DEFAULT 'none' NOT NULL CHECK (status IN ('none', 'pending', 'approved', 'rejected')),
    reference_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    screenshot_path TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    reviewed_at TIMESTAMPTZ
);

-- Videos Table
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    video_path TEXT NOT NULL,
    thumbnail_path TEXT,
    duration TEXT DEFAULT '00:00',
    is_published BOOLEAN DEFAULT TRUE NOT NULL,
    is_free_preview BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Settings Table (Single-row configuration)
CREATE TABLE IF NOT EXISTS public.settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    rib TEXT NOT NULL DEFAULT '007 780 0001234567890123 45',
    account_holder TEXT NOT NULL DEFAULT 'Levelling Up Media',
    bank_name TEXT DEFAULT 'Attijariwafa Bank',
    price NUMERIC NOT NULL DEFAULT 499,
    contact_whatsapp TEXT DEFAULT '+212600000000',
    contact_email TEXT DEFAULT 'contact@levellingup.com',
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Seed default settings row if it doesn't exist
INSERT INTO public.settings (id, rib, account_holder, bank_name, price, contact_whatsapp, contact_email)
VALUES (1, '007 780 0001234567890123 45', 'Levelling Up Media', 'Attijariwafa Bank', 499, '+212600000000', 'contact@levellingup.com')
ON CONFLICT (id) DO NOTHING;

-- 3. HELPER FUNCTIONS

-- Function to check if the current user is an admin without triggering recursive RLS
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

-- Function to check if the current user is approved
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

-- Function to generate unique Reference Code (e.g. LU + YearMonthDay + 4 random digits)
CREATE OR REPLACE FUNCTION public.generate_reference_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'LU' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        SELECT EXISTS (SELECT 1 FROM public.profiles WHERE reference_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$;

-- 4. SIGNUP TRIGGER (Automatically create profile when a user registers)
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

-- Trigger to prevent normal users from altering is_admin or status
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If caller is not admin, prevent modifying is_admin or status
    IF NOT public.is_admin() THEN
        IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
            RAISE EXCEPTION 'Cannot modify is_admin permission';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            -- Allow user to transition from 'none'/'rejected' to 'pending' upon payment submission
            -- But not to 'approved'
            IF NEW.status = 'approved' THEN
                RAISE EXCEPTION 'Only administrators can approve memberships';
            END IF;
        END IF;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- 5. ADMIN APPROVAL & REJECTION TRANSACTIONS
-- Safe atomic operation to approve payment and set user status to approved
CREATE OR REPLACE FUNCTION public.approve_payment(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_payment RECORD;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can approve payments';
    END IF;

    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record not found';
    END IF;

    v_user_id := v_payment.user_id;

    -- Update payment status
    UPDATE public.payments
    SET status = 'approved',
        reviewed_at = NOW(),
        rejection_reason = NULL
    WHERE id = p_payment_id;

    -- Update profile status
    UPDATE public.profiles
    SET status = 'approved',
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'user_id', v_user_id,
        'status', 'approved'
    );
END;
$$;

-- Safe atomic operation to reject payment and update user status
CREATE OR REPLACE FUNCTION public.reject_payment(p_payment_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_payment RECORD;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can reject payments';
    END IF;

    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record not found';
    END IF;

    v_user_id := v_payment.user_id;

    -- Update payment status
    UPDATE public.payments
    SET status = 'rejected',
        rejection_reason = p_reason,
        reviewed_at = NOW()
    WHERE id = p_payment_id;

    -- Update profile status
    UPDATE public.profiles
    SET status = 'rejected',
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'user_id', v_user_id,
        'status', 'rejected'
    );
END;
$$;

-- 6. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin read all profiles" ON public.profiles;
CREATE POLICY "Admin read all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin full control on profiles" ON public.profiles;
CREATE POLICY "Admin full control on profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_admin());

-- PAYMENTS POLICIES
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own payment" ON public.payments;
CREATE POLICY "Users can insert own payment"
    ON public.payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can update payments" ON public.payments;
CREATE POLICY "Admin can update payments"
    ON public.payments FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full control on payments" ON public.payments;
CREATE POLICY "Admin full control on payments"
    ON public.payments FOR ALL
    USING (public.is_admin());

-- VIDEOS POLICIES
DROP POLICY IF EXISTS "Approved users and admin can view published videos" ON public.videos;
CREATE POLICY "Approved users and admin can view published videos"
    ON public.videos FOR SELECT
    USING (
        (is_published = true AND public.is_approved_user())
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Admin full control on videos" ON public.videos;
CREATE POLICY "Admin full control on videos"
    ON public.videos FOR ALL
    USING (public.is_admin());

-- SETTINGS POLICIES
DROP POLICY IF EXISTS "Logged in users can view settings" ON public.settings;
CREATE POLICY "Logged in users can view settings"
    ON public.settings FOR SELECT
    USING (auth.role() = 'authenticated' OR public.is_admin());

DROP POLICY IF EXISTS "Admin can update settings" ON public.settings;
CREATE POLICY "Admin can update settings"
    ON public.settings FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admin full control on settings" ON public.settings;
CREATE POLICY "Admin full control on settings"
    ON public.settings FOR ALL
    USING (public.is_admin());

-- 7. STORAGE BUCKETS SETUP & STORAGE POLICIES
-- Note: Buckets can be created via Supabase Dashboard or the following inserts:

INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('payment-screenshots', 'payment-screenshots', false),
    ('videos', 'videos', false),
    ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- PAYMENT-SCREENSHOTS STORAGE POLICIES
-- Users can upload screenshot only into their own user folder: <auth.uid()>/filename
CREATE POLICY "Users can upload own screenshot"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'payment-screenshots' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own screenshot, admin can read all
CREATE POLICY "Users and admin read screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment-screenshots' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text 
        OR public.is_admin()
    )
);

-- VIDEOS STORAGE POLICIES
-- Admin can upload/manage video files
CREATE POLICY "Admin upload video files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'videos' 
    AND public.is_admin()
);

CREATE POLICY "Admin manage video files"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'videos' 
    AND public.is_admin()
);

-- Approved users and admin can read/stream videos
CREATE POLICY "Approved users can read videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'videos' 
    AND (public.is_approved_user() OR public.is_admin())
);

-- THUMBNAILS STORAGE POLICIES
-- Public / Authenticated read thumbnails
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

-- Admin upload/manage thumbnails
CREATE POLICY "Admin manage thumbnails"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'thumbnails' 
    AND public.is_admin()
);

-- 8. PUBLIC LESSONS CATALOG VIEW (For Public Landing Page)
-- Exposes ONLY public metadata: id, title, description, thumbnail_path, duration, is_published, is_free_preview, created_at
-- NEVER exposes video_path or storage secrets to anonymous callers!
DROP VIEW IF EXISTS public.public_videos CASCADE;
CREATE OR REPLACE VIEW public.public_videos AS
SELECT 
    id,
    title,
    description,
    thumbnail_path,
    duration,
    is_published,
    is_free_preview,
    created_at
FROM public.videos
WHERE is_published = true;

GRANT SELECT ON public.public_videos TO anon, authenticated;

-- Public Storage Policy for Free Preview Videos in Private "videos" Bucket
DROP POLICY IF EXISTS "Public can stream free preview videos" ON storage.objects;
CREATE POLICY "Public can stream free preview videos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'videos'
    AND EXISTS (
        SELECT 1 FROM public.videos v
        WHERE v.is_published = true 
          AND v.is_free_preview = true 
          AND v.video_path = name
    )
);

-- Secure RPC to get free preview playback information
CREATE OR REPLACE FUNCTION public.get_free_preview_video(p_video_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_video RECORD;
BEGIN
    SELECT * INTO v_video 
    FROM public.videos 
    WHERE id = p_video_id AND is_published = true AND is_free_preview = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'This lesson is not available as a free preview';
    END IF;

    RETURN jsonb_build_object(
        'id', v_video.id,
        'title', v_video.title,
        'description', v_video.description,
        'video_path', v_video.video_path,
        'duration', v_video.duration,
        'thumbnail_path', v_video.thumbnail_path
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_free_preview_video(UUID) TO anon, authenticated;


