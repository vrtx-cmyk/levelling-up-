import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Logo } from '../components/Logo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [checkEmailAddress, setCheckEmailAddress] = useState('');
  const [resentNotice, setResentNotice] = useState(false);

  const isSubmittingRef = useRef(false);

  const {
    signIn,
    signUp,
    resendConfirmationEmail,
    user,
    profile,
    loading: authLoading,
  } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Sync mode when switching between /login and /signup routes
  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
    setEmailNotConfirmed(false);
    setCheckEmail(false);
    setResentNotice(false);
  }, [initialMode]);

  // If already authenticated when visiting /login or /signup directly, navigate to "/"
  useEffect(() => {
    if (!authLoading && user && profile && !isSubmittingRef.current) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, profile, navigate]);

  const handleModeSwitch = (nextMode: 'login' | 'signup') => {
    setMode(nextMode);
    setErrorMessage(null);
    setEmailNotConfirmed(false);
    setCheckEmail(false);
    setResentNotice(false);
    setConfirmPassword('');
    navigate(nextMode === 'login' ? '/login' : '/signup');
  };

  const handleResendEmail = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail) return;
    setResending(true);
    setResentNotice(false);
    const res = await resendConfirmationEmail(cleanEmail);
    setResending(false);

    if (res.error) {
      error(res.error);
    } else {
      setResentNotice(true);
      success(t('auth.errors.confirmationSent'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setEmailNotConfirmed(false);
    setResentNotice(false);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage(t('auth.errors.emailRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage(t('auth.errors.emailInvalid'));
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage(t('auth.errors.passwordShort'));
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage(t('auth.errors.passwordMismatch'));
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await signIn(cleanEmail, password);

        if (res.error) {
          isSubmittingRef.current = false;
          if (res.unconfirmedEmail) {
            setEmailNotConfirmed(true);
            setErrorMessage(t('auth.errors.confirmEmailFirst'));
          } else {
            setErrorMessage(t('auth.errors.invalidCredentials'));
            error(t('auth.errors.invalidCredentials'));
          }
        } else {
          success(mode === 'login' ? 'Welcome back to Levelling Up!' : 'Account created. Welcome to Levelling Up!');
          navigate('/', { replace: true });
        }
      } else {
        const res = await signUp(cleanEmail, password);
        if (res.error) {
          isSubmittingRef.current = false;
          const msg = res.error.toLowerCase().includes('already')
            ? t('auth.errors.emailExists')
            : res.error;
          setErrorMessage(msg);
          error(msg);
        } else if (!res.session) {
          isSubmittingRef.current = false;
          setCheckEmailAddress(cleanEmail);
          setCheckEmail(true);
        } else {
          success('Account created. Welcome to Levelling Up!');
          navigate('/payment', { replace: true });
        }
      }
    } catch {
      isSubmittingRef.current = false;
      setErrorMessage(t('auth.errors.somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#111111] selection:text-white">
      {/* Top Corner Language Switcher */}
      <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-20">
        <LanguageSwitcher variant="page-corner" />
      </div>

      {/* Top Header / Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Logo size="lg" linkTo="/" className="justify-center" />
        {!checkEmail && (
          <>
            <h2 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
              {mode === 'login' ? t('auth.loginTitle') : t('auth.signupTitle')}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#6B7280]">
              {mode === 'login' ? (
                <>
                  {t('auth.noAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('signup')}
                    className="font-semibold text-[#111111] hover:underline cursor-pointer"
                  >
                    {t('auth.signUp')}
                  </button>
                </>
              ) : (
                <>
                  {t('auth.haveAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    className="font-semibold text-[#111111] hover:underline cursor-pointer"
                  >
                    {t('auth.logIn')}
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-neutral-200/90 shadow-soft">
          {checkEmail ? (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center">
                <Mail className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
                  {t('auth.checkEmail.title')}
                </h2>
                <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                  {t('auth.checkEmail.sentTo')}{' '}
                  <span className="font-semibold text-[#111111] break-words force-ltr">
                    {checkEmailAddress}
                  </span>
                  {t('auth.checkEmail.instruction')}
                </p>
              </div>

              {resentNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{t('auth.checkEmail.resentNotice')}</span>
                </div>
              )}

              <div className="pt-1 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setCheckEmail(false);
                    setResentNotice(false);
                    setErrorMessage(null);
                    setPassword('');
                    setConfirmPassword('');
                    setMode('login');
                    navigate('/login');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#111111] text-white text-xs sm:text-sm font-semibold tracking-wide hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#111111] shadow-soft transition-all cursor-pointer"
                >
                  <span>{t('auth.checkEmail.goToLogin')}</span>
                  <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                </button>

                <div>
                  <button
                    type="button"
                    onClick={() => handleResendEmail(checkEmailAddress)}
                    disabled={resending}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {resending ? t('common.sending') : t('auth.checkEmail.resendEmail')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div
                  className={`mb-6 p-4 rounded-xl border text-xs font-medium leading-relaxed ${
                    emailNotConfirmed
                      ? 'bg-emerald-50/70 border-emerald-200 text-neutral-800'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  <p>{errorMessage}</p>
                  {emailNotConfirmed && (
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleResendEmail(email)}
                        disabled={resending}
                        className="font-semibold text-emerald-700 hover:text-emerald-800 underline disabled:opacity-50 cursor-pointer"
                      >
                        {resending ? t('common.sending') : t('auth.checkEmail.resendEmail')}
                      </button>
                      {resentNotice && (
                        <span className="text-emerald-700">{t('common.sent')}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <form noValidate onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5"
                  >
                    {t('auth.emailLabel')}
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-[#6B7280]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      className="block w-full pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-3 bg-[#FAFAFA] border border-neutral-200/90 rounded-xl text-xs sm:text-sm text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#111111]"
                    >
                      {t('auth.passwordLabel')}
                    </label>
                    <span className="text-[11px] text-[#6B7280]">
                      {t('auth.passwordMin')}
                    </span>
                  </div>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-[#6B7280]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-10 rtl:pl-10 rtl:pr-10 py-3 bg-[#FAFAFA] border border-neutral-200/90 rounded-xl text-xs sm:text-sm text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3.5 rtl:pr-0 rtl:pl-3.5 flex items-center text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer"
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field (Signup only) */}
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5"
                    >
                      {t('auth.confirmPasswordLabel')}
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-[#6B7280]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-10 rtl:pl-10 rtl:pr-10 py-3 bg-[#FAFAFA] border border-neutral-200/90 rounded-xl text-xs sm:text-sm text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3.5 rtl:pr-0 rtl:pl-3.5 flex items-center text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer"
                        aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#111111] text-white text-xs sm:text-sm font-semibold tracking-wide hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#111111] shadow-soft disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('common.pleaseWait')}</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'login' ? t('auth.loginButton') : t('auth.createAccountButton')}</span>
                      <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Bottom Security Note */}
          <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              {t('auth.secureNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
