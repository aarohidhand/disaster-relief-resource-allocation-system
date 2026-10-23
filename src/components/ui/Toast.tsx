import { useEffect } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  tone: 'success' | 'warning';
  text: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div
      className="pointer-events-none fixed bottom-5 left-1/2 z-[80] w-[min(92vw,28rem)] -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-md border border-slate-700 bg-gov-navy px-4 py-3 text-sm text-white shadow-modal"
        >
          {toast.tone === 'success' ? (
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          )}
          <p className="flex-1 leading-snug">{toast.text}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="-mr-1 rounded p-0.5 text-slate-400 hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
