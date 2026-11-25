import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ScreenshotModalProps {
  isOpen?: boolean;
  onClose: () => void;
  imageUrl: string | null;
  userName?: string;
  referenceCode?: string;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  isOpen = true,
  onClose,
  imageUrl,
  userName,
  referenceCode,
}) => {
  const { t } = useTranslation();
  const [scale, setScale] = useState(1);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  useEffect(() => {
    setScale(1);
  }, [imageUrl, isOpen]);

  if (!isOpen || !imageUrl) return null;

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStartDistRef.current = getTouchDistance(e.touches);
      pinchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dist = getTouchDistance(e.touches);
      const nextScale = Math.min(4, Math.max(1, pinchStartScaleRef.current * (dist / pinchStartDistRef.current)));
      setScale(Number(nextScale.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  const handleDoubleTapToggle = () => {
    setScale((prev) => (prev > 1.2 ? 1 : 2));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 md:bg-black/70 backdrop-blur-sm md:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full h-full md:h-auto md:max-w-3xl md:max-h-[90vh] bg-white md:rounded-3xl overflow-hidden shadow-2xl md:border md:border-neutral-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-6 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-2 bg-white flex-shrink-0"
          style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}
        >
          <div className="min-w-0">
            <h3 className="font-semibold text-[#111111] text-sm truncate">
              {t('admin.payments.viewScreenshot')}
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5 truncate force-ltr">
              {userName || 'Submitted payment receipt'}
              {referenceCode ? ` • ${referenceCode}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(1, Number((s - 0.5).toFixed(2))))}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#6B7280] hover:text-[#111111] hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(4, Number((s + 0.5).toFixed(2))))}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#6B7280] hover:text-[#111111] hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {scale > 1 && (
              <button
                type="button"
                onClick={() => setScale(1)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#6B7280] hover:text-[#111111] hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                aria-label="Reset zoom"
                title="Reset zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex min-w-[44px] min-h-[44px] items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors"
              title="Open full size in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#111111] bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              aria-label="Close receipt viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Container with Pinch-to-Zoom & Pan */}
        <div
          className="flex-1 overflow-auto p-3 sm:p-4 flex items-center justify-center bg-neutral-950 touch-pinch-zoom min-h-[280px]"
          style={{ touchAction: 'pinch-zoom pan-x pan-y' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleTapToggle}
        >
          <img
            src={imageUrl}
            alt="Payment Receipt"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
            className="max-h-[75vh] md:max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-md transition-transform duration-150 select-none"
          />
        </div>

        {/* Footer */}
        <div
          className="px-4 sm:px-6 py-3 border-t border-neutral-100 bg-white flex items-center justify-between gap-3 text-xs text-[#6B7280] flex-shrink-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <span className="truncate force-ltr">
            Pinch to zoom ({Math.round(scale * 100)}%)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] md:min-h-0 px-5 py-2 rounded-xl bg-[#111111] text-white font-semibold hover:bg-neutral-800 transition-colors flex-shrink-0 cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
