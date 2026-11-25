import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { AdminConfirmDialog } from '../../components/AdminConfirmDialog';
import type { Settings, BankAccount } from '../../types';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Landmark,
  User,
  CreditCard,
  Building2,
} from 'lucide-react';

interface EditableBankAccount {
  id?: string; // undefined if newly created locally
  tempId: string;
  bank_name: string;
  account_holder: string;
  rib: string;
  is_active: boolean;
  sort_order: number;
}

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    rib: '007 780 0001234567890123 45',
    account_holder: 'Levelling Up Media',
    bank_name: 'Attijariwafa Bank',
    price: 499,
    contact_whatsapp: '+212600000000',
    contact_email: 'contact@levellingup.com',
  });

  const [bankAccounts, setBankAccounts] = useState<EditableBankAccount[]>([]);
  const [deletedAccountIds, setDeletedAccountIds] = useState<string[]>([]);
  const [confirmRemoveAccount, setConfirmRemoveAccount] = useState<EditableBankAccount | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  const loadSettingsAndBankAccounts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // 1. Fetch settings row
      const { data: sData, error: sErr } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();

      if (sErr) {
        console.error('[AdminSettings] Error fetching settings:', sErr);
        setLoadError('Could not load settings.');
        error('Could not load settings.');
      } else if (sData) {
        setSettings(sData);
      }

      // 2. Fetch bank accounts from bank_accounts table
      const { data: bData, error: bErr } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (bErr) {
        console.warn('[AdminSettings] bank_accounts table query notice:', bErr);
        // Fallback: If table doesn't have rows or not ready yet, initialize from settings
        if (sData) {
          setBankAccounts([
            {
              tempId: 'default-1',
              bank_name: sData.bank_name || 'Attijariwafa Bank',
              account_holder: sData.account_holder || 'Levelling Up Media',
              rib: sData.rib || '007 780 0001234567890123 45',
              is_active: true,
              sort_order: 0,
            },
          ]);
        }
      } else if (bData && bData.length > 0) {
        setBankAccounts(
          bData.map((b: BankAccount, idx: number) => ({
            id: b.id,
            tempId: b.id || `account-${idx}`,
            bank_name: b.bank_name,
            account_holder: b.account_holder,
            rib: b.rib,
            is_active: b.is_active,
            sort_order: b.sort_order ?? idx,
          }))
        );
      } else if (sData) {
        // If bank_accounts is empty, populate with first default
        setBankAccounts([
          {
            tempId: 'default-1',
            bank_name: sData.bank_name || 'Attijariwafa Bank',
            account_holder: sData.account_holder || 'Levelling Up Media',
            rib: sData.rib || '007 780 0001234567890123 45',
            is_active: true,
            sort_order: 0,
          },
        ]);
      }
    } catch (err: any) {
      console.error('[AdminSettings] Unexpected error:', err);
      setLoadError('Failed to load settings. Please try again.');
      error('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndBankAccounts();
  }, []);

  const handleAddAccount = () => {
    if (bankAccounts.length >= 3) {
      error('Maximum of 3 bank accounts allowed.');
      return;
    }
    const newAccount: EditableBankAccount = {
      tempId: `new-${Date.now()}`,
      bank_name: '',
      account_holder: settings.account_holder || '',
      rib: '',
      is_active: true,
      sort_order: bankAccounts.length,
    };
    setBankAccounts([...bankAccounts, newAccount]);
  };

  const handleUpdateAccount = (tempId: string, field: keyof EditableBankAccount, value: any) => {
    setBankAccounts((prev) =>
      prev.map((acc) => (acc.tempId === tempId ? { ...acc, [field]: value } : acc))
    );
  };

  const handleConfirmRemove = () => {
    if (!confirmRemoveAccount) return;
    if (confirmRemoveAccount.id) {
      setDeletedAccountIds((prev) => [...prev, confirmRemoveAccount.id!]);
    }
    setBankAccounts((prev) => prev.filter((acc) => acc.tempId !== confirmRemoveAccount.tempId));
    setConfirmRemoveAccount(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Validate bank accounts
      for (let i = 0; i < bankAccounts.length; i++) {
        const acc = bankAccounts[i];
        if (!acc.bank_name.trim()) {
          throw new Error(`Bank account #${i + 1} is missing the bank name.`);
        }
        if (!acc.account_holder.trim()) {
          throw new Error(`Bank account #${i + 1} is missing the account holder name.`);
        }
        if (!acc.rib.trim()) {
          throw new Error(`Bank account #${i + 1} is missing the RIB.`);
        }
      }

      // 2. Save settings row (price, contact info, and sync primary bank account for legacy readers)
      const primaryBank = bankAccounts.find((a) => a.is_active) || bankAccounts[0];
      const { error: updErr } = await supabase.from('settings').upsert({
        id: 1,
        rib: primaryBank?.rib.trim() || settings.rib.trim(),
        account_holder: primaryBank?.account_holder.trim() || settings.account_holder.trim(),
        bank_name: primaryBank?.bank_name.trim() || settings.bank_name?.trim() || null,
        price: Number(settings.price),
        contact_whatsapp: settings.contact_whatsapp?.trim() || null,
        contact_email: settings.contact_email?.trim() || null,
        updated_at: new Date().toISOString(),
      });

      if (updErr) throw updErr;

      // 3. Process deleted bank accounts
      if (deletedAccountIds.length > 0) {
        const { error: delErr } = await supabase
          .from('bank_accounts')
          .delete()
          .in('id', deletedAccountIds);
        if (delErr) console.warn('[AdminSettings] Error deleting removed accounts:', delErr);
      }

      // 4. Upsert bank accounts
      for (let idx = 0; idx < bankAccounts.length; idx++) {
        const acc = bankAccounts[idx];
        const payload = {
          bank_name: acc.bank_name.trim(),
          account_holder: acc.account_holder.trim(),
          rib: acc.rib.trim(),
          is_active: acc.is_active,
          sort_order: idx,
        };

        if (acc.id) {
          const { error: accUpdErr } = await supabase
            .from('bank_accounts')
            .update(payload)
            .eq('id', acc.id);
          if (accUpdErr) throw accUpdErr;
        } else {
          const { data: newAccData, error: accInsErr } = await supabase
            .from('bank_accounts')
            .insert(payload)
            .select()
            .single();
          if (accInsErr) throw accInsErr;
          if (newAccData) {
            acc.id = newAccData.id;
          }
        }
      }

      setDeletedAccountIds([]);
      success('Bank accounts and settings updated successfully!', 'Settings Saved');
      await loadSettingsAndBankAccounts();
    } catch (err: any) {
      console.error('[AdminSettings] Save error:', err);
      error(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 md:space-y-6 pb-24 md:pb-0">
      {/* Page Header */}
      <div>
        <h1 className="hidden md:block text-2xl font-bold tracking-tight text-[#111111]">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] md:mt-1">
          Configure bank transfer accounts, membership pricing, and contact details
        </p>
      </div>

      {loadError && !loading && (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3 shadow-soft max-w-3xl">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
          <p className="text-sm font-semibold text-[#111111]">{loadError}</p>
          <button
            type="button"
            onClick={loadSettingsAndBankAccounts}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Settings Form Card */}
      {!loadError && (
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 sm:p-8 shadow-soft max-w-3xl">
          {loading ? (
            <div className="space-y-5 animate-pulse">
              {[1, 2, 3, 4, 5].map((sk) => (
                <div key={sk} className="space-y-2">
                  <div className="w-32 h-3 rounded bg-neutral-200" />
                  <div className="w-full h-11 rounded-xl bg-neutral-100" />
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-8">
              {/* ======================================================== */}
              {/* SECTION 1: BANK ACCOUNTS (Max 3) */}
              {/* ======================================================== */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-[#B8860B]" />
                      <span>Bank Accounts</span>
                      <span className="text-xs font-semibold text-[#6B7280]">
                        ({bankAccounts.length}/3)
                      </span>
                    </h2>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Members can transfer to any active account listed below
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddAccount}
                    disabled={bankAccounts.length >= 3}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-[#111111] disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add bank account</span>
                  </button>
                </div>

                {bankAccounts.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-neutral-200 text-center text-[#6B7280] bg-[#FAFAFA]">
                    <Building2 className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm font-semibold text-[#111111]">No bank accounts added</p>
                    <p className="text-xs mt-1 text-[#6B7280]">
                      Click &ldquo;Add bank account&rdquo; above to add your first bank details.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bankAccounts.map((account, index) => (
                      <div
                        key={account.tempId}
                        className="p-4 sm:p-5 rounded-2xl border border-neutral-200/90 bg-[#FAFAFA] space-y-4 transition-all"
                      >
                        {/* Card Header: Account #, Active Toggle, Remove Button */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-200/70">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="text-sm font-bold text-[#111111]">
                              {account.bank_name || `Bank Account #${index + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Active Switch */}
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                              <span className="text-xs font-medium text-[#6B7280]">
                                {account.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={account.is_active}
                                onClick={() =>
                                  handleUpdateAccount(account.tempId, 'is_active', !account.is_active)
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                                  account.is_active ? 'bg-[#111111]' : 'bg-neutral-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    account.is_active ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </label>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveAccount(account)}
                              className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Remove account"
                              aria-label="Remove bank account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Bank Name & Account Holder Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                              Bank Name
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <input
                                type="text"
                                required
                                value={account.bank_name}
                                onChange={(e) =>
                                  handleUpdateAccount(account.tempId, 'bank_name', e.target.value)
                                }
                                placeholder="e.g. Attijariwafa Bank, CIH Bank"
                                className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                              Account Holder
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                                <User className="w-4 h-4" />
                              </div>
                              <input
                                type="text"
                                required
                                value={account.account_holder}
                                onChange={(e) =>
                                  handleUpdateAccount(account.tempId, 'account_holder', e.target.value)
                                }
                                placeholder="Levelling Up Media"
                                className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        {/* RIB */}
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                            RIB (24 digits)
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                              <CreditCard className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              required
                              value={account.rib}
                              onChange={(e) =>
                                handleUpdateAccount(account.tempId, 'rib', e.target.value)
                              }
                              placeholder="007 780 0001234567890123 45"
                              className="w-full min-h-[44px] pl-10 pr-4 py-2 font-mono text-[16px] md:text-sm bg-white border border-neutral-200 rounded-xl text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 2: PRICE & CONTACT DETAILS */}
              {/* ======================================================== */}
              <div className="space-y-4 pt-4 border-t border-neutral-100">
                <h2 className="text-base sm:text-lg font-bold text-[#111111]">
                  Pricing & Contact
                </h2>

                {/* Price (MAD) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    Price (MAD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settings.price}
                    onChange={(e) => setSettings({ ...settings, price: Number(e.target.value) })}
                    placeholder="499"
                    required
                    className="w-full min-h-[44px] px-4 py-2.5 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                  />
                  <p className="text-[11px] text-[#6B7280] mt-1">
                    One-time lifetime membership amount in Moroccan Dirham.
                  </p>
                </div>

                {/* WhatsApp & Contact Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      value={settings.contact_whatsapp || ''}
                      onChange={(e) => setSettings({ ...settings, contact_whatsapp: e.target.value })}
                      placeholder="+212600000000"
                      className="w-full min-h-[44px] px-4 py-2.5 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={settings.contact_email || ''}
                      onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                      placeholder="contact@levellingup.com"
                      className="w-full min-h-[44px] px-4 py-2.5 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Save Changes CTA on mobile / Footer CTA on desktop */}
              <div className="md:pt-4 md:border-t md:border-neutral-100 md:flex md:justify-end">
                <div className="fixed md:static bottom-[calc(56px+env(safe-area-inset-bottom)+10px)] inset-x-4 z-30">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full md:w-auto min-h-[48px] md:min-h-0 px-6 py-3 rounded-xl bg-[#111111] text-white text-sm md:text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 shadow-soft-lg md:shadow-soft disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Saving changes...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Save changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Remove Account Confirmation */}
      <AdminConfirmDialog
        isOpen={Boolean(confirmRemoveAccount)}
        title="Remove bank account?"
        description={
          confirmRemoveAccount
            ? `Remove ${confirmRemoveAccount.bank_name || 'this bank account'} from your active accounts?`
            : ''
        }
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmRemoveAccount(null)}
      />
    </div>
  );
};
