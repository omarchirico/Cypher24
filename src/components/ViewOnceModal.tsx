import React, { useState, useEffect } from 'react';
import { X, Flame, EyeOff, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  mediaType: 'image' | 'video';
  mediaSrc: string;
  senderName: string;
  onCloseAndBurn: () => void;
}

export const ViewOnceModal: React.FC<Props> = ({
  isOpen,
  mediaType,
  mediaSrc,
  senderName,
  onCloseAndBurn,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(25);

  useEffect(() => {
    if (!isOpen) return;

    setSecondsRemaining(25);
    const timer = setInterval(() => {
      setSecondsRemaining((s) => {
        if (s <= 1) {
          clearInterval(timer);
          onCloseAndBurn();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onCloseAndBurn]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex flex-col items-center justify-between bg-black/95 backdrop-blur-xl p-4 select-none">
      {/* Top Header warning */}
      <div className="w-full max-w-2xl flex items-center justify-between py-2 text-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold text-xs">
            1x
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Visualizzazione Singola</h3>
            <p className="text-[10px] text-rose-400">
              Da {senderName} · Autodistruzione tra {secondsRemaining}s
            </p>
          </div>
        </div>

        <button
          onClick={onCloseAndBurn}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600 hover:text-white text-xs font-semibold text-slate-300 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Chiudi e Brucia</span>
        </button>
      </div>

      {/* Media content */}
      <div className="flex-1 w-full max-w-2xl flex items-center justify-center p-2 relative my-auto">
        {mediaType === 'image' ? (
          <img
            src={mediaSrc}
            alt="Foto a visualizzazione singola"
            className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
          />
        ) : (
          <video
            src={mediaSrc}
            controls
            autoPlay
            playsInline
            className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
          />
        )}
      </div>

      {/* Footer warning bar */}
      <div className="w-full max-w-md pb-safe text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
          <EyeOff className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Questo contenuto non potrà più essere visualizzato dopo la chiusura</span>
        </div>
      </div>
    </div>
  );
};
