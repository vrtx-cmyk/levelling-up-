import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Logo } from '../components/Logo';
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
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
      success('Confirmation email sent! Please check your inbox.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setEmailNotConfirmed(false);
    setResentNotice(false);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
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
            setErrorMessage('Please confirm your email first');
          } else {
            setErrorMessage(res.error);
            error(res.error);
          }
        } else {
          success('Welcome back to Levelling Up!');
          navigate('/', { replace: true });
        }
      } else {
        const res = await signUp(cleanEmail, password);
        if (res.error) {
          isSubmittingRef.current = false;
          setErrorMessage(res.error);
          error(res.error);
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
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#111111] selection:text-white">
      {/* Top Header / Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Logo size="lg" linkTo="/" className="justify-center" />
        {!checkEmail && (
          <>
            <h2 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
              {mode === 'login' ? 'Log in to your account' : 'Create your account'}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#6B7280]">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('signup')}
                    className="font-semibold text-[#111111] hover:underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    className="font-semibold text-[#111111] hover:underline cursor-pointer"
                  >
                    Log in
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
                  Check your email
                </h2>
                <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                  We sent a confirmation link to{' '}
                  <span className="font-semibold text-[#111111] break-words">
                    {checkEmailAddress}
                  </span>
                  . Click it to activate your account, then log in.
                </p>
              </div>

              {resentNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Confirmation email sent again. Check your inbox.</span>
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
                  <span>Go to login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div>
                  <button
                    type="button"
                    onClick={() => handleResendEmail(checkEmailAddress)}
                    disabled={resending}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {resending ? 'Sending...' : 'Resend email'}
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
                        {resending ? 'Sending...' : 'Resend email'}
                      </button>
                      {resentNotice && (
                        <span className="text-emerald-700">Sent!</span>
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
                    Email address
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
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
                      placeholder="you@example.com"
                      className="block w-full pl-10 pr-3 py-3 bg-[#FAFAFA] border border-neutral-200/90 rounded-xl text-xs sm:text-sm text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent transition-all"
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
                      Password
                    </label>
                    <span className="text-[11px] text-[#6B7280]">
                      Min. 6 characters
                    </span>
                  </div>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
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
                      className="block w-full pl-10 pr-10 py-3 bg-[#FAFAFA] border border-neutral-200/90 rounded-xl text-xs sm:text-sm text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                      Confirm password
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
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
                        className="block w-full pl-10 pr-10 py-3 bg-[#FAFAFA] border border-neutral-200/90 rounded-xl text-xs sm:text-sm text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
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
                      <span>Please wait...</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Log in' : 'Create account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Bottom Security Note */}
          <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              Your information is secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
