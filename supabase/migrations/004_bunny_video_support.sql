-- ==============================================================================
-- Levelling Up - Migration: 004_bunny_video_support.sql
-- Add Bunny Stream embed support (additive only, no drops/deletes)
-- ==============================================================================

-- 1. Add video_url column (the embed URL for Bunny/YouTube/Vimeo)
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 2. Add video_source column to track where the video lives
-- Allowed values: 'bunny', 'youtube', 'vimeo', 'storage'
-- Default 'storage' for backward compat with existing uploaded videos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'videos'
          AND column_name = 'video_source'
    ) THEN
        ALTER TABLE public.videos
        ADD COLUMN video_source TEXT DEFAULT 'storage' NOT NULL;

        ALTER TABLE public.videos
        ADD CONSTRAINT videos_video_source_check
        CHECK (video_source IN ('bunny', 'youtube', 'vimeo', 'storage'));
    END IF;
END $$;

-- 3. Recreate the public_videos view WITHOUT video_url or video_path
-- SECURITY: These fields must NEVER be exposed publicly.
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

-- 4. Update the free-preview RPC to also return video_url and video_source
-- (only for free-preview videos, so non-approved users can watch previews)
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
        'video_url', v_video.video_url,
        'video_source', v_video.video_source,
        'duration', v_video.duration,
        'thumbnail_path', v_video.thumbnail_path
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_free_preview_video(UUID) TO anon, authenticated;
