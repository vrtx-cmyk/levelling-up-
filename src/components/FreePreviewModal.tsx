import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { isEmbedVideo, ensureResponsive } from '../lib/videoHelpers';
import { X, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import type { PublicVideo } from '../types';

interface FreePreviewModalProps {
  video: PublicVideo | null;
  onClose: () => void;
}

export const FreePreviewModal: React.FC<FreePreviewModalProps> = ({ video, onClose }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');

  const { user, isApproved } = useAuth();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isEmbed, setIsEmbed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    if (!video) return;

    let isMounted = true;
    setLoading(true);
    setPlaybackError(null);

    async function loadPreviewStream() {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_free_preview_video', {
          p_video_id: video?.id,
        });

        if (rpcErr) {
          console.warn('[FreePreviewModal] RPC error:', rpcErr);
        }

        const embedUrl = rpcData?.video_url;
        const videoSource = rpcData?.video_source;
        const videoPath = rpcData?.video_path || (video as any)?.video_path;

        if (embedUrl || (videoSource && videoSource !== 'storage')) {
          if (isMounted) {
            setIsEmbed(true);
            setVideoUrl(ensureResponsive(embedUrl || videoPath));
          }
          return;
        }

        if (videoPath) {
          if (isEmbedVideo({ video_path: videoPath, video_url: videoPath })) {
            if (isMounted) {
              setIsEmbed(true);
              setVideoUrl(ensureResponsive(videoPath));
            }
          } else if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
            if (isMounted) {
              setIsEmbed(false);
              setVideoUrl(videoPath);
            }
          } else {
            const { data: signData, error: signErr } = await supabase.storage
              .from('videos')
              .createSignedUrl(videoPath, 3600);

            if (signErr) {
              const { data: pubData } = supabase.storage.from('videos').getPublicUrl(videoPath);
              if (pubData?.publicUrl && isMounted) {
                setIsEmbed(false);
                setVideoUrl(pubData.publicUrl);
              }
            } else if (signData?.signedUrl && isMounted) {
              setIsEmbed(false);
              setVideoUrl(signData.signedUrl);
            }
          }
        }
      } catch (err: any) {
        console.error('[FreePreviewModal] Error loading preview stream:', err);
        if (isMounted) {
          setPlaybackError(t('videos.lessonNotFoundDesc'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPreviewStream();

    return () => {
      isMounted = false;
    };
  }, [video, t]);

  if (!video) return null;

  const targetLink = !user ? '/signup' : !isApproved ? '/payment' : '/videos';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-[#B8860B] border border-amber-200">
              <Sparkles className="w-3 h-3" />
              <span>{t('videos.freePreview')}</span>
            </span>
            <h3 className="font-semibold text-neutral-900 text-sm truncate max-w-md">
              {video.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
              <p className="text-xs text-neutral-400 font-medium">{t('videos.loadingPlayer')}</p>
            </div>
          ) : playbackError ? (
            <div className="p-8 text-center text-neutral-300">
              <p className="text-sm font-semibold text-white mb-2">{playbackError}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          ) : videoUrl ? (
            isEmbed ? (
              <iframe
                src={videoUrl}
                loading="lazy"
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title={video.title}
              />
            ) : (
              <video
                src={videoUrl}
                controls
                autoPlay
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                className="w-full h-full object-contain"
              />
            )
          ) : null}
        </div>

        {/* Content & CTA Footer */}
        <div className="p-6 bg-white space-y-4 overflow-y-auto">
          <div>
            <h4 className="text-lg font-bold text-[#111111]">{video.title}</h4>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1 leading-relaxed">
              {video.description || ''}
            </p>
          </div>

          {/* Call-to-Action banner */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#111111]">
                {t('landing.cta.title')}
              </p>
              <p className="text-[11px] text-[#6B7280]">
                {t('landing.lessons.unlockAllLessons')}
              </p>
            </div>

            <Link
              to={targetLink}
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-soft flex-shrink-0 cursor-pointer"
            >
              <span>{t('landing.lessons.unlockAll')}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
