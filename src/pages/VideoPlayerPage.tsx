import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoCard } from '../components/VideoCard';
import { supabase } from '../lib/supabase';
import type { Video } from '../types';
import {
  ArrowLeft,
  Clock,
  Calendar,
  Loader2,
  Film,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '../lib/utils';

export const VideoPlayerPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');
  const { id } = useParams<{ id: string }>();

  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVideoData() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: vError } = await supabase
          .from('videos')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (vError) {
          console.error('[VideoPlayerPage] Error loading videos:', vError);
          setError(vError.message);
          return;
        }

        if (data && data.length > 0) {
          setAllVideos(data as Video[]);
          const found = data.find((v) => v.id === id);
          if (found) {
            setCurrentVideo(found as Video);
          } else {
            setCurrentVideo(data[0] as Video);
          }
        } else {
          setError(t('videos.noLessons'));
        }
      } catch (err: any) {
        console.error('[VideoPlayerPage] Unexpected error:', err);
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }

    loadVideoData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id, t]);

  const otherLessons = allVideos.filter((v) => v.id !== currentVideo?.id);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col text-[#111111] selection:bg-[#111111] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Back Link to All Videos */}
        <div className="mb-6">
          <Link
            to="/videos"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#6B7280] hover:text-[#111111] transition-colors group"
          >
            <ArrowLeft className={`w-4 h-4 transition-transform ${isRtl ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
            <span>{t('videos.backToAll')}</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#111111]" />
            <p className="text-xs sm:text-sm text-[#6B7280] font-medium">
              {t('videos.loadingPlayer')}
            </p>
          </div>
        ) : error || !currentVideo ? (
          <div className="py-16 text-center max-w-md mx-auto bg-white rounded-3xl border border-neutral-200 p-8 shadow-soft">
            <Film className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
            <h2 className="text-lg font-bold text-[#111111]">{t('videos.lessonNotFound')}</h2>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1 mb-6">
              {error || t('videos.lessonNotFoundDesc')}
            </p>
            <Link
              to="/videos"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
            >
              {t('videos.returnToLibrary')}
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-soft overflow-hidden p-4 sm:p-6 lg:p-8 space-y-6">
              <div className="rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
                <VideoPlayer video={currentVideo} autoPlay={false} />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  {currentVideo.is_free_preview && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-[#B8860B] border border-amber-200">
                      <Sparkles className="w-3 h-3" />
                      <span>{t('videos.freePreview')}</span>
                    </span>
                  )}
                  {currentVideo.duration && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[#6B7280] bg-neutral-100 px-2.5 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
                      <span className="force-ltr">{currentVideo.duration}</span>
                    </span>
                  )}
                  {currentVideo.created_at && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#6B7280]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="force-ltr">{formatDate(currentVideo.created_at, i18n.language)}</span>
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111111] leading-tight">
                  {currentVideo.title}
                </h1>

                <div className="pt-2 text-sm sm:text-base text-[#6B7280] leading-relaxed whitespace-pre-line border-t border-neutral-100">
                  {currentVideo.description || t('videos.noDescription')}
                </div>
              </div>
            </div>

            {otherLessons.length > 0 && (
              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
                      {t('videos.otherLessons')}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
                      {t('videos.otherLessonsDesc')}
                    </p>
                  </div>
                  <Link
                    to="/videos"
                    className="text-xs sm:text-sm font-semibold text-[#111111] hover:underline"
                  >
                    {t('videos.viewAll', { count: allVideos.length })}
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
                  {otherLessons.map((vid, idx) => (
                    <VideoCard
                      key={vid.id}
                      video={vid}
                      index={idx}
                      isApproved={true}
                      onSelect={(v) => {
                        window.location.href = `/videos/${v.id}`;
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
