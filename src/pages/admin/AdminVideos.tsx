import React, { useState, useEffect, useRef } from 'react';
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
    // For embed videos, show video_url; for storage videos, show video_path
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
    setDetectedSource(video.video_source || detectSource(editUrl) || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (submitting) return;
    setIsFormOpen(false);
    setEditingVideo(null);
    setFormError(null);
    setUrlError(null);
  };

  /** Auto-clean iframe paste and validate URL as user types */
  const handleVideoUrlChange = (raw: string) => {
    // Auto-extract src from <iframe> paste
    const cleaned = extractSrcFromIframe(raw);
    setVideoUrl(cleaned);

    if (!cleaned.trim()) {
      setUrlError(null);
      setDetectedSource(null);
      return;
    }

    const result = parseVideoInput(cleaned);
    if (!result.success) {
      setUrlError(result.error);
      setDetectedSource(null);
    } else {
      setUrlError(null);
      setDetectedSource(result.source);
      // If the URL was converted (e.g. watch → embed), update the field
      if (result.url !== cleaned) {
        setVideoUrl(result.url);
      }
    }
  };

  const handleThumbSelect = (file: File | undefined) => {
    if (!file) return;
    setFormError(null);
    setSelectedThumbFile(file);
    const objectUrl = URL.createObjectURL(file);
    setThumbPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanTitle = title.trim();
    const cleanUrl = videoUrl.trim();
    const cleanDuration = duration.trim() || '00:00';

    if (!cleanTitle) {
      setFormError('Please enter a video title.');
      return;
    }

    if (!cleanUrl && !editingVideo?.video_path) {
      setFormError('Please enter a video embed URL.');
      return;
    }

    // Validate video URL
    if (cleanUrl) {
      const parsed = parseVideoInput(cleanUrl);
      if (!parsed.success) {
        setFormError(parsed.error);
        return;
      }
    }

    setSubmitting(true);
    setUploadProgress(15);

    try {
      // Determine video_url, video_source, and video_path
      let finalVideoUrl: string | null = null;
      let finalVideoSource: VideoSource = 'storage';
      let finalVideoPath = editingVideo?.video_path || '';

      if (cleanUrl) {
        const parsed = parseVideoInput(cleanUrl);
        if (parsed.success) {
          finalVideoUrl = parsed.url;
          finalVideoSource = parsed.source;
          finalVideoPath = parsed.url; // For embed videos, store the URL as path too for compat
        }
      }

      let finalThumbPath = thumbPreviewUrl ? editingVideo?.thumbnail_path || null : null;

      // 1. Upload Thumbnail File if chosen
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

      // 2. Save video record
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

      // Only remove from storage if it's a storage-uploaded video (not a URL)
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

  /** Source badge label */
  const sourceLabel = (src?: VideoSource | string) => {
    switch (src) {
      case 'bunny': return 'Bunny';
      case 'youtube': return 'YouTube';
      case 'vimeo': return 'Vimeo';
      default: return 'Storage';
    }
  };

  /** Source badge colors */
  const sourceBadge = (src?: VideoSource | string) => {
    switch (src) {
      case 'bunny': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'youtube': return 'bg-red-50 text-red-700 border-red-200';
      case 'vimeo': return 'bg-sky-50 text-sky-700 border-sky-200';
      default: return 'bg-neutral-100 text-[#6B7280] border-neutral-200';
    }
  };

  /** Preview embed URL for the form */
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
              Videos
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
          <span>Add new video</span>
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
            Retry
          </button>
        </div>
      )}

      {/* Mobile Loading Skeletons (< 768px) */}
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

      {/* Mobile Video Cards (< 768px) */}
      {!loading && !loadError && (
        <div className="md:hidden space-y-3.5">
          {videos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200/90 p-10 text-center text-[#6B7280] shadow-soft">
              <Film className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-[#111111]">No videos yet</p>
              <p className="text-xs text-[#6B7280] mt-1">
                Tap &ldquo;Add new video&rdquo; below to create your first lesson.
              </p>
            </div>
          ) : (
            videos.map((vid) => (
              <div
                key={vid.id}
                data-video-card={vid.id}
                className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-soft space-y-3"
              >
                {/* Thumbnail */}
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

                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-white bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-md">
                    <Clock className="w-3 h-3" />
                    {vid.duration || '00:00'}
                  </span>

                  {/* Source badge on thumbnail */}
                  {vid.video_source && vid.video_source !== 'storage' && (
                    <span className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sourceBadge(vid.video_source)}`}>
                      <Play className="w-2.5 h-2.5" />
                      {sourceLabel(vid.video_source)}
                    </span>
                  )}
                </div>

                {/* Title + Status & Date */}
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
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-neutral-100 text-[#6B7280]'
                      }`}
                    >
                      {vid.is_published ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Published</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Draft</span>
                        </>
                      )}
                    </button>

                    {vid.is_free_preview && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-[#B8860B] border border-amber-200">
                        <Sparkles className="w-3 h-3" />
                        <span>Preview</span>
                      </span>
                    )}

                    <span className="text-[#6B7280] ml-auto">
                      {formatDate(vid.created_at)}
                    </span>
                  </div>
                </div>

                {/* Edit & Delete Actions (>= 44px) */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditForm(vid)}
                    className="min-h-[44px] rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-[#111111] text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteVideo(vid)}
                    className="min-h-[44px] rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Mobile Sticky "Add new video" CTA above bottom navigation */}
      <div
        className="md:hidden fixed bottom-[calc(56px+env(safe-area-inset-bottom)+10px)] inset-x-4 z-30 pointer-events-none"
      >
        <button
          type="button"
          onClick={handleOpenAddForm}
          className="pointer-events-auto w-full min-h-[48px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold shadow-soft-lg transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add new video</span>
        </button>
      </div>

      {/* Desktop Videos Table (>= 768px) */}
      {!loadError && (
        <div className="hidden md:block bg-white rounded-2xl border border-neutral-200/90 shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#6B7280] flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#111111]" />
              <span className="text-xs">Loading videos...</span>
            </div>
          ) : videos.length === 0 ? (
            <div className="p-12 text-center text-[#6B7280]">
              <Film className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-[#111111]">No videos yet</p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Click &quot;Add new video&quot; to create your first lesson.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#FAFAFA] border-b border-neutral-200 text-[#6B7280] uppercase tracking-wider text-[11px] font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Video</th>
                    <th className="px-6 py-3.5">Source</th>
                    <th className="px-6 py-3.5">Duration</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {videos.map((vid) => (
                    <tr key={vid.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 rounded-lg bg-neutral-900 overflow-hidden flex-shrink-0 relative">
                            {vid.thumbnail_path ? (
                              <img
                                src={vid.thumbnail_path}
                                alt={vid.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                <Film className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-sm">
                            <h4 className="font-semibold text-[#111111] truncate">{vid.title}</h4>
                            <p className="text-xs text-[#6B7280] truncate">
                              {vid.description || 'No description provided.'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sourceBadge(vid.video_source)}`}>
                          {sourceLabel(vid.video_source)}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-[#111111] bg-neutral-100 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-[#6B7280]" />
                          {vid.duration || '00:00'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(vid)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                              vid.is_published
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-neutral-100 text-[#6B7280] hover:bg-neutral-200'
                            }`}
                          >
                            {vid.is_published ? (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>Published</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>Draft</span>
                              </>
                            )}
                          </button>

                          {vid.is_free_preview && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-[#B8860B] border border-amber-200">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Preview</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-[#6B7280] whitespace-nowrap text-xs">
                        {formatDate(vid.created_at)}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(vid)}
                            className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer"
                            title="Edit Video"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteVideo(vid)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                            title="Delete Video"
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

      {/* Full-Page (mobile) / Modal (desktop) Add / Edit Form */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 bg-white md:bg-black/60 md:backdrop-blur-xs md:flex md:items-center md:justify-center md:p-4 overflow-y-auto animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="min-h-full md:min-h-0 bg-white md:rounded-3xl md:border md:border-neutral-200 md:max-w-2xl w-full md:shadow-2xl flex flex-col">
            {/* Sticky Header */}
            <div
              className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-4 border-b border-neutral-100 flex items-center justify-between gap-3"
              style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
            >
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#111111] tracking-tight">
                  {editingVideo ? 'Edit Video' : 'Add New Video'}
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {editingVideo
                    ? 'Update lesson details, media, or status'
                    : 'Create a new video lesson for members'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                disabled={submitting}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-neutral-500 hover:text-[#111111] hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
              <div className="flex-1 p-4 sm:p-8 space-y-5">
                {formError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="leading-relaxed font-medium">{formError}</div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Understanding Confidence"
                    className="w-full min-h-[44px] px-4 py-2.5 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Summarize this lesson's key ideas and takeaways..."
                    className="w-full p-4 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all leading-relaxed"
                  />
                </div>

                {/* Video URL (Bunny embed link) & Duration */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                      Video URL (Bunny embed link)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={videoUrl}
                        onChange={(e) => handleVideoUrlChange(e.target.value)}
                        placeholder="https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID"
                        className={`w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-[#FAFAFA] border rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                          urlError
                            ? 'border-rose-300 focus:ring-rose-500'
                            : detectedSource
                              ? 'border-emerald-300 focus:ring-emerald-500'
                              : 'border-neutral-200 focus:ring-[#111111]'
                        }`}
                      />
                    </div>

                    {/* URL validation feedback */}
                    {urlError && (
                      <p className="mt-1.5 text-xs text-rose-600 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{urlError}</span>
                      </p>
                    )}
                    {!urlError && detectedSource && (
                      <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sourceBadge(detectedSource)}`}>
                          {sourceLabel(detectedSource)}
                        </span>
                        <span className="text-[#6B7280]">embed link detected</span>
                      </p>
                    )}
                    {!urlError && !detectedSource && videoUrl.trim() === '' && (
                      <p className="mt-1.5 text-[11px] text-[#6B7280]">
                        Accepts Bunny Stream, YouTube, and Vimeo links. Paste an &lt;iframe&gt; code and the URL will be extracted automatically.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                      Duration (mm:ss)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                        <Clock className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="08:30"
                        className="w-full min-h-[44px] pl-10 pr-4 py-2.5 font-mono bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Video Preview */}
                {previewEmbedUrl && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                      Video Preview
                    </label>
                    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-neutral-200 shadow-soft">
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

                {/* Direct Video File Upload (Kept for fallback/reference but hidden since videos use Bunny Stream) */}
                <div className="hidden" aria-hidden="true">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    Direct Video Upload (Legacy 50MB max)
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    id="admin-legacy-video-file-input"
                  />
                </div>

                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    Thumbnail Upload
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
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
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
                      <span>Saving...</span>
                      <span>{uploadProgress}%</span>
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
                        {isPublished ? 'Published' : 'Draft'}
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

              {/* Sticky Bottom Form Footer: Publish & Cancel */}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#111111] text-white text-sm md:text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-soft cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{isPublished ? 'Publish' : 'Save Draft'}</span>
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
        title="Delete this video?"
        description={
          confirmDeleteVideo
            ? `Permanently delete "${confirmDeleteVideo.title}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteVideo(null)}
      />
    </div>
  );
};
