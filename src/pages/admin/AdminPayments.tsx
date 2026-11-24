import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  RefreshCw,
  CreditCard,
  AlertCircle,
  ZoomIn,
} from 'lucide-react';

interface AdminPaymentsProps {
  onRefresh?: () => void;
}

export const AdminPayments: React.FC<AdminPaymentsProps> = ({ onRefresh }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedReceipt, setSelectedReceipt] = useState<{
    url: string;
    userName?: string;
    refCode?: string;
  } | null>(null);

  // Confirm Approve Modal & Reject Bottom Sheet state
  const [confirmApprovePayment, setConfirmApprovePayment] = useState<Payment | null>(null);
  const [rejectModalPayment, setRejectModalPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Pull-to-refresh touch tracking on mobile
  const [pullOffset, setPullOffset] = useState(0);
  const touchStartYRef = useRef<number | null>(null);

  const { success, error } = useToast();

  const loadPayments = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error: payError } = await supabase
        .from('payments')
        .select('*, profile:profiles(*)')
        .order('created_at', { ascending: false });

      if (payError) {
        console.error('[AdminPayments] Error fetching payments:', payError);
        setLoadError('Could not load payment requests.');
        error('Could not load payment requests.');
      } else if (data) {
        const list = data as Payment[];
        setPayments(list);

        // Pre-resolve receipt thumbnails in the background for mobile cards
        const entries = await Promise.all(
          list
            .filter((p) => Boolean(p.screenshot_path))
            .map(async (p) => {
              try {
                const url = await resolveReceiptUrl(p.screenshot_path);
                return [p.id, url] as const;
              } catch {
                return null;
              }
            })
        );
        const resolvedMap: Record<string, string> = {};
        for (const item of entries) {
          if (item) resolvedMap[item[0]] = item[1];
        }
        setThumbUrls(resolvedMap);
      }
    } catch (err: any) {
      console.error('[AdminPayments] Unexpected error:', err);
      setLoadError('Failed to fetch payments. Please try again.');
      error('Failed to fetch payments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 2 && e.touches.length === 1) {
      touchStartYRef.current = e.touches[0].clientY;
    } else {
      touchStartYRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null || e.touches.length !== 1) return;
    const delta = e.touches[0].clientY - touchStartYRef.current;
    if (delta > 0 && window.scrollY <= 2) {
      setPullOffset(Math.min(72, delta * 0.45));
    }
  };

  const handleTouchEnd = () => {
    if (pullOffset >= 52 && !loading) {
      loadPayments();
    }
    touchStartYRef.current = null;
    setPullOffset(0);
  };

  const handleViewReceipt = async (pay: Payment) => {
    try {
      const resolvedUrl = thumbUrls[pay.id] || (await resolveReceiptUrl(pay.screenshot_path));
      setSelectedReceipt({
        url: resolvedUrl,
        userName: pay.profile?.full_name || pay.profile?.email,
        refCode: pay.profile?.reference_code,
      });
    } catch (err: any) {
      console.error('[AdminPayments] Receipt open error:', err);
      error(err.message || 'Failed to open receipt.');
    }
  };

  const handleConfirmApprove = async () => {
    if (!confirmApprovePayment) return;
    const target = confirmApprovePayment;
    setActionLoading(target.id);
    try {
      await approvePaymentRequest(target);
      success(
        `Payment approved for ${target.profile?.full_name || target.profile?.email || 'Member'}. Access granted!`
      );
      setConfirmApprovePayment(null);
      await loadPayments();
      onRefresh?.();
    } catch (err: any) {
      console.error('[AdminPayments] Approve error:', err);
      error(err.message || 'Failed to approve payment.');
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
      await loadPayments();
      onRefresh?.();
    } catch (err: any) {
      console.error('[AdminPayments] Reject error:', err);
      error(err.message || 'Failed to reject payment.');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const approvedCount = payments.filter((p) => p.status === 'approved').length;
  const rejectedCount = payments.filter((p) => p.status === 'rejected').length;

  const counts = {
    pending: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
    all: payments.length,
  };

  const filteredPayments = payments.filter((p) => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  const emptyMessage =
    statusFilter === 'pending'
      ? 'No pending payments'
      : statusFilter === 'approved'
        ? 'No approved payments'
        : statusFilter === 'rejected'
          ? 'No rejected payments'
          : 'No payment requests';

  const statusBadge = (status: Payment['status']) => (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
        status === 'approved'
          ? 'bg-emerald-50 text-emerald-700'
          : status === 'rejected'
            ? 'bg-rose-50 text-rose-700'
            : 'bg-amber-50 text-amber-800'
      }`}
    >
      {status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
      {status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
      <span>{status}</span>
    </span>
  );

  return (
    <div
      className="space-y-5 md:space-y-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh mobile indicator */}
      {pullOffset > 12 && (
        <div className="md:hidden flex items-center justify-center py-1 text-xs font-medium text-[#6B7280]">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${pullOffset >= 52 ? 'text-[#111111]' : ''}`} />
          <span>{pullOffset >= 52 ? 'Release to refresh' : 'Pull down to refresh'}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="hidden md:flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
                Payments
              </h1>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  {pendingCount} Pending
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#6B7280] md:mt-1">
              Verify bank transfer receipts, check reference codes, and grant access
            </p>
          </div>

          {/* Mobile Refresh Button */}
          <button
            type="button"
            onClick={loadPayments}
            className="md:hidden min-w-[44px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-[#111111] shadow-2xs flex-shrink-0 cursor-pointer"
            aria-label="Refresh payments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Desktop Filter Pills */}
        <div className="hidden md:flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl self-start md:self-center">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-[#111111] shadow-xs'
                  : 'text-[#6B7280] hover:text-[#111111]'
              }`}
            >
              {st} ({counts[st]})
            </button>
          ))}
          <button
            type="button"
            onClick={loadPayments}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111111] transition-colors ml-1 cursor-pointer"
            title="Refresh payments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Filter Tabs with Counters (Pending / Approved / Rejected) */}
      <div className="md:hidden grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-2xl">
        {(['pending', 'approved', 'rejected'] as const).map((st) => {
          const active = statusFilter === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold capitalize flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                active
                  ? 'bg-white text-[#111111] shadow-xs'
                  : 'text-[#6B7280] hover:text-[#111111]'
              }`}
            >
              <span>{st}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                  active ? 'bg-[#111111] text-white' : 'bg-neutral-200/80 text-[#6B7280]'
                }`}
              >
                {counts[st]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error State */}
      {loadError && !loading && (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3 shadow-soft">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
          <p className="text-sm font-semibold text-[#111111]">{loadError}</p>
          <button
            type="button"
            onClick={loadPayments}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton (Mobile) */}
      {loading && (
        <div className="md:hidden space-y-3">
          {[1, 2, 3].map((sk) => (
            <div
              key={sk}
              className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-soft space-y-3 animate-pulse"
            >
              <div className="flex justify-between">
                <div className="w-32 h-4 rounded bg-neutral-200" />
                <div className="w-16 h-5 rounded-full bg-neutral-100" />
              </div>
              <div className="w-48 h-3 rounded bg-neutral-100" />
              <div className="w-full h-24 rounded-xl bg-neutral-100" />
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-11 rounded-xl bg-neutral-200" />
                <div className="h-11 rounded-xl bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile Cards (< 768px) */}
      {!loading && !loadError && (
        <div className="md:hidden space-y-3.5">
          {filteredPayments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200/90 p-10 text-center text-[#6B7280] shadow-soft">
              <CreditCard className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-[#111111]">{emptyMessage}</p>
              <p className="text-xs text-[#6B7280] mt-1">
                New submissions will appear here automatically.
              </p>
            </div>
          ) : (
            filteredPayments.map((pay) => {
              const previewSrc = thumbUrls[pay.id];
              return (
                <div
                  key={pay.id}
                  data-payment-card={pay.id}
                  className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-soft space-y-3.5"
                >
                  {/* Top Row: Name + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-[#111111] break-words">
                        {pay.profile?.full_name || 'Member'}
                      </h3>
                      <p className="text-xs text-[#6B7280] break-all mt-0.5">
                        {pay.profile?.email || 'N/A'}
                      </p>
                    </div>
                    <div className="flex-shrink-0">{statusBadge(pay.status)}</div>
                  </div>

                  {/* Metadata Details */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#FAFAFA] border border-neutral-100 text-xs">
                    <div>
                      <span className="text-[#6B7280] block">Amount</span>
                      <span className="font-bold text-[#111111] text-sm">
                        {formatCurrency(pay.amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">Date</span>
                      <span className="font-medium text-[#111111]">
                        {formatDate(pay.created_at)}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-neutral-200/60 flex items-center justify-between gap-2">
                      <span className="text-[#6B7280]">Reference code</span>
                      <span className="font-mono font-semibold text-[#111111] bg-white px-2 py-0.5 rounded border border-neutral-200">
                        {pay.profile?.reference_code || 'No code'}
                      </span>
                    </div>
                  </div>

                  {/* Screenshot Thumbnail */}
                  <button
                    type="button"
                    onClick={() => handleViewReceipt(pay)}
                    className="w-full min-h-[44px] relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 group text-left cursor-pointer"
                    aria-label="View payment screenshot"
                  >
                    {previewSrc ? (
                      <div className="relative h-36 w-full bg-neutral-900">
                        <img
                          src={previewSrc}
                          alt="Payment screenshot thumbnail"
                          className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-black/75 to-transparent flex items-center justify-between text-white text-xs font-medium">
                          <span>Tap to zoom receipt</span>
                          <ZoomIn className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#111111]">
                        <span className="inline-flex items-center gap-2">
                          <Eye className="w-4 h-4 text-[#6B7280]" />
                          <span>View payment screenshot</span>
                        </span>
                        <ZoomIn className="w-4 h-4 text-[#6B7280]" />
                      </div>
                    )}
                  </button>

                  {pay.status === 'rejected' && pay.rejection_reason && (
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-800">
                      Reason: {pay.rejection_reason}
                    </div>
                  )}

                  {/* Full-width Approve / Reject buttons */}
                  {pay.status === 'pending' && (
                    <div className="grid grid-cols-1 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setConfirmApprovePayment(pay)}
                        disabled={actionLoading === pay.id}
                        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {actionLoading === pay.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalPayment(pay);
                          setRejectReason('');
                        }}
                        disabled={actionLoading === pay.id}
                        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-[#111111] text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Desktop Payments Table (>= 768px) */}
      {!loadError && (
        <div className="hidden md:block bg-white rounded-2xl border border-neutral-200/90 shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#6B7280] flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#111111]" />
              <span className="text-xs">Loading payments...</span>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-[#6B7280]">
              <CreditCard className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-[#111111]">{emptyMessage}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                New submissions will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#FAFAFA] border-b border-neutral-200 text-[#6B7280] uppercase tracking-wider text-[11px] font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-center">Receipt</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#111111]">
                        <div>{pay.profile?.full_name || 'Member'}</div>
                        <div className="font-mono text-[11px] text-[#6B7280] mt-0.5">
                          {pay.profile?.reference_code || 'No code'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-[#6B7280]">
                        {pay.profile?.email || 'N/A'}
                      </td>

                      <td className="px-6 py-4 font-semibold text-[#111111]">
                        {formatCurrency(pay.amount)}
                      </td>

                      <td className="px-6 py-4 text-[#6B7280] whitespace-nowrap">
                        {formatDate(pay.created_at)}
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

                      <td className="px-6 py-4 text-right">
                        {pay.status === 'pending' ? (
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
                              <span>Approve</span>
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
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          statusBadge(pay.status)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Full-Screen Pinch-to-Zoom Screenshot Modal */}
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
        title="Approve this payment?"
        description={
          confirmApprovePayment
            ? `Grant full membership access to ${
                confirmApprovePayment.profile?.full_name ||
                confirmApprovePayment.profile?.email ||
                'this member'
              } (${confirmApprovePayment.profile?.reference_code || 'No code'})?`
            : ''
        }
        confirmLabel="Confirm"
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
