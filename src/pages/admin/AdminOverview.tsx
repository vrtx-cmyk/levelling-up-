import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatCurrency } from '../../lib/utils';
import { ScreenshotModal } from '../../components/ScreenshotModal';
import { AdminConfirmDialog } from '../../components/AdminConfirmDialog';
import { AdminRejectSheet } from '../../components/AdminRejectSheet';
import {
  resolveReceiptUrl,
  approvePaymentRequest,
  rejectPaymentRequest,
} from '../../lib/adminPayments';
import type { Payment } from '../../types';
import {
  CreditCard,
  Film,
  Users as UsersIcon,
  ArrowRight,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [videosCount, setVideosCount] = useState<number>(0);
  const [latestPayments, setLatestPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [selectedReceipt, setSelectedReceipt] = useState<{
    url: string;
    userName?: string;
    refCode?: string;
  } | null>(null);

  const [confirmApprovePayment, setConfirmApprovePayment] = useState<Payment | null>(null);
  const [rejectModalPayment, setRejectModalPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const { success, error } = useToast();

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes, videosRes, latestRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved'),
        supabase
          .from('videos')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('payments')
          .select('*, profile:profiles(*)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (pendingRes.count !== null) setPendingCount(pendingRes.count);
      if (approvedRes.count !== null) setApprovedCount(approvedRes.count);
      if (videosRes.count !== null) setVideosCount(videosRes.count);

      if (latestRes.data) {
        setLatestPayments(latestRes.data as Payment[]);
      }
    } catch (err: any) {
      console.error('[AdminOverview] Error loading overview data:', err);
      error(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverviewData();
  }, []);

  const handleViewReceipt = async (pay: Payment) => {
    try {
      const resolvedUrl = await resolveReceiptUrl(pay.screenshot_path);
      setSelectedReceipt({
        url: resolvedUrl,
        userName: pay.profile?.full_name || pay.profile?.email,
        refCode: pay.profile?.reference_code,
      });
    } catch (err: any) {
      error(err.message || t('common.error'));
    }
  };

  const handleConfirmApprove = async () => {
    if (!confirmApprovePayment) return;
    const target = confirmApprovePayment;
    setActionLoading(target.id);
    try {
      await approvePaymentRequest(target);
      success(
        `Payment approved for ${target.profile?.full_name || target.profile?.email || 'User'}. Access granted!`
      );
      setConfirmApprovePayment(null);
      await loadOverviewData();
    } catch (err: any) {
      console.error('[AdminOverview] Approve error:', err);
      error(err.message || t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalPayment) return;
    const target = rejectModalPayment;
    setActionLoading(target.id);
    try {
      await rejectPaymentRequest(target, rejectReason);
      success('Payment rejected.');
      setRejectModalPayment(null);
      setRejectReason('');
      await loadOverviewData();
    } catch (err: any) {
      console.error('[AdminOverview] Reject error:', err);
      error(err.message || t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="hidden md:block text-2xl font-bold tracking-tight text-[#111111]">
            {t('admin.overview.title')}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] md:mt-1">
            Platform statistics and latest pending actions
          </p>
        </div>

        <button
          type="button"
          onClick={loadOverviewData}
          className="self-start sm:self-center min-h-[44px] md:min-h-0 inline-flex items-center gap-2 px-4 py-2 md:px-3 md:py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-[#111111] hover:bg-neutral-50 shadow-soft transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('common.retry')}</span>
        </button>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/payments"
          className="group bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-soft hover:border-neutral-300 transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              {t('admin.overview.pendingPayments')}
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-[#111111] mt-1 force-ltr">
              {pendingCount}
            </div>
            <span className="text-[11px] text-amber-700 font-medium">
              {pendingCount > 0 ? t('nav.status.pending') : t('admin.payments.noPending')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <CreditCard className="w-6 h-6" />
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="group bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-soft hover:border-neutral-300 transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              {t('admin.overview.approvedMembers')}
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-[#111111] mt-1 force-ltr">
              {approvedCount}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              {t('nav.status.member')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <UsersIcon className="w-6 h-6" />
          </div>
        </Link>

        <Link
          to="/admin/videos"
          className="group bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-soft hover:border-neutral-300 transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              {t('admin.overview.totalVideos')}
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-[#111111] mt-1 force-ltr">
              {videosCount}
            </div>
            <span className="text-[11px] text-[#6B7280] font-medium">{t('videos.libraryTitle')}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-neutral-100 text-[#111111] flex items-center justify-center group-hover:scale-105 transition-transform">
            <Film className="w-6 h-6" />
          </div>
        </Link>
      </div>

      {/* Latest Pending Requests */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-soft overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-neutral-100 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#111111] tracking-tight">
              {t('admin.payments.title')}
            </h2>
            <p className="text-xs text-[#6B7280]">
              {t('payment.pending.title')}
            </p>
          </div>
          <Link
            to="/admin/payments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] hover:text-neutral-700 transition-colors flex-shrink-0"
          >
            <span>{t('landing.lessons.watchAll')}</span>
            <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#6B7280] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#111111]" />
            <span className="text-xs">{t('common.loading')}</span>
          </div>
        ) : latestPayments.length === 0 ? (
          <div className="p-12 text-center text-[#6B7280]">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-[#111111]">{t('admin.payments.noPending')}</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-neutral-100">
              {latestPayments.map((pay) => (
                <div key={pay.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-[#111111] break-words">
                        {pay.profile?.full_name || 'Member'}
                      </div>
                      <div className="text-xs text-[#6B7280] break-all force-ltr">
                        {pay.profile?.email || 'N/A'}
                      </div>
                    </div>
                    <span className="font-bold text-sm text-[#111111] flex-shrink-0 force-ltr">
                      {formatCurrency(pay.amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#6B7280]">
                    <span className="font-mono text-[#111111] bg-neutral-100 px-2 py-0.5 rounded force-ltr">
                      {pay.profile?.reference_code || 'No code'}
                    </span>
                    <span className="force-ltr">{formatDate(pay.created_at, i18n.language)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleViewReceipt(pay)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-200 bg-[#FAFAFA] text-xs font-semibold text-[#111111] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-[#6B7280]" />
                    <span>{t('admin.payments.viewScreenshot')}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmApprovePayment(pay)}
                      disabled={actionLoading === pay.id}
                      className="min-h-[44px] rounded-xl bg-[#111111] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('admin.payments.approve')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalPayment(pay);
                        setRejectReason('');
                      }}
                      disabled={actionLoading === pay.id}
                      className="min-h-[44px] rounded-xl border border-neutral-300 bg-white text-[#111111] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>{t('admin.payments.reject')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs sm:text-sm">
                <thead className="bg-[#FAFAFA] border-b border-neutral-200 text-[#6B7280] uppercase tracking-wider text-[11px] font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">{t('admin.videos.titleLabel')}</th>
                    <th className="px-6 py-3.5">{t('auth.emailLabel')}</th>
                    <th className="px-6 py-3.5">{t('admin.payments.amount')}</th>
                    <th className="px-6 py-3.5">{t('admin.payments.date')}</th>
                    <th className="px-6 py-3.5 text-center">{t('admin.payments.viewScreenshot')}</th>
                    <th className="px-6 py-3.5 text-right rtl:text-left">{t('common.confirm')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {latestPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#111111]">
                        <div>{pay.profile?.full_name || 'Member'}</div>
                        <div className="font-mono text-[11px] text-[#6B7280] mt-0.5 force-ltr">
                          {pay.profile?.reference_code || 'No code'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#6B7280] force-ltr">{pay.profile?.email || 'N/A'}</td>
                      <td className="px-6 py-4 font-semibold text-[#111111] force-ltr">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="px-6 py-4 text-[#6B7280] whitespace-nowrap force-ltr">
                        {formatDate(pay.created_at, i18n.language)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(pay)}
                          className="inline-flex items-center gap-1.5 p-1.5 rounded-lg border border-neutral-200 hover:border-neutral-400 bg-white transition-all group cursor-pointer"
                          title="View Full Resolution Receipt"
                        >
                          <div className="w-8 h-8 rounded bg-neutral-100 overflow-hidden flex items-center justify-center text-[#111111]">
                            <Eye className="w-4 h-4 text-[#6B7280] group-hover:text-[#111111] transition-colors" />
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right rtl:text-left">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmApprovePayment(pay)}
                            disabled={actionLoading === pay.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {actionLoading === pay.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>{t('admin.payments.approve')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalPayment(pay);
                              setRejectReason('');
                            }}
                            disabled={actionLoading === pay.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{t('admin.payments.reject')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Screenshot Modal */}
      {selectedReceipt && (
        <ScreenshotModal
          isOpen={true}
          imageUrl={selectedReceipt.url}
          userName={selectedReceipt.userName}
          referenceCode={selectedReceipt.refCode}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Approve Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={Boolean(confirmApprovePayment)}
        title={t('admin.payments.approveConfirm')}
        description={
          confirmApprovePayment
            ? `Grant full membership access to ${
                confirmApprovePayment.profile?.full_name ||
                confirmApprovePayment.profile?.email ||
                'this member'
              }?`
            : ''
        }
        confirmLabel={t('common.confirm')}
        variant="dark"
        loading={Boolean(confirmApprovePayment && actionLoading === confirmApprovePayment.id)}
        onConfirm={handleConfirmApprove}
        onCancel={() => setConfirmApprovePayment(null)}
      />

      {/* Reject Bottom Sheet / Modal */}
      <AdminRejectSheet
        payment={rejectModalPayment}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        loading={Boolean(rejectModalPayment && actionLoading === rejectModalPayment.id)}
        onConfirm={handleConfirmReject}
        onCancel={() => setRejectModalPayment(null)}
      />
    </div>
  );
};
