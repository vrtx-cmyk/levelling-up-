import { supabase } from './supabase';
import type { Payment } from '../types';

/**
 * Resolves either an external URL or a private storage path in `payment-screenshots`.
 */
export async function resolveReceiptUrl(screenshotPath: string): Promise<string> {
  if (!screenshotPath) {
    throw new Error('Receipt file path is missing.');
  }
  if (screenshotPath.startsWith('http://') || screenshotPath.startsWith('https://')) {
    return screenshotPath;
  }

  const { data, error } = await supabase.storage
    .from('payment-screenshots')
    .createSignedUrl(screenshotPath, 3600);

  if (error) {
    console.error('[adminPayments] Error generating signed receipt URL:', error);
    throw new Error(error.message);
  }
  if (!data?.signedUrl) {
    throw new Error('Could not load receipt image.');
  }
  return data.signedUrl;
}

/**
 * Approves a pending payment and activates the member profile.
 */
export async function approvePaymentRequest(payment: Payment): Promise<void> {
  const { error: rpcError } = await supabase.rpc('approve_payment', {
    p_payment_id: payment.id,
  });

  if (rpcError) {
    console.warn('[adminPayments] RPC approve_payment failed, falling back to direct update:', rpcError);
    const { error: payErr } = await supabase
      .from('payments')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', payment.id);

    if (payErr) throw payErr;

    const { error: profErr } = await supabase
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', payment.user_id);

    if (profErr) throw profErr;
  }
}

/**
 * Rejects a pending payment with an optional reason and updates the user profile status.
 */
export async function rejectPaymentRequest(
  payment: Payment,
  optionalReason?: string
): Promise<void> {
  const cleanReason = optionalReason?.trim() || null;

  const { error: rpcError } = await supabase.rpc('reject_payment', {
    p_payment_id: payment.id,
    p_reason: cleanReason,
  });

  if (rpcError) {
    console.warn('[adminPayments] RPC reject_payment failed, falling back to direct update:', rpcError);
    const { error: payErr } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        rejection_reason: cleanReason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (payErr) throw payErr;

    const { error: profErr } = await supabase
      .from('profiles')
      .update({ status: 'rejected' })
      .eq('id', payment.user_id);

    if (profErr) throw profErr;
  }
}
