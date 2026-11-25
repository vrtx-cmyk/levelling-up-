import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { VideoCard } from '../components/VideoCard';
import { supabase } from '../lib/supabase';
import type { Video } from '../types';
import {
  Search,
  Film,
  Sparkles,
} from 'lucide-react';

export const VideoLibraryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [videos, setVideos] = useState<Video[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVideos() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[VideoLibraryPage] Error loading videos:', error);
        } else if (data) {
          setVideos(data as Video[]);
        }
      } catch (err) {
        console.error('[VideoLibraryPage] Video load exception:', err);
      } finally {
        setLoading(false);
      }
    }

    loadVideos();
  }, []);

  const filteredVideos = videos.filter(
    (v) =>
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col text-[#111111] selection:bg-[#111111] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Row: Title & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-neutral-200/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('videos.libraryBadge')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111111]">
              {t('videos.libraryTitle')}
            </h1>
            <p className="text-sm sm:text-base text-[#6B7280] mt-1.5">
              {t('videos.librarySubtitle')}
            </p>
          </div>

          {/* Search Bar on Top */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-[#6B7280]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={t('videos.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#111111] shadow-soft transition-all"
            />
          </div>
        </div>

        {/* Video Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((sk) => (
              <div
                key={sk}
                className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-soft animate-pulse space-y-4"
              >
                <div className="w-full aspect-video rounded-2xl bg-neutral-200" />
                <div className="space-y-2 pt-2">
                  <div className="w-3/4 h-5 rounded-lg bg-neutral-200" />
                  <div className="w-full h-3.5 rounded bg-neutral-100" />
                  <div className="w-2/3 h-3.5 rounded bg-neutral-100" />
                </div>
                <div className="pt-3 border-t border-neutral-100 flex justify-between">
                  <div className="w-16 h-4 bg-neutral-100 rounded" />
                  <div className="w-16 h-6 bg-neutral-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-200/90 p-12 sm:p-16 text-center shadow-soft max-w-md mx-auto my-12">
            <Film className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
            <h3 className="text-lg font-bold text-[#111111]">
              {searchQuery ? t('videos.noMatchTitle') : t('videos.noLessons')}
            </h3>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1.5 leading-relaxed">
              {searchQuery ? t('videos.noMatchDesc') : t('videos.noLessonsDesc')}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-[#111111] transition-colors cursor-pointer"
              >
                {t('videos.clearSearch')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {filteredVideos.map((video, idx) => (
              <VideoCard
                key={video.id}
                video={video}
                index={idx}
                isApproved={true}
                onSelect={(v) => navigate(`/videos/${v.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
