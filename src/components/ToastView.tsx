import { useEffect } from "react";
import type { Toast } from "../useLedger";

export function ToastView({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const ms = toast.tone === "info" ? 2400 : 4000;
    const t = setTimeout(onDismiss, ms);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <button type="button" key={toast.id} className={`toast toast--${toast.tone}`} onClick={onDismiss}>
          {toast.messages.map((m, i) => (
            <span key={i} className="toast-line">
              {m}
            </span>
          ))}
        </button>
      )}
    </div>
  );
}
