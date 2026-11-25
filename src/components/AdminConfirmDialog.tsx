import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';

interface AdminConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'dark' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Mobile bottom-sheet / desktop centered confirmation dialog with 44px+ touch targets.
 */
export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'dark',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs md:p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!loading) onCancel();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl border border-neutral-200 p-5 sm:p-6 shadow-2xl space-y-4"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle indicator on mobile */}
        <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto md:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base sm:text-lg font-bold text-[#111111]">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 rtl:-mr-0 rtl:-ml-2 flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close confirmation dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#6B7280] leading-relaxed">{description}</p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-[#111111] hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#111111] hover:bg-neutral-800'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
