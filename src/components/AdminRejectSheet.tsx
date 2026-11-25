import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import type { Payment } from '../types';

interface AdminRejectSheetProps {
  payment: Payment | null;
  reason: string;
  onReasonChange: (value: string) => void;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const PRESET_REASONS = [
  'Reference code missing on receipt',
  'Payment amount does not match price',
  'Screenshot unreadable or cut off',
  'Transfer not received in bank account',
];

export const AdminRejectSheet: React.FC<AdminRejectSheetProps> = ({
  payment,
  reason,
  onReasonChange,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  if (!payment) return null;

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
        className="bg-white rounded-t-3xl md:rounded-3xl border border-neutral-200 md:max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto md:hidden" aria-hidden="true" />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-rose-600 min-w-0">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h3 className="text-base font-bold text-[#111111] truncate">
              {t('admin.payments.reject')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-w-[44px] min-h-[44px] -mr-2 rtl:-mr-0 rtl:-ml-2 flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close rejection sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm md:text-xs text-[#6B7280] leading-relaxed">
          Rejecting payment for{' '}
          <span className="font-semibold text-[#111111] force-ltr">
            {payment.profile?.full_name || payment.profile?.email || 'Member'}
          </span>
          . Optional reason:
        </p>

        <div className="flex flex-wrap gap-2">
          {PRESET_REASONS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onReasonChange(chip)}
              className="min-h-[36px] text-xs px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-[#111111] transition-colors text-left rtl:text-right cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Optional reason for rejection..."
          className="w-full p-3.5 rounded-xl border border-neutral-200 bg-[#FAFAFA] focus:bg-white text-[16px] md:text-sm text-[#111111] focus:ring-2 focus:ring-[#111111] focus:outline-none"
        />

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-neutral-200 text-sm md:text-xs font-semibold text-[#111111] hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm md:text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{t('common.confirm')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
