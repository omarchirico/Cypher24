import React, { useEffect } from 'react';
import { Bell, X, ArrowRight, MessageSquare } from 'lucide-react';

export interface ToastNotificationData {
  id: string;
  title: string;
  body: string;
  avatar?: string;
  target: { type: 'direct'; id: string } | { type: 'group'; id: string };
}

interface Props {
  toast: ToastNotificationData | null;
  onClose: () => void;
  onOpenTarget: (target: { type: 'direct'; id: string } | { type: 'group'; id: string }) => void;
}

export const InAppNotificationToast: React.FC<Props> = ({ toast, onClose, onOpenTarget }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 w-full max-w-sm px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="pointer-events-auto flex items-center gap-3 p-3 rounded-2xl bg-[var(--theme-surface-elevated)]/95 backdrop-blur-xl border border-[var(--theme-border)] shadow-2xl shadow-black/60 text-slate-100">
        <div className="relative shrink-0">
          {toast.avatar ? (
            <img
              src={toast.avatar}
              alt={toast.title}
              className="w-10 h-10 rounded-xl object-cover border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
          )}
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
        </div>

        <button
          type="button"
          onClick={() => {
            onOpenTarget(toast.target);
            onClose();
          }}
          className="flex-1 min-w-0 text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white truncate group-hover:text-[var(--theme-accent-color)] transition">
              {toast.title}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Adesso</span>
          </div>
          <p className="text-xs text-slate-300 truncate mt-0.5">
            {toast.body}
          </p>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
          title="Chiudi notifica"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
