import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'MAD'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    numberingSystem: 'latn',
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function formatDate(dateString: string, locale: string = 'en'): string {
  try {
    const d = new Date(dateString);
    const intlLocale = locale === 'ar' ? 'ar-MA-u-nu-latn' : locale === 'fr' ? 'fr-FR-u-nu-latn' : 'en-GB-u-nu-latn';
    return new Intl.DateTimeFormat(intlLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      numberingSystem: 'latn',
    }).format(d);
  } catch {
    return dateString;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for non-https or older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
