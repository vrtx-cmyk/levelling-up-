import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../lib/utils';
import { AdminConfirmDialog } from '../../components/AdminConfirmDialog';
import type { Profile } from '../../types';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Users as UsersIcon,
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmRevokeUser, setConfirmRevokeUser] = useState<Profile | null>(null);

  const { success, error } = useToast();

  const loadUsers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error: uErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (uErr) {
        console.error('[AdminUsers] Error fetching users:', uErr);
        setLoadError('Could not load users.');
        error('Could not load users.');
      } else if (data) {
        setUsers(data as Profile[]);
      }
    } catch (err: any) {
      console.error('[AdminUsers] Unexpected error:', err);
      setLoadError('Failed to fetch users. Please try again.');
      error('Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
      await loadUsers();
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
      await loadUsers();
    } catch (err: any) {
      console.error('[AdminUsers] Toggle admin error:', err);
      error(err.message || 'Failed to update admin status.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.reference_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStatusBadge = (status: Profile['status']) => (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
        status === 'approved'
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
            View registered members, status, and manage platform permissions
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] md:min-h-0 pl-10 pr-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-[16px] md:text-xs text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] shadow-soft"
            />
          </div>

          <button
            type="button"
            onClick={loadUsers}
            className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 p-2 rounded-xl border border-neutral-200 bg-white text-[#6B7280] hover:text-[#111111] hover:bg-neutral-50 transition-colors flex-shrink-0 flex items-center justify-center cursor-pointer"
            title="Refresh list"
            aria-label="Refresh users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {loadError && !loading && (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3 shadow-soft">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
          <p className="text-sm font-semibold text-[#111111]">{loadError}</p>
          <button
            type="button"
            onClick={loadUsers}
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
            filteredUsers.map((u) => (
              <div
                key={u.id}
                data-user-card={u.id}
                className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-soft space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#111111] break-all">{u.email}</p>
                    {u.full_name && (
                      <p className="text-xs text-[#6B7280] mt-0.5 break-words">{u.full_name}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">{renderStatusBadge(u.status)}</div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#6B7280] pt-1 border-t border-neutral-100">
                  <span className="font-mono text-[#111111] bg-neutral-100 px-2 py-0.5 rounded">
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

                <div className="pt-1 flex flex-col gap-2">
                  {u.status === 'approved' ? (
                    <button
                      type="button"
                      onClick={() => setConfirmRevokeUser(u)}
                      disabled={actionLoading === u.id}
                      className="w-full min-h-[44px] rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Revoke access
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(u.id, 'approved')}
                      disabled={actionLoading === u.id}
                      className="w-full min-h-[44px] rounded-xl bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Grant access
                    </button>
                  )}
                </div>
              </div>
            ))
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
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Reference Code</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Registered</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#111111]">{u.full_name || 'Member'}</div>
                        <div className="text-xs text-[#6B7280]">{u.email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-[#111111] bg-neutral-100 px-2 py-0.5 rounded">
                          {u.reference_code}
                        </span>
                      </td>

                      <td className="px-6 py-4">{renderStatusBadge(u.status)}</td>

                      <td className="px-6 py-4">
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
                          {u.status !== 'approved' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(u.id, 'approved')}
                              disabled={actionLoading === u.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Grant Access
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRevokeUser(u)}
                              disabled={actionLoading === u.id}
                              className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[#6B7280] hover:text-[#111111] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Revoke access
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleAdmin(u)}
                            disabled={actionLoading === u.id}
                            className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-xs font-medium text-[#111111] transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {u.is_admin ? 'Demote' : 'Make Admin'}
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
