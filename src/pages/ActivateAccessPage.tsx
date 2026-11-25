import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Navbar } from '../components/Navbar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { supabase } from '../lib/supabase';
import { copyToClipboard } from '../lib/utils';
import type { Settings, Payment, BankAccount } from '../types';
import {
  CreditCard,
  User,
  Landmark,
  Coins,
  KeyRound,
  Copy,
  Check,
  UploadCloud,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';

export const ActivateAccessContent: React.FC = () => {
  const {
    user,
    profile,
    status,
    refreshProfile,
    isApproved,
    isAdmin,
    loading: authLoading,
  } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [latestPayment, setLatestPayment] = useState<Payment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Route guard check:
  // Approved users must be redirected from /payment to /videos, admins to /admin.
  useEffect(() => {
    if (authLoading) return;

    if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isApproved || profile?.status === 'approved') {
      navigate('/videos', { replace: true });
    }
  }, [authLoading, isAdmin, isApproved, profile?.status, navigate]);

  // 2. Fetch settings, active bank accounts, and user payments safely
  const loadData = useCallback(async () => {
    setDataLoading(true);
    setLoadError(null);

    try {
      // Step A: Ensure profile exists
      if (!profile && user) {
        const fetchedProfile = await refreshProfile();
        if (!fetchedProfile) {
          setLoadError('Could not load payment details. Please refresh.');
          setDataLoading(false);
          return;
        }
      }

      // Step B: Fetch Settings row
      const { data: settsData, error: settsError } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();

      if (settsError) {
        console.error('[ActivateAccessPage] Error loading settings:', settsError);
        setLoadError('Could not load payment details. Please refresh.');
        setDataLoading(false);
        return;
      }

      if (settsData) {
        setSettings(settsData as Settings);
      }

      // Step C: Fetch active bank accounts from bank_accounts table
      const { data: bankData, error: bankError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (bankError) {
        console.warn('[ActivateAccessPage] Notice fetching bank_accounts:', bankError);
        // Fallback: If table not yet migrated or query fails, fallback to settings bank details
        if (settsData && (settsData.rib || settsData.account_holder)) {
          setBankAccounts([
            {
              id: 'legacy-fallback',
              bank_name: settsData.bank_name || 'Attijariwafa Bank',
              account_holder: settsData.account_holder || 'Levelling Up Media',
              rib: settsData.rib || '007 780 0001234567890123 45',
              is_active: true,
              sort_order: 0,
            },
          ]);
        } else {
          setBankAccounts([]);
        }
      } else if (bankData && bankData.length > 0) {
        setBankAccounts(bankData as BankAccount[]);
        // Auto-select first bank account for dropdown
        setSelectedBankId(bankData[0].id);
      } else if (settsData && settsData.rib) {
        // Fallback to legacy settings if bank_accounts is empty
        setBankAccounts([
          {
            id: 'legacy-fallback',
            bank_name: settsData.bank_name || 'Attijariwafa Bank',
            account_holder: settsData.account_holder || 'Levelling Up Media',
            rib: settsData.rib,
            is_active: true,
            sort_order: 0,
          },
        ]);
      } else {
        setBankAccounts([]);
      }

      // Step D: Fetch user payment history if logged in
      if (user) {
        const { data: paysData, error: paysError } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (paysError) {
          console.warn('[ActivateAccessPage] Error fetching user payments:', paysError);
        } else if (paysData && paysData.length > 0) {
          setLatestPayment(paysData[0] as Payment);
        }
      }
    } catch (err: any) {
      console.error('[ActivateAccessPage] Exception in loadData:', err);
      setLoadError('Could not load payment details. Please refresh.');
    } finally {
      setDataLoading(false);
    }
  }, [user, profile, refreshProfile]);

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user, loadData]);

  const safePrice = settings?.price ?? 499;
  const safeReferenceCode =
    profile?.reference_code ||
    (user?.id ? `LU${user.id.slice(0, 8).toUpperCase()}` : 'LU20261125');

  const isPending =
    status === 'pending' ||
    profile?.status === 'pending' ||
    latestPayment?.status === 'pending';

  const isRejected =
    status === 'rejected' ||
    profile?.status === 'rejected' ||
    latestPayment?.status === 'rejected';

  const rejectionReason =
    latestPayment?.rejection_reason ||
    'Your receipt could not be verified. Please ensure the reference code and amount match, and upload a clear screenshot.';

  // Copy handler with visual feedback & safety checks
  const handleCopy = async (text: string | null | undefined, fieldKey: string) => {
    if (!text) {
      error('Value not available to copy.');
      return;
    }
    const ok = await copyToClipboard(String(text));
    if (ok) {
      setCopiedField(fieldKey);
      success('Copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2500);
    } else {
      error('Failed to copy. Please select and copy manually.');
    }
  };

  // Drag and drop file handlers
  const handleFileChange = (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Please select an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      error('Screenshot file must be under 5MB.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit payment screenshot
  const handleSubmitScreenshot = async () => {
    if (!selectedFile) {
      error('Please select a payment screenshot image.');
      return;
    }
    if (!user) {
      error('You must be logged in to submit a payment.');
      return;
    }

    setUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/${Date.now()}_receipt.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(filePath, selectedFile, {
          upsert: true,
        });

      if (uploadError) {
        console.error('[ActivateAccessPage] Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Valid UUID for bank_account_id (or null if not selected or legacy fallback)
      const validBankAccountId =
        selectedBankId && selectedBankId !== 'legacy-fallback' ? selectedBankId : null;

      const { data: newPay, error: payError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          screenshot_path: filePath,
          amount: safePrice,
          status: 'pending',
          bank_account_id: validBankAccountId,
        })
        .select()
        .single();

      if (payError) {
        console.error('[ActivateAccessPage] Payment insert error:', payError);
        throw new Error(`Database error: ${payError.message}`);
      }

      const { error: profError } = await supabase
        .from('profiles')
        .update({ status: 'pending' })
        .eq('id', user.id);

      if (profError) {
        console.warn('[ActivateAccessPage] Profile status update notice:', profError);
      }

      setLatestPayment(newPay as Payment);
      await refreshProfile();
      success('Payment screenshot submitted! Your access is pending approval.');
      handleClearFile();
    } catch (err: any) {
      console.error('[ActivateAccessPage] Submit exception:', err);
      error(err.message || 'Failed to submit payment. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // WhatsApp link helper
  const whatsappNumber = settings?.contact_whatsapp?.replace(/[^0-9+]/g, '') || '';
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace('+', '')}?text=${encodeURIComponent(
        `Hello, I would like to activate my Levelling Up membership. My reference code is: ${safeReferenceCode}`
      )}`
    : null;

  // Loading spinner while checking auth or loading initial payment data
  if (authLoading || (dataLoading && !settings && !loadError)) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col selection:bg-neutral-900 selection:text-white">
        <Navbar />
        <main className="flex-1 py-16 px-4 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#111111]" />
            <p className="text-xs sm:text-sm text-[#6B7280] font-medium">
              Loading payment details...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Clear error display if settings or profile is missing or query failed
  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col selection:bg-neutral-900 selection:text-white">
        <Navbar />
        <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200/90 shadow-soft p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-[#B8860B] flex items-center justify-center border border-amber-200/60 shadow-2xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#111111]">
              Unable to Load Payment Details
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
              Could not load payment details. Please refresh.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col selection:bg-neutral-900 selection:text-white">
      {/* Navbar with account avatar */}
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-xl w-full">
          {/* Main Card */}
          <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-soft p-6 sm:p-10">
            {/* Header: Gold Credit Card Icon & Title */}
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#B8860B]/10 flex items-center justify-center text-[#B8860B] mb-4 shadow-xs border border-[#B8860B]/20">
                <CreditCard className="w-7 h-7 stroke-[1.75]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
                Activate your access
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-[#6B7280]">
                Complete the payment below to unlock your membership.
              </p>
            </div>

            {/* Approved Notice (if user became approved while on page) */}
            {isApproved && (
              <div className="mt-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-950">Membership Approved!</h4>
                    <p className="text-xs text-emerald-700">You have full access to the video library.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/videos')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Go to Videos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Rejection Alert Banner */}
            {isRejected && (
              <div className="mt-6 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold">Payment Verification Rejected</h4>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                      {rejectionReason}
                    </p>
                    <p className="text-xs text-rose-600 mt-2 font-medium">
                      You can submit a new screenshot below.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Price & Reference Code Header Summary */}
            <div className="mt-6 p-4 rounded-2xl bg-[#FAFAFA] border border-neutral-200/90 grid grid-cols-2 gap-3 divide-x divide-neutral-200 text-center">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                  Amount to Transfer
                </span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Coins className="w-4 h-4 text-[#B8860B]" />
                  <span className="text-lg font-bold text-[#111111]">{safePrice} MAD</span>
                </div>
              </div>

              <div className="pl-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                  Your Reference Code
                </span>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="font-mono text-xs font-bold text-[#111111] bg-neutral-200/70 px-2 py-0.5 rounded">
                    {safeReferenceCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(safeReferenceCode, 'ref-code')}
                    className="p-1 rounded hover:bg-neutral-200 text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer"
                    title="Copy reference code"
                  >
                    {copiedField === 'ref-code' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Note banner: Transfer to any one of these accounts */}
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-950 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#B8860B] flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Transfer to any one of these accounts and use your reference code{' '}
                <span className="font-mono font-bold text-[#111111]">{safeReferenceCode}</span>{' '}
                in the transfer reason.
              </p>
            </div>

            {/* Zero active accounts fallback */}
            {bankAccounts.length === 0 ? (
              <div className="mt-6 p-8 rounded-2xl bg-[#FAFAFA] border border-neutral-200 text-center space-y-3">
                <AlertCircle className="w-8 h-8 mx-auto text-amber-600" />
                <h4 className="text-sm font-bold text-[#111111]">
                  Payment details are not available yet.
                </h4>
                <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                  Payment details are not available yet. Contact us on WhatsApp to activate your account.
                </p>
                {whatsappUrl && (
                  <div className="pt-2">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Contact us on WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              /* Bank Accounts Cards */
              <div className="mt-5 space-y-3.5">
                {bankAccounts.map((account, idx) => (
                  <div
                    key={account.id || idx}
                    className="p-4 sm:p-5 rounded-2xl bg-[#FBFBFB] border border-neutral-200/90 shadow-2xs space-y-3"
                  >
                    {/* Bank Name Title */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-200/60">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-[#B8860B] flex-shrink-0" />
                        <h3 className="text-sm font-bold text-[#111111]">
                          {account.bank_name}
                        </h3>
                      </div>
                      <span className="text-[11px] font-semibold text-[#6B7280] bg-white border border-neutral-200 px-2 py-0.5 rounded-full">
                        Account #{idx + 1}
                      </span>
                    </div>

                    {/* Account Holder */}
                    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-[#6B7280] min-w-0">
                        <User className="w-3.5 h-3.5 text-[#6B7280] flex-shrink-0" />
                        <span className="font-medium truncate">Account Holder:</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-semibold text-[#111111] text-xs sm:text-sm">
                          {account.account_holder}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(account.account_holder, `holder-${account.id}`)}
                          className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[#6B7280] hover:text-[#111111] transition-colors flex items-center gap-1 text-xs cursor-pointer"
                          title="Copy account holder"
                        >
                          {copiedField === `holder-${account.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px] font-medium hidden sm:inline">Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* RIB */}
                    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-[#6B7280] min-w-0">
                        <CreditCard className="w-3.5 h-3.5 text-[#6B7280] flex-shrink-0" />
                        <span className="font-medium">RIB:</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono font-semibold text-[#111111] text-xs tracking-wider">
                          {account.rib}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(account.rib, `rib-${account.id}`)}
                          className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[#6B7280] hover:text-[#111111] transition-colors flex items-center gap-1 text-xs cursor-pointer"
                          title="Copy RIB"
                        >
                          {copiedField === `rib-${account.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px] font-medium hidden sm:inline">Copy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div className="mt-6 space-y-4">
              {/* Optional Bank Selection Dropdown */}
              {bankAccounts.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    Which bank did you transfer to? (Optional)
                  </label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all cursor-pointer"
                  >
                    <option value="">Select bank account...</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bank_name} &bull; {acc.account_holder}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="hidden"
                id="screenshot-input"
              />

              {!previewUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-neutral-900 bg-neutral-100/80 scale-[1.01]'
                      : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/50 hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 mb-3 shadow-xs">
                    <UploadCloud className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <p className="text-sm font-semibold text-neutral-900">
                    Upload your payment screenshot
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Drag & drop your image here, or click to browse
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-2">
                    Supports JPG, PNG, WEBP (Max 5MB)
                  </p>
                </div>
              ) : (
                /* Preview Container before sending */
                <div className="relative rounded-2xl border border-neutral-200 bg-neutral-50 p-4 overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-neutral-800">
                      Receipt Preview ({selectedFile?.name})
                    </span>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-56 overflow-hidden rounded-xl bg-neutral-900 flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="max-h-56 w-auto object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleSubmitScreenshot}
                disabled={!selectedFile || uploading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#111111] text-white font-semibold text-sm hover:bg-neutral-800 transition-all duration-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>Submit</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Pending Approval Badge */}
            {isPending && (
              <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-center justify-center gap-2.5 text-xs font-semibold">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Pending approval</span>
              </div>
            )}

            {isPending && (
              <p className="mt-2 text-center text-[11px] text-neutral-400">
                Your payment screenshot has been submitted and is awaiting administrator verification. Access is usually activated within a few hours.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export const ActivateAccessPage: React.FC = () => {
  return (
    <ErrorBoundary fallbackMessage="Could not load payment details. Please refresh.">
      <ActivateAccessContent />
    </ErrorBoundary>
  );
};
