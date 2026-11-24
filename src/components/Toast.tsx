import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-neutral-800 flex-shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-white',
    error: 'border-rose-200 bg-white',
    info: 'border-neutral-200 bg-white',
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-soft-lg transition-all animate-in fade-in slide-in-from-bottom-2 ${borders[toast.type]}`}
      role="alert"
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="text-sm font-semibold text-neutral-900 leading-tight mb-0.5">
            {toast.title}
          </h4>
        )}
        <p className="text-xs text-neutral-600 leading-relaxed break-words">
          {toast.message}
        </p>
      </div>
      <button
        onClick={onClose}
        className="text-neutral-400 hover:text-neutral-600 transition-colors p-0.5 rounded-lg"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

