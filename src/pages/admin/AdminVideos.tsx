import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../lib/utils';
import { AdminConfirmDialog } from '../../components/AdminConfirmDialog';
import {
  parseVideoInput,
  extractSrcFromIframe,
  detectSource,
  ensureResponsive,
} from '../../lib/videoHelpers';
import type { Video, VideoSource } from '../../types';
import {
  Plus,
  Film,
  Trash2,
  Edit3,
  Loader2,
  Clock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  X,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  RefreshCw,
  Play,
} from 'lucide-react';

export const AdminVideos: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Full-Page (mobile) / Modal (desktop) Add & Edit Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('00:00');
  const [isPublished, setIsPublished] = useState(true);
  const [isFreePreview, setIsFreePreview] = useState(false);

  // File states
  const [selectedThumbFile, setSelectedThumbFile] = useState<File | null>(null);
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string | null>(null);

  // Upload progress & error
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Video URL validation state
  const [urlError, setUrlError] = useState<string | null>(null);
  const [detectedSource, setDetectedSource] = useState<VideoSource | null>(null);

  // Delete confirmation dialog state
  const [confirmDeleteVideo, setConfirmDeleteVideo] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState(false);

  const thumbInputRef = useRef<HTMLInputElement>(null);

  const { success, error: toastError } = useToast();

  const loadVideos = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdminVideos] Error loading videos:', error);
        setLoadError('Could not load videos. Please try again.');
        toastError('Could not load videos.');
      } else if (data) {
        setVideos(data as Video[]);
      }
    } catch (err: any) {
      console.error('[AdminVideos] Unexpected error:', err);
      setLoadError('Failed to load videos. Please try again.');
      toastError('Failed to load videos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const handleOpenAddForm = () => {
    setEditingVideo(null);
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setDuration('00:00');
    setIsPublished(true);
    setIsFreePreview(false);
    setSelectedThumbFile(null);
    setThumbPreviewUrl(null);
    setUploadProgress(null);
    setFormError(null);
    setUrlError(null);
    setDetectedSource(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (video: Video) => {
    setEditingVideo(video);
    setTitle(video.title);
    setDescription(video.description || '');
    const editUrl = video.video_url || video.video_path || '';
    setVideoUrl(editUrl);
    setDuration(video.duration || '00:00');
    setIsPublished(video.is_published);
    setIsFreePreview(Boolean(video.is_free_preview));
    setSelectedThumbFile(null);
    setThumbPreviewUrl(video.thumbnail_path || null);
    setUploadProgress(null);
    setFormError(null);
    setUrlError(null);
    setDetectedSource(video.video_source || detectSource(editUrl));
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingVideo(null);
    setSelectedThumbFile(null);
    setThumbPreviewUrl(null);
    setUploadProgress(null);
    setFormError(null);
    setUrlError(null);
    setDetectedSource(null);
  };

  const handleVideoUrlChange = (value: string) => {
    const cleaned = extractSrcFromIframe(value);
    setVideoUrl(cleaned);
    setUrlError(null);

    if (cleaned.trim()) {
      const parsed = parseVideoInput(cleaned.trim());
      if (parsed.success) {
        setDetectedSource(parsed.source);
      } else {
        setDetectedSource(null);
      }
    } else {
      setDetectedSource(null);
    }
  };

  const handleThumbSelect = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    const MAX_THUMB_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_THUMB_SIZE) {
      toastError('Thumbnail image must be under 5MB.');
      return;
    }
    setSelectedThumbFile(file);
    const objectUrl = URL.createObjectURL(file);
    setThumbPreviewUrl(objectUrl);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setUrlError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError('Please enter a video title.');
      return;
    }

    const cleanDuration = duration.trim();
    if (!/^\d{1,3}:[0-5]\d$/.test(cleanDuration)) {
      setFormError('Please enter duration in mm:ss format (e.g. 12:45).');
      return;
    }

    const cleanUrl = videoUrl.trim();
    if (cleanUrl) {
      const parsed = parseVideoInput(cleanUrl);
      if (!parsed.success) {
        setUrlError(parsed.error || 'This is not a valid embed link. Copy the Embed URL from Bunny.');
        setFormError('Please enter a valid Bunny embed link, YouTube or Vimeo URL.');
        return;
      }
    }

    setSubmitting(true);
    setUploadProgress(15);

    try {
      let finalVideoUrl: string | null = null;
      let finalVideoSource: VideoSource = 'storage';
      let finalVideoPath = editingVideo?.video_path || '';

      if (cleanUrl) {
        const parsed = parseVideoInput(cleanUrl);
        if (parsed.success) {
          finalVideoUrl = parsed.url;
          finalVideoSource = parsed.source;
          finalVideoPath = parsed.url;
        }
      }

      let finalThumbPath = thumbPreviewUrl ? editingVideo?.thumbnail_path || null : null;

      if (selectedThumbFile) {
        setUploadProgress(40);
        const thumbExt = selectedThumbFile.name.split('.').pop() || 'jpg';
        const thumbStoragePath = `thumbs/${Date.now()}_${Math.floor(Math.random() * 10000)}.${thumbExt}`;

        const { error: thumbErr } = await supabase.storage
          .from('thumbnails')
          .upload(thumbStoragePath, selectedThumbFile, { upsert: true });

        if (thumbErr) {
          console.error('[AdminVideos] Thumbnail upload error:', thumbErr);
          throw new Error('Failed to upload thumbnail. Please try again.');
        }

        const { data: pubData } = supabase.storage
          .from('thumbnails')
          .getPublicUrl(thumbStoragePath);

        if (pubData?.publicUrl) {
          finalThumbPath = pubData.publicUrl;
        }
      }

      setUploadProgress(70);

      const videoRecord = {
        title: cleanTitle,
        description: description.trim(),
        duration: cleanDuration,
        video_path: finalVideoPath,
        video_url: finalVideoUrl,
        video_source: finalVideoSource,
        thumbnail_path: finalThumbPath,
        is_published: isPublished,
        is_free_preview: isFreePreview,
        updated_at: new Date().toISOString(),
      };

      if (editingVideo) {
        const { error: updErr } = await supabase
          .from('videos')
          .update(videoRecord)
          .eq('id', editingVideo.id);

        if (updErr) {
          console.error('[AdminVideos] Update error:', updErr);
          throw new Error(updErr.message || 'Could not update video.');
        }

        success(`Video "${cleanTitle}" updated successfully!`);
      } else {
        const { error: insErr } = await supabase.from('videos').insert(videoRecord);

        if (insErr) {
          console.error('[AdminVideos] Insert error:', insErr);
          throw new Error(insErr.message || 'Could not publish video.');
        }

        success(`Video "${cleanTitle}" saved successfully!`);
      }

      setUploadProgress(100);
      setIsFormOpen(false);
      await loadVideos();
    } catch (err: any) {
      console.error('[AdminVideos] Submit error:', err);
      const errMsg = err.message || 'An error occurred while saving the video.';
      setFormError(errMsg);
      toastError(errMsg);
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleTogglePublish = async (video: Video) => {
    const nextPublished = !video.is_published;
    try {
      const { error: updErr } = await supabase
        .from('videos')
        .update({ is_published: nextPublished })
        .eq('id', video.id);

      if (updErr) throw updErr;

      success(`Video ${nextPublished ? 'published' : 'moved to draft'}.`);
      await loadVideos();
    } catch (err: any) {
      console.error('[AdminVideos] Toggle publish error:', err);
      toastError(err.message || 'Failed to update video status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteVideo) return;
    const video = confirmDeleteVideo;
    setDeleting(true);
    try {
      const { error: delErr } = await supabase.from('videos').delete().eq('id', video.id);
      if (delErr) throw delErr;

      if (
        video.video_path &&
        !video.video_path.startsWith('http') &&
        (!video.video_source || video.video_source === 'storage')
      ) {
        await supabase.storage.from('videos').remove([video.video_path]);
      }

      success(`Video "${video.title}" deleted.`);
      setConfirmDeleteVideo(null);
      await loadVideos();
    } catch (err: any) {
      console.error('[AdminVideos] Delete error:', err);
      toastError(err.message || 'Failed to delete video.');
    } finally {
      setDeleting(false);
    }
  };

  const sourceLabel = (src?: VideoSource | string) => {
    switch (src) {
      case 'bunny': return 'Bunny';
      case 'youtube': return 'YouTube';
      case 'vimeo': return 'Vimeo';
      default: return 'Storage';
    }
  };

  const sourceBadge = (src?: VideoSource | string) => {
    switch (src) {
      case 'bunny': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'youtube': return 'bg-red-50 text-red-700 border-red-200';
      case 'vimeo': return 'bg-sky-50 text-sky-700 border-sky-200';
      default: return 'bg-neutral-100 text-[#6B7280] border-neutral-200';
    }
  };

  const previewEmbedUrl = (() => {
    if (!videoUrl.trim()) return null;
    const parsed = parseVideoInput(videoUrl.trim());
    if (parsed.success) return ensureResponsive(parsed.url);
    return null;
  })();

  return (
    <div className="space-y-5 md:space-y-6 pb-20 md:pb-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="hidden md:block text-2xl font-bold tracking-tight text-[#111111]">
              {t('admin.videos.title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] md:mt-1">
              Manage video lessons, add embed links, and toggle publishing
            </p>
          </div>
          <button
            type="button"
            onClick={loadVideos}
            className="md:hidden min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white text-[#111111] shadow-2xs flex-shrink-0 cursor-pointer"
            aria-label="Refresh videos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Desktop Add Button */}
        <button
          type="button"
          onClick={handleOpenAddForm}
          className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111111] text-white text-xs sm:text-sm font-semibold hover:bg-neutral-800 shadow-soft transition-colors self-start md:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('admin.videos.addNew')}</span>
        </button>
      </div>

      {/* Error State */}
      {loadError && !loading && (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3 shadow-soft">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
          <p className="text-sm font-semibold text-[#111111]">{loadError}</p>
          <button
            type="button"
            onClick={loadVideos}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Mobile Loading Skeletons */}
      {loading && (
        <div className="md:hidden space-y-3.5">
          {[1, 2, 3].map((sk) => (
            <div
              key={sk}
              className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-soft space-y-3 animate-pulse"
            >
              <div className="w-full aspect-video rounded-xl bg-neutral-200" />
              <div className="w-3/4 h-4 rounded bg-neutral-200" />
              <div className="flex gap-2">
                <div className="flex-1 h-11 rounded-xl bg-neutral-100" />
                <div className="flex-1 h-11 rounded-xl bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile Video Cards */}
      {!loading && !loadError && (
        <div className="md:hidden space-y-3.5">
          {videos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200/90 p-10 text-center text-[#6B7280] shadow-soft">
              <Film className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-[#111111]">No videos yet</p>
            </div>
          ) : (
            videos.map((vid) => (
              <div
                key={vid.id}
                data-video-card={vid.id}
                className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-soft space-y-3"
              >
                <div className="relative aspect-video w-full rounded-xl bg-neutral-900 overflow-hidden">
                  {vid.thumbnail_path ? (
                    <img
                      src={vid.thumbnail_path}
                      alt={vid.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                      <Film className="w-8 h-8" />
                    </div>
                  )}

                  <span className="absolute bottom-2 right-2 rtl:right-auto rtl:left-2 inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-white bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-md force-ltr">
                    <Clock className="w-3 h-3" />
                    {vid.duration || '00:00'}
                  </span>

                  {vid.video_source && vid.video_source !== 'storage' && (
                    <span className={`absolute top-2 left-2 rtl:left-auto rtl:right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sourceBadge(vid.video_source)}`}>
                      <Play className="w-2.5 h-2.5" />
                      {sourceLabel(vid.video_source)}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-[#111111] leading-snug break-words">
                      {vid.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(vid)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        vid.is_published
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                          : 'bg-neutral-100 text-[#6B7280] border border-neutral-200'
                      }`}
                    >
                      {vid.is_published ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>{t('admin.videos.published')}</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-neutral-500" />
                          <span>{t('admin.videos.draft')}</span>
                        </>
                      )}
                    </button>

                    {vid.is_free_preview && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-[#B8860B] border border-amber-200">
                        <Sparkles className="w-3 h-3" />
                        <span>Free Preview</span>
                      </span>
                    )}

                    <span className="text-[#6B7280] text-[11px] force-ltr">{formatDate(vid.created_at, i18n.language)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => handleOpenEditForm(vid)}
                    className="min-h-[44px] rounded-xl border border-neutral-200 bg-[#FAFAFA] hover:bg-neutral-100 text-xs font-semibold text-[#111111] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-[#6B7280]" />
                    <span>{t('admin.videos.edit')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteVideo(vid)}
                    className="min-h-[44px] rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-xs font-semibold text-rose-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>{t('admin.videos.delete')}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Desktop Videos Table (>= 768px) */}
      {!loading && !loadError && (
        <div className="hidden md:block bg-white rounded-2xl border border-neutral-200/90 shadow-soft overflow-hidden">
          {videos.length === 0 ? (
            <div className="p-16 text-center text-[#6B7280]">
              <Film className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
              <p className="text-base font-semibold text-[#111111]">No videos created yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs sm:text-sm">
                <thead className="bg-[#FAFAFA] border-b border-neutral-200 text-[#6B7280] uppercase tracking-wider text-[11px] font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">{t('admin.videos.thumbnailLabel')}</th>
                    <th className="px-6 py-3.5">{t('admin.videos.titleLabel')}</th>
                    <th className="px-6 py-3.5">{t('admin.videos.durationLabel')}</th>
                    <th className="px-6 py-3.5">Source</th>
                    <th className="px-6 py-3.5">{t('admin.users.status')}</th>
                    <th className="px-6 py-3.5">{t('admin.payments.date')}</th>
                    <th className="px-6 py-3.5 text-right rtl:text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {videos.map((vid) => (
                    <tr key={vid.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="px-6 py-3">
                        <div className="w-20 h-12 rounded-lg bg-neutral-900 overflow-hidden relative border border-neutral-200 flex-shrink-0">
                          {vid.thumbnail_path ? (
                            <img
                              src={vid.thumbnail_path}
                              alt={vid.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-500">
                              <Film className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-3 font-semibold text-[#111111] max-w-xs">
                        <div className="truncate">{vid.title}</div>
                        {vid.description && (
                          <div className="text-xs text-[#6B7280] font-normal truncate mt-0.5">
                            {vid.description}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-3 font-mono text-xs text-[#6B7280] whitespace-nowrap force-ltr">
                        {vid.duration || '00:00'}
                      </td>

                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sourceBadge(vid.video_source)}`}>
                          <Play className="w-2.5 h-2.5" />
                          <span>{sourceLabel(vid.video_source)}</span>
                        </span>
                      </td>

                      <td className="px-6 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(vid)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                            vid.is_published
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-neutral-100 text-[#6B7280] hover:bg-neutral-200'
                          }`}
                        >
                          {vid.is_published ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>{t('admin.videos.published')}</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-neutral-500" />
                              <span>{t('admin.videos.draft')}</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-6 py-3 text-[#6B7280] whitespace-nowrap force-ltr">
                        {formatDate(vid.created_at, i18n.language)}
                      </td>

                      <td className="px-6 py-3 text-right rtl:text-left whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(vid)}
                            className="p-1.5 text-[#6B7280] hover:text-[#111111] hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                            title={t('admin.videos.edit')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteVideo(vid)}
                            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={t('admin.videos.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sticky Mobile "Add new video" Button */}
      <div
        className="md:hidden fixed bottom-[68px] right-4 rtl:right-auto rtl:left-4 z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          type="button"
          onClick={handleOpenAddForm}
          className="min-h-[48px] px-5 py-3 rounded-full bg-[#111111] text-white text-sm font-semibold shadow-soft-lg flex items-center gap-2 hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Add new video"
        >
          <Plus className="w-5 h-5" />
          <span>{t('admin.videos.addNew')}</span>
        </button>
      </div>

      {/* Add / Edit Form: Full Page on Mobile, Modal on Desktop */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs md:flex md:items-center md:justify-center md:p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full min-h-screen md:min-h-0 md:max-w-2xl bg-white md:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-4 border-b border-neutral-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-[#111111]">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#111111]">
                    {editingVideo ? t('admin.videos.edit') : t('admin.videos.addNew')}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                disabled={submitting}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#6B7280] hover:text-[#111111] hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                aria-label="Close form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col justify-between">
              <div className="p-4 sm:p-8 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)] md:max-h-[72vh]">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    {t('admin.videos.titleLabel')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Mastering Female Psychology in Conflict"
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    {t('admin.videos.descriptionLabel')}
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed overview of what members will learn in this lesson..."
                    className="w-full p-3.5 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                  />
                </div>

                {/* Video URL (Bunny embed link) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111]">
                      {t('admin.videos.videoUrlLabel')}
                    </label>
                    {detectedSource && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sourceBadge(detectedSource)}`}>
                        <Play className="w-2.5 h-2.5" />
                        <span>Detected: {sourceLabel(detectedSource)}</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-[#6B7280]">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => handleVideoUrlChange(e.target.value)}
                      placeholder="https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID"
                      className={`w-full min-h-[44px] pl-10 pr-3.5 rtl:pl-3.5 rtl:pr-10 py-2.5 bg-[#FAFAFA] border rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 transition-all force-ltr ${
                        urlError
                          ? 'border-rose-400 focus:ring-rose-500'
                          : 'border-neutral-200 focus:ring-[#111111]'
                      }`}
                    />
                  </div>
                  {urlError ? (
                    <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{urlError}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#6B7280] mt-1.5">
                      Accepts Bunny embed links, YouTube or Vimeo URLs, or full &lt;iframe&gt; embed code.
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    {t('admin.videos.durationLabel')} *
                  </label>
                  <div className="relative w-40">
                    <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-[#6B7280]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="12:45"
                      pattern="^\d{1,3}:[0-5]\d$"
                      className="w-full min-h-[44px] pl-10 pr-3.5 rtl:pl-3.5 rtl:pr-10 py-2.5 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all force-ltr"
                    />
                  </div>
                </div>

                {/* Live Video Embed Preview */}
                {previewEmbedUrl && (
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                      Live Video Preview
                    </span>
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-md border border-neutral-200">
                      <iframe
                        src={previewEmbedUrl}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        title="Video preview"
                      />
                    </div>
                  </div>
                )}

                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    {t('admin.videos.thumbnailLabel')}
                  </label>
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleThumbSelect(e.target.files?.[0])}
                    className="hidden"
                    id="admin-thumb-file-input"
                  />

                  <div className="flex items-center gap-3">
                    {thumbPreviewUrl && (
                      <div className="w-24 h-16 rounded-xl bg-neutral-900 overflow-hidden flex-shrink-0 border border-neutral-200 relative">
                        <img
                          src={thumbPreviewUrl}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedThumbFile(null);
                            setThumbPreviewUrl(null);
                            if (thumbInputRef.current) thumbInputRef.current.value = '';
                          }}
                          className="absolute top-1 right-1 rtl:right-auto rtl:left-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                          aria-label="Remove thumbnail"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => thumbInputRef.current?.click()}
                      className="flex-1 min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-neutral-200 hover:border-neutral-400 bg-[#FAFAFA] hover:bg-neutral-50 text-xs font-medium text-[#111111] transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                      <span className="truncate">
                        {selectedThumbFile
                          ? selectedThumbFile.name
                          : thumbPreviewUrl
                            ? 'Change thumbnail image'
                            : 'Choose thumbnail image'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Upload Progress */}
                {uploadProgress !== null && (
                  <div className="space-y-2 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                    <div className="flex justify-between text-xs text-[#111111] font-semibold">
                      <span>{t('common.pleaseWait')}</span>
                      <span className="force-ltr">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                      <div
                        className="h-full bg-[#111111] transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Published / Draft Toggle & Free Preview Toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200/80 bg-[#FAFAFA]">
                    <div>
                      <span className="text-xs font-semibold text-[#111111] block">
                        {isPublished ? t('admin.videos.published') : t('admin.videos.draft')}
                      </span>
                      <span className="text-[11px] text-[#6B7280] block">
                        {isPublished ? 'Visible to members' : 'Hidden from members'}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPublished}
                      onClick={() => setIsPublished(!isPublished)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                        isPublished ? 'bg-[#111111]' : 'bg-neutral-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          isPublished ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200/80 bg-[#FAFAFA]">
                    <div>
                      <span className="text-xs font-semibold text-[#111111] flex items-center gap-1.5">
                        <span>Free Preview</span>
                        <span className="text-[10px] px-1.5 rounded bg-amber-50 text-[#B8860B] font-bold border border-amber-200">
                          Public
                        </span>
                      </span>
                      <span className="text-[11px] text-[#6B7280] block">
                        Playable before signup
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isFreePreview}
                      onClick={() => setIsFreePreview(!isFreePreview)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                        isFreePreview ? 'bg-[#B8860B]' : 'bg-neutral-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          isFreePreview ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sticky Bottom Form Footer */}
              <div
                className="sticky bottom-0 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-4 border-t border-neutral-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={submitting}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-neutral-200 text-sm md:text-xs font-semibold text-[#111111] hover:bg-neutral-50 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#111111] text-white text-sm md:text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-soft cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{t('common.pleaseWait')}</span>
                    </>
                  ) : (
                    <span>{isPublished ? t('admin.videos.publish') : t('common.save')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Video Confirmation */}
      <AdminConfirmDialog
        isOpen={Boolean(confirmDeleteVideo)}
        title={t('admin.videos.deleteConfirm')}
        description={
          confirmDeleteVideo
            ? `Permanently delete "${confirmDeleteVideo.title}"? This cannot be undone.`
            : ''
        }
        confirmLabel={t('admin.videos.delete')}
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteVideo(null)}
      />
    </div>
  );
};
