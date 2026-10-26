import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle } from 'lucide-react';

interface Props {
  variant?: 'button' | 'icon' | 'badge';
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed in standalone mode, show clean installed badge if needed or hide
  if (isInstalled) {
    if (variant === 'badge') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          Installata come App
        </span>
      );
    }
    return null;
  }

  // Chromium / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/60 px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
        title="Installa Cypher24"
      >
        <Download className="w-3.5 h-3.5 text-sky-400" />
        <span>Installa App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 px-3 py-1.5 text-xs font-medium transition active:scale-95 cursor-pointer"
          title="Istruzioni installazione iPhone"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          <span>Installa su iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Installa su iPhone</h3>
                  <p className="text-xs text-slate-400">Accedi a schermo intero come una vera app</p>
                </div>
              </div>

              <div className="space-y-3.5 my-4 text-xs text-slate-300">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">1. Tocca il tasto Condividi</p>
                    <p className="text-slate-400 mt-0.5">Nella barra inferiore di Safari (icona quadrata con freccia verso l'alto).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">2. "Aggiungi a schermata Home"</p>
                    <p className="text-slate-400 mt-0.5">Scorri le opzioni del menu e tocca <strong>Aggiungi alla schermata Home</strong>.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition cursor-pointer"
              >
                Ho capito
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback triggerable from header or settings
  return (
    <button
      onClick={() => setShowIOSGuide(true)}
      className="flex items-center gap-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700/40 px-3 py-1.5 text-xs font-medium transition cursor-pointer"
    >
      <Smartphone className="w-3.5 h-3.5 text-sky-400" />
      <span>Usa come Web App</span>
    </button>
  );
};
