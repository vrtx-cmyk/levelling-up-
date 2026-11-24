-- ==============================================================================
-- Levelling Up - Migration: 003_public_lessons_catalog.sql
-- Public Lessons Catalog View & Free Preview Support
-- ==============================================================================

-- 1. Add is_free_preview column to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Create the secure public_videos view
-- Exposes ONLY public metadata: id, title, description, thumbnail_path, duration, is_published, is_free_preview, created_at
-- NEVER exposes video_path or private bucket file paths to the public!
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

-- 3. Grant anonymous and authenticated read permissions on the view
GRANT SELECT ON public.public_videos TO anon, authenticated;

-- 4. Public Storage Policy for Thumbnails Bucket
-- Allows public viewing of video thumbnails
DROP POLICY IF EXISTS "Public can view thumbnails" ON storage.objects;
CREATE POLICY "Public can view thumbnails"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'thumbnails');

-- 5. Public Storage Policy for Free Preview Videos
-- Allows streaming video file if and only if that video is explicitly marked as is_free_preview = true
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

-- 6. Helper RPC to get free preview video playback details
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

