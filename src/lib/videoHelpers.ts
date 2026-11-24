/**
 * Video URL helpers for Bunny Stream, YouTube, and Vimeo embed support.
 */
import type { VideoSource } from '../types';

export type ParsedVideoResult =
  | { success: true; url: string; source: VideoSource; error?: undefined }
  | { success: false; error: string; url?: undefined; source?: undefined };

export type ParsedVideoUrl = { url: string; source: VideoSource };
export type VideoUrlError = { error: string };

const INVALID_LINK_ERROR = 'This is not a valid embed link. Copy the Embed URL from Bunny.';

/**
 * Extract the `src` from an <iframe ...> snippet if the user pasted raw embed code.
 */
export function extractSrcFromIframe(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const match = trimmed.match(/<iframe[^>]*\s+src=["']([^"']+)["']/i) || trimmed.match(/src=["']([^"']+)["']/i);
  return match ? match[1].trim() : trimmed;
}

/**
 * Convert a regular YouTube/Vimeo watch URL to the embed variant.
 */
function toEmbedUrl(url: string): string {
  const trimmed = url.trim();

  // YouTube: https://www.youtube.com/watch?v=VIDEO_ID or https://m.youtube.com/watch?v=VIDEO_ID
  const ytWatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/i
  );
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;

  // YouTube short: https://youtu.be/VIDEO_ID
  const ytShort = trimmed.match(
    /(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]+)/i
  );
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;

  // YouTube already embed: https://www.youtube.com/embed/VIDEO_ID
  const ytEmbed = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]+)/i
  );
  if (ytEmbed) return `https://www.youtube.com/embed/${ytEmbed[1]}`;

  // Vimeo: https://vimeo.com/VIDEO_ID
  const vimeoWatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i
  );
  if (vimeoWatch) return `https://player.vimeo.com/video/${vimeoWatch[1]}`;

  // Vimeo already embed: https://player.vimeo.com/video/VIDEO_ID
  const vimeoEmbed = trimmed.match(
    /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/i
  );
  if (vimeoEmbed) return `https://player.vimeo.com/video/${vimeoEmbed[1]}`;

  return trimmed;
}

/**
 * Detect which video source a URL belongs to.
 */
export function detectSource(url: string): VideoSource | null {
  const trimmed = url.trim();
  if (trimmed.startsWith('https://iframe.mediadelivery.net/embed/')) return 'bunny';
  if (trimmed.startsWith('https://www.youtube.com/embed/') || trimmed.startsWith('https://youtube.com/embed/')) return 'youtube';
  if (trimmed.startsWith('https://player.vimeo.com/video/')) return 'vimeo';
  return null;
}

/**
 * Ensure Bunny embed URLs include &responsive=true
 */
export function ensureResponsive(url: string): string {
  if (!url.includes('iframe.mediadelivery.net')) return url;
  if (url.includes('responsive=true')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}responsive=true`;
}

/**
 * Parse and validate a user-provided video URL/embed string.
 * Accepts:
 * - https://iframe.mediadelivery.net/embed/...
 * - YouTube links (converted to embed URL)
 * - Vimeo links (converted to embed URL)
 *
 * Shows clear error if invalid: "This is not a valid embed link. Copy the Embed URL from Bunny."
 */
export function parseVideoInput(raw: string): ParsedVideoResult {
  if (!raw.trim()) {
    return { success: false, error: 'Please enter a video URL.' };
  }

  // 1. Auto-clean: extract src from <iframe> if pasted
  const cleaned = extractSrcFromIframe(raw);

  // 2. Convert watch/share URLs to embed format
  const embedUrl = toEmbedUrl(cleaned);

  // 3. Detect and validate source
  const source = detectSource(embedUrl);

  if (!source) {
    return { success: false, error: INVALID_LINK_ERROR };
  }

  // If Bunny, ensure &responsive=true
  const finalUrl = source === 'bunny' ? ensureResponsive(embedUrl) : embedUrl;

  return { success: true, url: finalUrl, source };
}

/**
 * Returns true if the video should be rendered as an iframe embed
 * (Bunny, YouTube, or Vimeo) rather than a native <video> element.
 */
export function isEmbedVideo(video: {
  video_url?: string | null;
  video_source?: string;
  video_path?: string;
}): boolean {
  if (video.video_url && video.video_source && video.video_source !== 'storage') return true;
  if (video.video_url) {
    const src = detectSource(video.video_url);
    if (src !== null) return true;
  }
  if (video.video_path) {
    const src = detectSource(video.video_path);
    if (src !== null) return true;
  }
  return false;
}
