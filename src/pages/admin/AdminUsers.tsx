import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatCurrency } from '../../lib/utils';
import { AdminConfirmDialog } from '../../components/AdminConfirmDialog';
import { AdminRejectSheet } from '../../components/AdminRejectSheet';
import { ScreenshotModal } from '../../components/ScreenshotModal';
import {
  resolveReceiptUrl,
  approvePaymentRequest,
  rejectPaymentRequest,
} from '../../lib/adminPayments';
import type { Profile, Payment } from '../../types';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Users as UsersIcon,
  CreditCard,
  Eye,
  X,
  Building2,
  Calendar,
  KeyRound,
  ChevronRight,
  ZoomIn,
} from 'lucide-react';

type UserFilter = 'all' | 'pending_payment' | 'approved' | 'none';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [paymentsByUser, setPaymentsByUser] = useState<Record<string, Payment[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Revoke modal
  const [confirmRevokeUser, setConfirmRevokeUser] = useState<Profile | null>(null);

  // Side Panel state for user's payment details
  const [selectedUserForPayment, setSelectedUserForPayment] = useState<Profile | null>(null);
  const [paymentReceiptUrls, setPaymentReceiptUrls] = useState<Record<string, string>>({});
  const [loadingReceiptUrl, setLoadingReceiptUrl] = useState<string | null>(null);

  // Approve & Reject state inside Payment Panel
  const [confirmApprovePayment, setConfirmApprovePayment] = useState<Payment | null>(null);
  const [rejectModalPayment, setRejectModalPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Full-screen zoomable screenshot viewer
  const [zoomReceipt, setZoomReceipt] = useState<{
    url: string;
    userName?: string;
    refCode?: string;
  } | null>(null);

  const { success, error } = useToast();

  const loadUsersAndPayments = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // 1. Fetch profiles
      const { data: profs, error: uErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (uErr) {
        console.error('[AdminUsers] Error fetching users:', uErr);
        throw uErr;
      }

      // 2. Fetch payments joined with bank_accounts
      const { data: pays, error: pErr } = await supabase
        .from('payments')
        .select('*, bank_account:bank_accounts(*)')
        .order('created_at', { ascending: false });

      if (pErr) {
        console.warn('[AdminUsers] Error fetching payments:', pErr);
      }

      if (profs) {
        setUsers(profs as Profile[]);
      }

      // Group payments by user_id
      const map: Record<string, Payment[]> = {};
      if (pays) {
        for (const p of pays as Payment[]) {
          if (!map[p.user_id]) map[p.user_id] = [];
          map[p.user_id].push(p);
        }
      }
      setPaymentsByUser(map);
    } catch (err: any) {
      console.error('[AdminUsers] Unexpected error:', err);
      setLoadError('Failed to fetch users. Please try again.');
      error('Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndPayments();
  }, []);

  // Resolve receipt URL when opening payment panel
  const handleOpenPaymentPanel = async (user: Profile) => {
    setSelectedUserForPayment(user);
    const userPays = paymentsByUser[user.id] || [];
    const latest = userPays[0];

    if (latest && latest.screenshot_path && !paymentReceiptUrls[latest.id]) {
      setLoadingReceiptUrl(latest.id);
      try {
        const url = await resolveReceiptUrl(latest.screenshot_path);
        setPaymentReceiptUrls((prev) => ({ ...prev, [latest.id]: url }));
      } catch (err: any) {
        console.error('[AdminUsers] Error resolving receipt URL:', err);
      } finally {
        setLoadingReceiptUrl(null);
      }
    }
  };

  const handleClosePaymentPanel = () => {
    setSelectedUserForPayment(null);
  };

  // Status updates
  const handleUpdateStatus = async (userId: string, newStatus: 'approved' | 'none' | 'rejected') => {
    setActionLoading(userId);
    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updErr) throw updErr;

      success(
        newStatus === 'none'
          ? 'Member access revoked.'
          : newStatus === 'approved'
            ? 'Member access granted.'
            : `User status updated to ${newStatus}.`
      );
      setConfirmRevokeUser(null);
      await loadUsersAndPayments();
    } catch (err: any) {
      console.error('[AdminUsers] Update status error:', err);
      error(err.message || 'Failed to update user status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAdmin = async (user: Profile) => {
    const nextAdmin = !user.is_admin;
    setActionLoading(user.id);
    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ is_admin: nextAdmin, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updErr) throw updErr;

      success(`Admin privileges ${nextAdmin ? 'granted' : 'revoked'}.`);
      await loadUsersAndPayments();
    } catch (err: any) {
      console.error('[AdminUsers] Toggle admin error:', err);
      error(err.message || 'Failed to update admin status.');
    } finally {
      setActionLoading(null);
    }
  };

  // Approve Payment inside Payment Panel
  const handleApprovePayment = async () => {
    if (!confirmApprovePayment) return;
    setIsApproving(true);
    try {
      await approvePaymentRequest(confirmApprovePayment);
      success('Payment approved and membership access granted!');
      setConfirmApprovePayment(null);
      await loadUsersAndPayments();
      // Keep panel updated with updated profile
      if (selectedUserForPayment) {
        setSelectedUserForPayment((prev) => (prev ? { ...prev, status: 'approved' } : null));
      }
    } catch (err: any) {
      console.error('[AdminUsers] Approval error:', err);
      error(err.message || 'Failed to approve payment.');
    } finally {
      setIsApproving(false);
    }
  };

  // Reject Payment inside Payment Panel
  const handleRejectPayment = async () => {
    if (!rejectModalPayment) return;
    setIsRejecting(true);
    try {
      await rejectPaymentRequest(rejectModalPayment, rejectReason);
      success('Payment request marked as rejected.');
      setRejectModalPayment(null);
      setRejectReason('');
      await loadUsersAndPayments();
      if (selectedUserForPayment) {
        setSelectedUserForPayment((prev) => (prev ? { ...prev, status: 'rejected' } : null));
      }
    } catch (err: any) {
      console.error('[AdminUsers] Rejection error:', err);
      error(err.message || 'Failed to reject payment.');
    } finally {
      setIsRejecting(false);
    }
  };

  // Filter counters
  const counts = {
    all: users.length,
    pending_payment: users.filter((u) => paymentsByUser[u.id]?.some((p) => p.status === 'pending')).length,
    approved: users.filter((u) => u.status === 'approved').length,
    none: users.filter((u) => u.status === 'none').length,
  };

  // Filter & Search Logic
  const filteredUsers = users.filter((u) => {
    // 1. Tab filter
    if (filter === 'pending_payment') {
      const hasPending = paymentsByUser[u.id]?.some((p) => p.status === 'pending');
      if (!hasPending) return false;
    } else if (filter === 'approved') {
      if (u.status !== 'approved') return false;
    } else if (filter === 'none') {
      if (u.status !== 'none') return false;
    }

    // 2. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchName = u.full_name?.toLowerCase().includes(q);
      const matchRef = u.reference_code.toLowerCase().includes(q);
      return matchEmail || matchName || matchRef;
    }

    return true;
  });

  const renderStatusBadge = (status: Profile['status']) => (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${status === 'approved'
        ? 'bg-emerald-50 text-emerald-700'
        : status === 'pending'
          ? 'bg-amber-50 text-amber-700'
          : status === 'rejected'
            ? 'bg-rose-50 text-rose-700'
            : 'bg-neutral-100 text-[#6B7280]'
        }`}
    >
      {status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'pending' && <Clock className="w-3 h-3" />}
      {status === 'rejected' && <AlertCircle className="w-3 h-3" />}
      <span>{status}</span>
    </span>
  );

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="hidden md:block text-2xl font-bold tracking-tight text-[#111111]">
            Users
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] md:mt-1">
            View registered members, check payment receipts, and manage platform permissions
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by email, ref code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] md:min-h-0 pl-10 pr-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-[16px] md:text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] shadow-soft"
            />
          </div>

          <button
            type="button"
            onClick={loadUsersAndPayments}
            className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 p-2 rounded-xl border border-neutral-200 bg-white text-[#6B7280] hover:text-[#111111] hover:bg-neutral-50 transition-colors flex-shrink-0 flex items-center justify-center cursor-pointer"
            title="Refresh list"
            aria-label="Refresh users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'all', label: 'All', count: counts.all },
          { key: 'pending_payment', label: 'Pending payment', count: counts.pending_payment, highlight: true },
          { key: 'approved', label: 'Approved', count: counts.approved },
          { key: 'none', label: 'None', count: counts.none },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as UserFilter)}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              filter === tab.key
                ? 'bg-[#111111] text-white shadow-xs'
                : 'bg-white border border-neutral-200 text-[#6B7280] hover:text-[#111111] hover:bg-neutral-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filter === tab.key
                  ? 'bg-white/20 text-white'
                  : tab.highlight && tab.count > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-neutral-100 text-[#6B7280]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Error State */}
      {loadError && !loading && (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3 shadow-soft">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
          <p className="text-sm font-semibold text-[#111111]">{loadError}</p>
          <button
            type="button"
            onClick={loadUsersAndPayments}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Mobile Loading Skeletons */}
      {loading && (
        <div className="md:hidden space-y-3">
          {[1, 2, 3].map((sk) => (
            <div
              key={sk}
              className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-soft space-y-3 animate-pulse"
            >
              <div className="flex justify-between gap-2">
                <div className="w-44 h-4 rounded bg-neutral-200" />
                <div className="w-16 h-5 rounded-full bg-neutral-100" />
              </div>
              <div className="w-28 h-3 rounded bg-neutral-100" />
              <div className="h-11 rounded-xl bg-neutral-100" />
            </div>
          ))}
        </div>
      )}

      {/* Mobile Cards (< 768px) */}
      {!loading && !loadError && (
        <div className="md:hidden space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200/90 p-10 text-center text-[#6B7280] shadow-soft">
              <UsersIcon className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-[#111111]">No members found</p>
              <p className="text-xs text-[#6B7280] mt-1">
                {searchQuery ? 'Try adjusting your search query.' : 'Registered users will appear here.'}
              </p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const userPays = paymentsByUser[u.id] || [];
              const hasPending = userPays.some((p) => p.status === 'pending');
              const hasPayments = userPays.length > 0;

              return (
                <div
                  key={u.id}
                  data-user-card={u.id}
                  className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-soft space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#111111] break-all leading-snug">
                        {u.email}
                      </p>
                      {u.full_name && (
                        <p className="text-xs text-[#6B7280] mt-0.5 break-words">
                          {u.full_name}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {renderStatusBadge(u.status)}
                      {hasPending && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3" />
                          <span>Payment pending</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#6B7280] pt-1 border-t border-neutral-100">
                    <span className="font-mono text-[#111111] bg-neutral-100 px-2 py-0.5 rounded font-semibold">
                      {u.reference_code}
                    </span>
                    <span>{formatDate(u.created_at)}</span>
                  </div>

                  {u.is_admin && (
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-900 text-white">
                        <ShieldCheck className="w-3 h-3 text-amber-400" />
                        <span>Admin</span>
                      </span>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="pt-1 grid grid-cols-2 gap-2">
                    {/* Payment inspection button */}
                    <button
                      type="button"
                      onClick={() => handleOpenPaymentPanel(u)}
                      className={`min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        hasPending
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs font-bold'
                          : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-[#111111]'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{hasPayments ? 'Payment' : 'No Payment'}</span>
                    </button>

                    {/* Quick Access Toggle */}
                    {u.status === 'approved' ? (
                      <button
                        type="button"
                        onClick={() => setConfirmRevokeUser(u)}
                        disabled={actionLoading === u.id}
                        className="min-h-[44px] rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Revoke access
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(u.id, 'approved')}
                        disabled={actionLoading === u.id}
                        className="min-h-[44px] rounded-xl bg-[#111111] hover:bg-neutral-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Grant access
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Desktop Users Table (>= 768px) */}
      {!loadError && (
        <div className="hidden md:block bg-white rounded-2xl border border-neutral-200/90 shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#6B7280] flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#111111]" />
              <span className="text-xs">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-[#6B7280]">
              <UsersIcon className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-[#111111]">No members found</p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {searchQuery ? 'Try adjusting your search query.' : 'Registered users will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#FAFAFA] border-b border-neutral-200 text-[#6B7280] uppercase tracking-wider text-[11px] font-semibold">
                  <tr>
                    <th className="px-6 py-3.5 min-w-[220px]">User & Email</th>
                    <th className="px-6 py-3.5">Reference Code</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Registered</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredUsers.map((u) => {
                    const userPays = paymentsByUser[u.id] || [];
                    const hasPending = userPays.some((p) => p.status === 'pending');
                    const hasPayments = userPays.length > 0;

                    return (
                      <tr key={u.id} className="hover:bg-neutral-50/60 transition-colors">
                        {/* Email Column - fully visible, no cut-off at left */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#111111]">{u.full_name || 'Member'}</div>
                          <div className="text-xs text-[#6B7280] font-mono break-all">{u.email}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-[#111111] bg-neutral-100 px-2 py-0.5 rounded">
                            {u.reference_code}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            {renderStatusBadge(u.status)}
                            {hasPending && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3" />
                                <span>Payment pending</span>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-900 text-white">
                              <ShieldCheck className="w-3 h-3 text-amber-400" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="text-xs text-[#6B7280]">Member</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-[#6B7280] whitespace-nowrap text-xs">
                          {formatDate(u.created_at)}
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {/* Payment details button */}
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentPanel(u)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                hasPending
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs font-bold'
                                  : 'border border-neutral-200 hover:bg-neutral-100 text-[#111111]'
                              }`}
                              title="Inspect payment screenshot & history"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{hasPending ? 'Review Payment' : hasPayments ? 'Payment' : 'No Payment'}</span>
                            </button>

                            {/* Grant / Revoke Access */}
                            {u.status !== 'approved' ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(u.id, 'approved')}
                                disabled={actionLoading === u.id}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Grant Access
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRevokeUser(u)}
                                disabled={actionLoading === u.id}
                                className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[#6B7280] hover:text-[#111111] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Revoke access
                              </button>
                            )}

                            {/* Admin toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleAdmin(u)}
                              disabled={actionLoading === u.id}
                              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-xs font-medium text-[#6B7280] hover:text-[#111111] transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {u.is_admin ? 'Demote' : 'Make Admin'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* SIDE PANEL / MODAL: USER PAYMENT SCREENSHOT & HISTORY */}
      {/* ================================================================ */}
      {selectedUserForPayment && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          onClick={handleClosePaymentPanel}
        >
          <div
            className="w-full sm:max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#B8860B] flex-shrink-0" />
                  <h3 className="text-base font-bold text-[#111111] truncate">
                    Payment Details
                  </h3>
                </div>
                <p className="text-xs text-[#6B7280] font-mono mt-0.5 truncate">
                  {selectedUserForPayment.email}
                </p>
              </div>

              <button
                type="button"
                onClick={handleClosePaymentPanel}
                className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-[#111111] hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* User Summary Pill */}
              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-neutral-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Reference Code</span>
                  <span className="font-mono font-bold text-[#111111] text-sm">
                    {selectedUserForPayment.reference_code}
                  </span>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Membership Status</span>
                  {renderStatusBadge(selectedUserForPayment.status)}
                </div>
              </div>

              {/* Latest Payment Section */}
              {(() => {
                const userPays = paymentsByUser[selectedUserForPayment.id] || [];
                const latest = userPays[0];

                if (!latest) {
                  return (
                    <div className="p-8 rounded-2xl border border-dashed border-neutral-200 text-center text-[#6B7280] bg-[#FAFAFA]">
                      <CreditCard className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                      <p className="text-sm font-semibold text-[#111111]">No payments submitted</p>
                      <p className="text-xs mt-1 text-[#6B7280]">
                        This user has not uploaded any payment screenshot yet.
                      </p>
                    </div>
                  );
                }

                const receiptUrl = paymentReceiptUrls[latest.id];
                const isLoadingImg = loadingReceiptUrl === latest.id;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#111111] uppercase tracking-wider text-[11px]">
                        Latest Payment Submission
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          latest.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : latest.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {latest.status}
                      </span>
                    </div>

                    {/* Screenshot Card with Tap-to-Zoom */}
                    <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-neutral-900 shadow-soft">
                      {isLoadingImg ? (
                        <div className="aspect-[4/3] flex flex-col items-center justify-center gap-2 text-neutral-400">
                          <Loader2 className="w-8 h-8 animate-spin text-white" />
                          <span className="text-xs">Loading receipt image...</span>
                        </div>
                      ) : receiptUrl ? (
                        <div
                          className="relative group cursor-pointer aspect-[4/3] flex items-center justify-center bg-black/95 overflow-hidden"
                          onClick={() =>
                            setZoomReceipt({
                              url: receiptUrl,
                              userName: selectedUserForPayment.full_name || selectedUserForPayment.email,
                              refCode: selectedUserForPayment.reference_code,
                            })
                          }
                        >
                          <img
                            src={receiptUrl}
                            alt="Payment receipt"
                            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 text-white text-xs font-semibold backdrop-blur-xs">
                              <ZoomIn className="w-4 h-4" />
                              <span>Tap to zoom</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[4/3] flex flex-col items-center justify-center gap-2 text-neutral-400">
                          <AlertCircle className="w-6 h-6 text-neutral-500" />
                          <span className="text-xs">Screenshot file not available</span>
                        </div>
                      )}
                    </div>

                    {/* Payment Info Grid */}
                    <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-neutral-200/90 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[#6B7280]">Amount:</span>
                        <span className="font-bold text-[#111111] text-sm">
                          {formatCurrency(latest.amount)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#6B7280]">Submitted Date:</span>
                        <span className="font-medium text-[#111111]">
                          {formatDate(latest.created_at)}
                        </span>
                      </div>

                      {latest.bank_account && (
                        <div className="flex justify-between items-center">
                          <span className="text-[#6B7280]">Transferred To Bank:</span>
                          <span className="font-semibold text-[#111111] flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-[#B8860B]" />
                            <span>{latest.bank_account.bank_name}</span>
                          </span>
                        </div>
                      )}

                      {latest.rejection_reason && (
                        <div className="pt-2 border-t border-neutral-200/70">
                          <span className="text-rose-600 font-semibold block text-[11px]">
                            Rejection Reason:
                          </span>
                          <p className="text-rose-700 mt-0.5 leading-relaxed">
                            {latest.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Approve & Reject Actions if Pending */}
                    {latest.status === 'pending' && (
                      <div className="pt-2 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setConfirmApprovePayment(latest)}
                          className="min-h-[46px] rounded-xl bg-[#111111] hover:bg-neutral-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-soft transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Approve Payment</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRejectModalPayment(latest)}
                          className="min-h-[46px] rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Payment History List (if more than 1 payment) */}
              {(() => {
                const userPays = paymentsByUser[selectedUserForPayment.id] || [];
                if (userPays.length <= 1) return null;

                return (
                  <div className="pt-4 border-t border-neutral-200 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Payment History ({userPays.length})
                    </h4>
                    <div className="space-y-2">
                      {userPays.map((p, idx) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl border border-neutral-200/80 bg-white flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#111111]">
                              {formatCurrency(p.amount)} &bull; {formatDate(p.created_at)}
                            </p>
                            {p.rejection_reason && (
                              <p className="text-[11px] text-rose-600 truncate mt-0.5">
                                Reason: {p.rejection_reason}
                              </p>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              p.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : p.status === 'pending'
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Approve Payment Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={Boolean(confirmApprovePayment)}
        title="Approve this payment?"
        description={
          confirmApprovePayment
            ? `Approve payment of ${formatCurrency(confirmApprovePayment.amount)} for ${
                selectedUserForPayment?.email || 'this user'
              }? Their account will be activated immediately.`
            : ''
        }
        confirmLabel="Approve & Activate"
        variant="dark"
        loading={isApproving}
        onConfirm={handleApprovePayment}
        onCancel={() => setConfirmApprovePayment(null)}
      />

      {/* Reject Payment Bottom Sheet */}
      <AdminRejectSheet
        payment={rejectModalPayment}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        loading={isRejecting}
        onConfirm={handleRejectPayment}
        onCancel={() => {
          setRejectModalPayment(null);
          setRejectReason('');
        }}
      />

      {/* Full-Screen Zoomable Screenshot Modal */}
      {zoomReceipt && (
        <ScreenshotModal
          imageUrl={zoomReceipt.url}
          userName={zoomReceipt.userName}
          referenceCode={zoomReceipt.refCode}
          onClose={() => setZoomReceipt(null)}
        />
      )}

      {/* Revoke Access Confirmation */}
      <AdminConfirmDialog
        isOpen={Boolean(confirmRevokeUser)}
        title="Revoke access?"
        description={
          confirmRevokeUser
            ? `Remove member video access for ${confirmRevokeUser.email}?`
            : ''
        }
        confirmLabel="Revoke access"
        variant="danger"
        loading={Boolean(confirmRevokeUser && actionLoading === confirmRevokeUser.id)}
        onConfirm={() => {
          if (confirmRevokeUser) handleUpdateStatus(confirmRevokeUser.id, 'none');
        }}
        onCancel={() => setConfirmRevokeUser(null)}
      />
    </div>
  );
};
