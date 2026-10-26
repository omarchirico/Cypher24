import React from 'react';
import type { UserProfile } from '../types';
import { X, ShieldCheck, Key, Lock, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  peerUser: UserProfile;
  currentUser: UserProfile;
  safetyNumber: string;
  isVerified: boolean;
  onToggleVerified: () => void;
}

export const SafetyNumberModal: React.FC<Props> = ({
  isOpen,
  onClose,
  peerUser,
  currentUser,
  safetyNumber,
  isVerified,
  onToggleVerified,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-2xl p-6 text-slate-100 relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Codice di Sicurezza Cifrata</h3>
            <p className="text-xs text-slate-400">Verifica crittografica End-to-End</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Questo codice è calcolato combinando la chiave pubblica ECDH del tuo dispositivo con quella di <strong className="text-white">@{peerUser.userId}</strong>. Se entrambi vedete le stesse cifre, la vostra conversazione è protetta al 100% da intercettazioni (MitM).
        </p>

        {/* Safety Number Display */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-center tracking-widest text-emerald-400 text-sm sm:text-base font-bold select-all py-4">
          {safetyNumber || 'GENERAZIONE IN CORSO...'}
        </div>

        {/* Technical specs */}
        <div className="grid grid-cols-2 gap-2 my-4 text-[11px] text-slate-400">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
            <Key className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Curva: NIST P-256</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Cifrario: AES-GCM 256</span>
          </div>
        </div>

        {/* Verified switch */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 mt-4">
          <span className="text-xs text-slate-200 font-medium">Contatto Verificato</span>
          <button
            onClick={onToggleVerified}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isVerified
                ? 'bg-emerald-500 text-black'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isVerified ? 'Verificato' : 'Segna come verificato'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
};
