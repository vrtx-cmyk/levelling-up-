import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Clock, Lock, Sparkles } from 'lucide-react';
import type { Video, PublicVideo } from '../types';

interface VideoCardProps {
  video: Video | PublicVideo;
  index?: number;
  isApproved?: boolean;
  onSelect: (video: Video | PublicVideo) => void;
  className?: string;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  index,
  isApproved = false,
  onSelect,
  className = '',
}) => {
  const { t } = useTranslation();
  const isLocked = !isApproved && !video.is_free_preview;

  return (
    <div
      onClick={() => onSelect(video)}
      className={`group cursor-pointer rounded-2xl bg-white border border-neutral-200/90 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between p-[20px] md:p-4 selection:bg-none ${className}`}
    >
      <div>
        {/* Cover image (16:9, rounded corners 16px, object-fit cover) */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-100/90 flex-shrink-0">
          {video.thumbnail_path ? (
            <img
              src={video.thumbnail_path}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-500">
              <Play className="w-8 h-8 opacity-40" />
            </div>
          )}

          {/* Free Preview Tag if applicable */}
          {video.is_free_preview && (
            <div className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 z-10">
              <Sparkles className="w-3 h-3" />
              <span>{t('videos.freePreview')}</span>
            </div>
          )}

          {/* Hover Play Button (for unlocked or free preview) */}
          {!isLocked && (
            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white text-[#111111] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
          )}

          {/* Lock Overlay on Image if locked */}
          {isLocked && (
            <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center transition-colors group-hover:bg-black/45">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                <Lock className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Brand Icon or Number Badge + Title in bold */}
        <div className="flex items-center gap-2.5 mt-4 mb-2">
          <div className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center flex-shrink-0 text-[11px] font-bold force-ltr">
            {index !== undefined ? (
              <span>{index < 9 ? `0${index + 1}` : index + 1}</span>
            ) : (
              <span className="text-[#B8860B] text-[9px] -translate-y-px">▲</span>
            )}
          </div>
          <h3 className="font-bold text-[#111111] text-[16px] leading-snug tracking-tight group-hover:text-black line-clamp-1">
            {video.title}
          </h3>
        </div>

        {/* Description: max 3 lines with ellipsis */}
        <p className="text-xs sm:text-[13px] text-[#6B7280] line-clamp-3 leading-relaxed">
          {video.description || ''}
        </p>
      </div>

      {/* Bottom Row: Duration on left, Lock or Watch button on right */}
      <div className="pt-3.5 mt-4 border-t border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#6B7280]">
          <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
          <span className="force-ltr">{video.duration || '00:00'}</span>
        </div>

        <div>
          {isLocked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-[#6B7280]">
              <Lock className="w-3.5 h-3.5 text-[#B8860B]" />
              <span>{t('admin.videos.draft') === 'Draft' ? 'Locked' : 'مغلق'}</span>
            </span>
          ) : video.is_free_preview && !isApproved ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-[#B8860B] border border-amber-200">
              <Sparkles className="w-3 h-3" />
              <span>{t('videos.freePreview')}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#111111] text-white text-xs font-semibold group-hover:bg-neutral-800 transition-colors shadow-xs">
              <span>{t('landing.lessons.watchAll')}</span>
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
