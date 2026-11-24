import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Navbar } from '../components/Navbar';
import { formatDate } from '../lib/utils';
import {
  User,
  Mail,
  KeyRound,
  ShieldCheck,
  Lock,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlaySquare,
  CreditCard,
  LogOut,
} from 'lucide-react';

export const MyAccountPage: React.FC = () => {
  const { user, profile, status, isApproved, isAdmin, signOut, updatePassword } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    const res = await updatePassword(newPassword);
    setPasswordLoading(false);

    if (res.error) {
      error(res.error, 'Password Update Failed');
    } else {
      success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getStatusBadge = () => {
    if (isAdmin) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-900 text-white">
          <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
          Administrator
        </span>
      );
    }
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved Member
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Verification
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Payment Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">
            No Active Subscription
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col selection:bg-neutral-900 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              My Account
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Manage your personal credentials and membership status
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isApproved ? (
              <Link
                to="/videos"
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
              >
                <PlaySquare className="w-3.5 h-3.5" />
                <span>Video Library</span>
              </Link>
            ) : (
              <Link
                to="/activate"
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5 text-gold-400" />
                <span>Activate Access</span>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Profile Card */}
          <div className="md:col-span-2 space-y-6">
            {/* Membership Details */}
            <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-soft">
              <h2 className="text-base font-bold text-neutral-900 tracking-tight mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-neutral-500" />
                <span>Profile & Membership</span>
              </h2>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-neutral-100 gap-1">
                  <span className="text-xs font-medium text-neutral-500">Email Address</span>
                  <span className="text-xs sm:text-sm font-semibold text-neutral-900">
                    {profile?.email || user?.email}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-neutral-100 gap-1">
                  <span className="text-xs font-medium text-neutral-500">Membership Status</span>
                  <div>{getStatusBadge()}</div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-neutral-100 gap-1">
                  <span className="text-xs font-medium text-neutral-500">Unique Reference Code</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-lg">
                    {profile?.reference_code || 'LU20251124'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-neutral-100 gap-1">
                  <span className="text-xs font-medium text-neutral-500">Registered On</span>
                  <span className="text-xs text-neutral-700">
                    {profile?.created_at ? formatDate(profile.created_at) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div id="security" className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-soft">
              <h2 className="text-base font-bold text-neutral-900 tracking-tight mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-neutral-500" />
                <span>Security & Password</span>
              </h2>

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {passwordLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Actions / Support */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 shadow-soft">
              <h3 className="text-sm font-bold text-neutral-900 mb-3">Quick Navigation</h3>
              <div className="space-y-2">
                {isApproved && (
                  <Link
                    to="/videos"
                    className="block p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors text-xs font-medium text-neutral-800"
                  >
                    Watch Lessons
                  </Link>
                )}
                {!isApproved && (
                  <Link
                    to="/activate"
                    className="block p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors text-xs font-medium text-neutral-800"
                  >
                    Submit Transfer Receipt
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="block p-3 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition-colors text-xs font-semibold"
                  >
                    Admin Dashboard
                  </Link>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

