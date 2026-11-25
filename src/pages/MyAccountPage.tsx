import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Navbar } from '../components/Navbar';
import { formatDate } from '../lib/utils';
import {
  User,
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
  const { t, i18n } = useTranslation();
  const { user, profile, status, isApproved, isAdmin, signOut, updatePassword } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      error(t('account.passwordError1'));
      return;
    }
    if (newPassword !== confirmPassword) {
      error(t('account.passwordError2'));
      return;
    }

    setPasswordLoading(true);
    const res = await updatePassword(newPassword);
    setPasswordLoading(false);

    if (res.error) {
      error(res.error, t('account.passwordFailed'));
    } else {
      success(t('account.passwordSuccess'));
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
          <ShieldCheck className="w-3.5 h-3.5 text-[#B8860B]" />
          {t('account.status.administrator')}
        </span>
      );
    }
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {t('account.status.approvedMember')}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            {t('account.status.pendingVerification')}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            {t('account.status.paymentRejected')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">
            {t('account.status.noSubscription')}
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
              {t('account.title')}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              {t('account.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isApproved ? (
              <Link
                to="/videos"
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
              >
                <PlaySquare className="w-3.5 h-3.5" />
                <span>{t('account.videoLibrary')}</span>
              </Link>
            ) : (
              <Link
                to="/activate"
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5 text-[#B8860B]" />
                <span>{t('account.activateAccess')}</span>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-soft">
              <h2 className="text-base font-bold text-neutral-900 tracking-tight mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-neutral-500" />
                <span>{t('account.profileCard')}</span>
              </h2>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-neutral-100 gap-1">
                  <span className="text-xs font-medium text-neutral-500">{t('account.emailLabel')}</span>
                  <span className="text-xs sm:text-sm font-semibold text-neutral-900 force-ltr">
                    {profile?.email || user?.email}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-neutral-100 gap-1">
                  <span className="text-xs font-medium text-neutral-500">{t('account.statusLabel')}</span>
                  <div>{getStatusBadge()}</div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-neutral-100 gap-1">
                  <span className="text-xs font-medium text-neutral-500">{t('account.refCodeLabel')}</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-lg force-ltr">
                    {profile?.reference_code || 'LU20251124'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-neutral-100 gap-1">
                  <span className="text-xs font-medium text-neutral-500">{t('account.registeredLabel')}</span>
                  <span className="text-xs text-neutral-700 force-ltr">
                    {profile?.created_at ? formatDate(profile.created_at, i18n.language) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div id="security" className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-soft">
              <h2 className="text-base font-bold text-neutral-900 tracking-tight mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-neutral-500" />
                <span>{t('account.securityCard')}</span>
              </h2>

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    {t('account.newPassword')}
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
                    {t('account.confirmNewPassword')}
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
                    className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {passwordLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      t('account.updatePassword')
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 shadow-soft">
              <h3 className="text-sm font-bold text-neutral-900 mb-3">{t('account.quickNav')}</h3>
              <div className="space-y-2">
                {isApproved && (
                  <Link
                    to="/videos"
                    className="block p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors text-xs font-medium text-neutral-800"
                  >
                    {t('account.watchLessons')}
                  </Link>
                )}
                {!isApproved && (
                  <Link
                    to="/activate"
                    className="block p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors text-xs font-medium text-neutral-800"
                  >
                    {t('account.submitReceipt')}
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="block p-3 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition-colors text-xs font-semibold"
                  >
                    {t('account.adminDashboard')}
                  </Link>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('account.logOut')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
