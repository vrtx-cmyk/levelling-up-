import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import type { Settings } from '../../types';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    rib: '007 780 0001234567890123 45',
    account_holder: 'Levelling Up Media',
    bank_name: 'Attijariwafa Bank',
    price: 499,
    contact_whatsapp: '+212600000000',
    contact_email: 'contact@levellingup.com',
  });

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  const loadSettings = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error: sErr } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();

      if (sErr) {
        console.error('[AdminSettings] Error fetching settings:', sErr);
        setLoadError('Could not load settings.');
        error('Could not load settings.');
      } else if (data) {
        setSettings(data);
      }
    } catch (err: any) {
      console.error('[AdminSettings] Unexpected error loading settings:', err);
      setLoadError('Failed to load settings. Please try again.');
      error('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error: updErr } = await supabase.from('settings').upsert({
        id: 1,
        rib: settings.rib.trim(),
        account_holder: settings.account_holder.trim(),
        bank_name: settings.bank_name?.trim() || null,
        price: Number(settings.price),
        contact_whatsapp: settings.contact_whatsapp?.trim() || null,
        contact_email: settings.contact_email?.trim() || null,
        updated_at: new Date().toISOString(),
      });

      if (updErr) {
        throw updErr;
      }

      success('Payment & contact settings updated successfully!', 'Settings Saved');
    } catch (err: any) {
      console.error('[AdminSettings] Save error:', err);
      error(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 md:space-y-6 pb-20 md:pb-0">
      {/* Page Header */}
      <div>
        <h1 className="hidden md:block text-2xl font-bold tracking-tight text-[#111111]">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] md:mt-1">
          Bank details and contact info displayed on the payment activation page
        </p>
      </div>

      {loadError && !loading && (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3 shadow-soft max-w-3xl">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
          <p className="text-sm font-semibold text-[#111111]">{loadError}</p>
          <button
            type="button"
            onClick={loadSettings}
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
              {[1, 2, 3, 4, 5, 6].map((sk) => (
                <div key={sk} className="space-y-2">
                  <div className="w-32 h-3 rounded bg-neutral-200" />
                  <div className="w-full h-11 rounded-xl bg-neutral-100" />
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5 md:space-y-6">
              {/* Account Holder */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                  Account Holder
                </label>
                <input
                  type="text"
                  value={settings.account_holder}
                  onChange={(e) => setSettings({ ...settings, account_holder: e.target.value })}
                  placeholder="Levelling Up Media"
                  required
                  className="w-full min-h-[44px] px-4 py-2.5 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                />
              </div>

              {/* RIB */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                  RIB
                </label>
                <input
                  type="text"
                  value={settings.rib}
                  onChange={(e) => setSettings({ ...settings, rib: e.target.value })}
                  placeholder="007 780 0001234567890123 45"
                  required
                  className="w-full min-h-[44px] px-4 py-2.5 font-mono text-[16px] md:text-sm bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                />
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Enter the full 24-digit RIB with spaces for readability.
                </p>
              </div>

              {/* Bank Name & Price (single column < 768px) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={settings.bank_name || ''}
                    onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                    placeholder="e.g. Attijariwafa Bank, CIH"
                    className="w-full min-h-[44px] px-4 py-2.5 bg-[#FAFAFA] border border-neutral-200 rounded-xl text-[16px] md:text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                  />
                </div>

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
                </div>
              </div>

              {/* WhatsApp & Contact Email (single column < 768px) */}
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
    </div>
  );
};
