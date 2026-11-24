import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Video } from '../types';
import { isEmbedVideo, ensureResponsive } from '../lib/videoHelpers';
import { AlertCircle, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  video: Video;
  className?: string;
  autoPlay?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  className = '',
  autoPlay = false,
}) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const embed = isEmbedVideo(video);

  useEffect(() => {
    let isCancelled = false;

    async function resolveVideoUrl() {
      setLoading(true);
      setError(null);

      // ── Embed videos (Bunny / YouTube / Vimeo) ────────────────────────
      if (embed && video.video_url) {
        const url = ensureResponsive(video.video_url);
        setVideoUrl(url);
        setLoading(false);
        return;
      }

      // ── Storage videos: direct / public URLs ──────────────────────────
      if (
        video.video_path.startsWith('http://') ||
        video.video_path.startsWith('https://') ||
        video.video_path.startsWith('data:') ||
        video.video_path.startsWith('blob:')
      ) {
        setVideoUrl(video.video_path);
        setLoading(false);
        return;
      }

      // ── Storage videos: signed URL from private bucket ────────────────
      try {
        const { data, error: signError } = await supabase.storage
          .from('videos')
          .createSignedUrl(video.video_path, 3600);

        if (isCancelled) return;

        if (signError) {
          console.error('Error generating signed URL:', signError);
          setError('Could not generate secure playback token: ' + signError.message);
        } else if (data?.signedUrl) {
          setVideoUrl(data.signedUrl);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to load video stream.');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    resolveVideoUrl();

    return () => {
      isCancelled = true;
    };
  }, [video.video_path, video.video_url, embed]);

  // Security: disable right-click on native player
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // ── Embed iframe renderer ───────────────────────────────────────────────
  if (embed) {
    return (
      <div
        className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-soft select-none ${className}`}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-white z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
              <span className="text-xs text-neutral-400">Loading video player...</span>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-white p-6 z-10">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <h4 className="font-semibold text-sm">Playback Error</h4>
              <p className="text-xs text-neutral-400">{error}</p>
            </div>
          </div>
        ) : (
          <iframe
            src={videoUrl}
            loading="lazy"
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title={video.title}
          />
        )}
      </div>
    );
  }

  // ── Native <video> renderer (storage videos) ───────────────────────────
  return (
    <div
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-soft select-none ${className}`}
      onContextMenu={handleContextMenu}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-white z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
            <span className="text-xs text-neutral-400">Loading secure video stream...</span>
          </div>
        </div>
      )}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-white p-6 z-10">
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <h4 className="font-semibold text-sm">Playback Error</h4>
            <p className="text-xs text-neutral-400">{error}</p>
          </div>
        </div>
      ) : (
        videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            controlsList="nodownload"
            onContextMenu={handleContextMenu}
            poster={video.thumbnail_path || undefined}
            autoPlay={autoPlay}
            playsInline
            className="w-full h-full object-cover protected-video"
          >
            Your browser does not support the video tag.
          </video>
        )
      )}
    </div>
  );
};
