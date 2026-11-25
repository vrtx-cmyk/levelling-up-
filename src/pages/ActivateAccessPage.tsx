import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');

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

  // Route guard check
  useEffect(() => {
    if (authLoading) return;

    if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isApproved || profile?.status === 'approved') {
      navigate('/videos', { replace: true });
    }
  }, [authLoading, isAdmin, isApproved, profile?.status, navigate]);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setLoadError(null);

    try {
      if (!profile && user) {
        const fetchedProfile = await refreshProfile();
        if (!fetchedProfile) {
          setLoadError(t('payment.loadError'));
          setDataLoading(false);
          return;
        }
      }

      const { data: settsData, error: settsError } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();

      if (settsError) {
        console.error('[ActivateAccessPage] Error loading settings:', settsError);
        setLoadError(t('payment.loadError'));
        setDataLoading(false);
        return;
      }

      if (settsData) {
        setSettings(settsData as Settings);
      }

      const { data: bankData, error: bankError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (bankError) {
        console.warn('[ActivateAccessPage] Notice fetching bank_accounts:', bankError);
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
        setSelectedBankId(bankData[0].id);
      } else if (settsData && settsData.rib) {
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
      setLoadError(t('payment.loadError'));
    } finally {
      setDataLoading(false);
    }
  }, [user, profile, refreshProfile, t]);

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
    t('payment.rejected.desc');

  const handleCopy = async (text: string | null | undefined, fieldKey: string) => {
    if (!text) {
      error(t('common.error'));
      return;
    }
    const ok = await copyToClipboard(String(text));
    if (ok) {
      setCopiedField(fieldKey);
      success(t('common.copied'));
      setTimeout(() => setCopiedField(null), 2500);
    } else {
      error(t('common.error'));
    }
  };

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

  const handleSubmitScreenshot = async () => {
    if (!selectedFile) {
      error(t('payment.uploadTitle'));
      return;
    }
    if (!user) {
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

      await supabase
        .from('profiles')
        .update({ status: 'pending' })
        .eq('id', user.id);

      setLatestPayment(newPay as Payment);
      await refreshProfile();
      success(t('payment.pending.desc'));
      handleClearFile();
    } catch (err: any) {
      console.error('[ActivateAccessPage] Submit exception:', err);
      error(err.message || t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  const whatsappNumber = settings?.contact_whatsapp?.replace(/[^0-9+]/g, '') || '';
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace('+', '')}?text=${encodeURIComponent(
        `Hello, I would like to activate my Levelling Up membership. My reference code is: ${safeReferenceCode}`
      )}`
    : null;

  if (authLoading || (dataLoading && !settings && !loadError)) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col selection:bg-neutral-900 selection:text-white">
        <Navbar />
        <main className="flex-1 py-16 px-4 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#111111]" />
            <p className="text-xs sm:text-sm text-[#6B7280] font-medium">
              {t('common.loading')}
            </p>
          </div>
        </main>
      </div>
    );
  }

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
              {t('common.error')}
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
              {loadError}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('common.retry')}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col selection:bg-neutral-900 selection:text-white">
      <Navbar />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-xl w-full">
          <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-soft p-6 sm:p-10">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#B8860B]/10 flex items-center justify-center text-[#B8860B] mb-4 shadow-xs border border-[#B8860B]/20">
                <CreditCard className="w-7 h-7 stroke-[1.75]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
                {t('payment.title')}
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-[#6B7280]">
                {t('payment.subtitle')}
              </p>
            </div>

            {/* Approved Notice */}
            {isApproved && (
              <div className="mt-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-950">{t('landing.lessons.activeMembership')}</h4>
                    <p className="text-xs text-emerald-700">{t('landing.lessons.welcomeBackDesc')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/videos')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{t('videos.returnToLibrary')}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}

            {/* Rejection Alert Banner */}
            {isRejected && (
              <div className="mt-6 p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold">{t('payment.rejected.title')}</h4>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                      {rejectionReason}
                    </p>
                    <p className="text-xs text-rose-600 mt-2 font-medium">
                      {t('payment.rejected.resubmit')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Price & Reference Code Header Summary */}
            <div className="mt-6 p-4 rounded-2xl bg-[#FAFAFA] border border-neutral-200/90 grid grid-cols-2 gap-3 divide-x rtl:divide-x-reverse divide-neutral-200 text-center">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                  {t('admin.payments.amount')}
                </span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Coins className="w-4 h-4 text-[#B8860B]" />
                  <span className="text-lg font-bold text-[#111111] force-ltr">{safePrice} MAD</span>
                </div>
              </div>

              <div className="pl-3 rtl:pl-0 rtl:pr-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                  {t('payment.refCode')}
                </span>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="font-mono text-xs font-bold text-[#111111] bg-neutral-200/70 px-2 py-0.5 rounded force-ltr">
                    {safeReferenceCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(safeReferenceCode, 'ref-code')}
                    className="p-1 rounded hover:bg-neutral-200 text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer"
                    title={t('payment.refCodeCopy')}
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

            {/* Note banner */}
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-950 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#B8860B] flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {t('payment.bankSelect')}{' '}
                <span className="font-mono font-bold text-[#111111] force-ltr">{safeReferenceCode}</span>
              </p>
            </div>

            {/* Bank Accounts Cards */}
            {bankAccounts.length === 0 ? (
              <div className="mt-6 p-8 rounded-2xl bg-[#FAFAFA] border border-neutral-200 text-center space-y-3">
                <AlertCircle className="w-8 h-8 mx-auto text-amber-600" />
                <h4 className="text-sm font-bold text-[#111111]">
                  {t('payment.noAccounts')}
                </h4>
                {whatsappUrl && (
                  <div className="pt-2">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{t('payment.contactWhatsapp')}</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-3.5">
                {bankAccounts.map((account, idx) => (
                  <div
                    key={account.id || idx}
                    className="p-4 sm:p-5 rounded-2xl bg-[#FBFBFB] border border-neutral-200/90 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-200/60">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-[#B8860B] flex-shrink-0" />
                        <h3 className="text-sm font-bold text-[#111111]">
                          {account.bank_name}
                        </h3>
                      </div>
                      <span className="text-[11px] font-semibold text-[#6B7280] bg-white border border-neutral-200 px-2 py-0.5 rounded-full force-ltr">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-[#6B7280] min-w-0">
                        <User className="w-3.5 h-3.5 text-[#6B7280] flex-shrink-0" />
                        <span className="font-medium truncate">{t('payment.accountHolder')}:</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-semibold text-[#111111] text-xs sm:text-sm">
                          {account.account_holder}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(account.account_holder, `holder-${account.id}`)}
                          className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[#6B7280] hover:text-[#111111] transition-colors flex items-center gap-1 text-xs cursor-pointer"
                          title={t('payment.copyHolder')}
                        >
                          {copiedField === `holder-${account.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px] font-medium hidden sm:inline">{t('common.copy')}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-[#6B7280] min-w-0">
                        <CreditCard className="w-3.5 h-3.5 text-[#6B7280] flex-shrink-0" />
                        <span className="font-medium">{t('payment.rib')}:</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono font-semibold text-[#111111] text-xs tracking-wider force-ltr">
                          {account.rib}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(account.rib, `rib-${account.id}`)}
                          className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[#6B7280] hover:text-[#111111] transition-colors flex items-center gap-1 text-xs cursor-pointer"
                          title={t('payment.copyRib')}
                        >
                          {copiedField === `rib-${account.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px] font-medium hidden sm:inline">{t('common.copy')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div className="mt-6 space-y-4">
              {bankAccounts.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    {t('payment.bankSelectLabel')}
                  </label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all cursor-pointer"
                  >
                    <option value="">{t('payment.bankSelectPlaceholder')}</option>
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
                    {t('payment.uploadTitle')}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {t('payment.uploadHint')}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-2">
                    {t('payment.uploadFormat')}
                  </p>
                </div>
              ) : (
                <div className="relative rounded-2xl border border-neutral-200 bg-neutral-50 p-4 overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-neutral-800">
                      {selectedFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
                      title={t('payment.uploadRemove')}
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
                    <span>{t('payment.submit')}</span>
                    <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
            </div>

            {/* Pending Approval Badge */}
            {isPending && (
              <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-center justify-center gap-2.5 text-xs font-semibold">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{t('payment.pending.title')}</span>
              </div>
            )}

            {isPending && (
              <p className="mt-2 text-center text-[11px] text-neutral-400">
                {t('payment.pending.checkBack')}
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
