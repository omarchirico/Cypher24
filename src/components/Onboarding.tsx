import React, { useState, useRef } from 'react';
import type { AppTheme } from '../types';
import { generateKeyPair } from '../crypto/e2e';
import { saveLocalIdentity, saveTheme } from '../crypto/storage';
import { ThemeSelector } from './ThemeSelector';
import { compressUserPhoto, generateDefaultAvatar } from '../utils/avatar';
import { PWAInstallButton } from './PWAInstallButton';
import { Shield, Sparkles, Camera, ArrowRight, Lock, Clock, Smartphone, Upload } from 'lucide-react';

interface Props {
  onCompleted: (identity: any) => void;
  initialTheme: AppTheme;
}

const RANDOM_NAMES = [
  'ombra', 'cypher', 'zenith', 'phantom', 'arcano',
  'nexus', 'kryptos', 'aether', 'zero', 'mirage',
  'pulsar', 'vortex', 'specter', 'aurora', 'nebula'
];

function generateRandomId(): string {
  const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${name}_${num}`;
}

export const Onboarding: React.FC<Props> = ({ onCompleted, initialTheme }) => {
  const [userId, setUserId] = useState(() => generateRandomId());
  const [displayName, setDisplayName] = useState('');
  const [customPhoto, setCustomPhoto] = useState<string>('');
  const [theme, setTheme] = useState<AppTheme>(initialTheme);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRandomizeId = () => {
    setUserId(generateRandomId());
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressUserPhoto(file, 280, 0.85);
      setCustomPhoto(compressed);
    } catch (err) {
      console.error('Failed to compress photo:', err);
    }
  };

  const handleSelectTheme = (newTheme: AppTheme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (!cleanId || cleanId.length < 3) {
      setError('Inserisci un ID di almeno 3 caratteri (lettere, numeri, _ o -)');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Generate real Web Crypto P-256 ECDH Keypair locally on device
      const keyBundle = await generateKeyPair();

      const finalAvatar = customPhoto || generateDefaultAvatar(cleanId);
      const finalDisplayName = displayName.trim() || cleanId;

      // 2. Register public profile on server
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: cleanId,
          displayName: finalDisplayName,
          avatar: finalAvatar,
          publicKey: keyBundle.publicKeyJwk,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Errore durante la registrazione ID');
      }

      // 3. Save private key in device vault (IndexedDB)
      const identity = {
        userId: cleanId,
        displayName: finalDisplayName,
        avatar: finalAvatar,
        keys: keyBundle,
        theme,
      };

      await saveLocalIdentity(identity);
      onCompleted(identity);
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Impossibile creare l\'ID. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  const previewAvatar = customPhoto || generateDefaultAvatar(userId || 'user');

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Top Bar with PWA Notice */}
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-sky-400 to-purple-500 p-[2px]">
            <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Cypher24</span>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
        </div>
      </header>

      {/* Main Card */}
      <main className="my-auto py-8">
        <div className="rounded-3xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Messaggistica Privata a 24 Ore
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Nessuna password, nessuna email. Crea un ID anonimo protetto da crittografia end-to-end con autodistruzione totale dei messaggi.
            </p>
          </div>

          {/* Core Guarantees Banner */}
          <div className="grid grid-cols-3 gap-2.5 py-2 text-center text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <Lock className="w-4 h-4 text-emerald-400 mb-1.5" />
              <span className="font-semibold text-white">Zero Password</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Basta solo un ID</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <Clock className="w-4 h-4 text-sky-400 mb-1.5" />
              <span className="font-semibold text-white">Wipe in 24h</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Messaggi autodistrutti</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <Smartphone className="w-4 h-4 text-purple-400 mb-1.5" />
              <span className="font-semibold text-white">Su iPhone & Web</span>
              <span className="text-[10px] text-slate-400 mt-0.5">PWA istantanea</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo Setup */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/40 border border-white/5">
              <div className="relative group shrink-0">
                <img
                  src={previewAvatar}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                  title="Carica foto profilo"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Foto Profilo (Opzionale)</span>
                  {customPhoto && (
                    <button
                      type="button"
                      onClick={() => setCustomPhoto('')}
                      className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Puoi caricare una foto dal tuo dispositivo o fotocamera
                </p>
                <div className="mt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-200 border border-white/10 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{customPhoto ? 'Cambia foto' : 'Scegli foto profilo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ID Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Scegli il tuo ID Univoco *
                </label>
                <button
                  type="button"
                  onClick={handleRandomizeId}
                  className="flex items-center gap-1 text-[11px] text-[var(--theme-accent-color)] hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Genera Casuale</span>
                </button>
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-500 font-mono text-sm font-bold">@</span>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="il_tuo_id"
                  className="w-full pl-8 pr-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white font-mono text-sm tracking-wide placeholder-slate-600 focus:outline-none focus:border-[var(--theme-accent-color)] transition"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                I tuoi contatti utilizzeranno questo ID per trovarti e avviare conversazioni cifrate.
              </p>
            </div>

            {/* Optional Nickname / Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Nome o Pseudonimo (Opzionale)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Es. Anon, Marco, Alex..."
                className="w-full px-4 py-2.5 rounded-2xl bg-black/60 border border-white/15 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[var(--theme-accent-color)] transition"
              />
            </div>

            {/* Theme Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Scegli il Tema: Nero, Verde, Blu o Viola
              </label>
              <ThemeSelector currentTheme={theme} onSelectTheme={handleSelectTheme} />
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isLoading || !userId.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Creazione chiavi crittografiche...</span>
              ) : (
                <>
                  <span>Entra in Cypher24</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-4">
        Crittografia End-to-End Web Crypto (ECDH P-256 & AES-GCM 256-bit). Messaggi eliminati dopo 24h.
      </footer>
    </div>
  );
};
