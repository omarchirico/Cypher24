import React, { useState, useRef } from 'react';
import type { AppTheme, AppLanguage } from '../types';
import { generateKeyPair } from '../crypto/e2e';
import { saveLocalIdentity, saveTheme } from '../crypto/storage';
import { saveLanguage, t } from '../i18n/translations';
import { ThemeSelector } from './ThemeSelector';
import { LanguageSelector } from './LanguageSelector';
import { compressUserPhoto, generateDefaultAvatar } from '../utils/avatar';
import { PWAInstallButton } from './PWAInstallButton';
import { apiUrl } from '../utils/api';
import { Sparkles, Camera, ArrowRight, Lock, Clock, Smartphone, Upload, Globe } from 'lucide-react';

interface Props {
  onCompleted: (identity: any) => void;
  initialTheme: AppTheme;
  initialLanguage: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
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

export const Onboarding: React.FC<Props> = ({
  onCompleted,
  initialTheme,
  initialLanguage,
  onLanguageChange,
}) => {
  const [userId, setUserId] = useState(() => generateRandomId());
  const [displayName, setDisplayName] = useState('');
  const [customPhoto, setCustomPhoto] = useState<string>('');
  const [theme, setTheme] = useState<AppTheme>(initialTheme);
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);
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

  const handleSelectLanguage = (newLang: AppLanguage) => {
    setLanguage(newLang);
    saveLanguage(newLang);
    onLanguageChange(newLang);
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

      // 2. Register public profile on server (if reachable)
      try {
        const res = await fetch(apiUrl('/api/users'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: cleanId,
            displayName: finalDisplayName,
            avatar: finalAvatar,
            publicKey: keyBundle.publicKeyJwk,
            language,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 400 && data.error) {
            throw new Error(data.error);
          }
        }
      } catch (netErr: any) {
        if (netErr?.message && !netErr.message.includes('fetch')) {
          throw netErr;
        }
        console.warn('Server registration skipped (offline/standalone):', netErr);
      }

      // 3. Save private key in device vault (IndexedDB)
      const identity = {
        userId: cleanId,
        displayName: finalDisplayName,
        avatar: finalAvatar,
        keys: keyBundle,
        theme,
        language,
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
      {/* Top Bar with Logo & PWA Notice */}
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_5ive2u5ive2u5ive_01e06a00.jpg"
              alt="Cypher24 Logo"
              className="w-10 h-10 rounded-2xl object-cover shadow-lg ring-2 ring-emerald-500/30"
            />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white block leading-tight">
              Cypher24
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              E2E · 24H WIPE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton currentLanguage={language} />
        </div>
      </header>

      {/* Main Card */}
      <main className="my-auto py-6">
        <div className="rounded-3xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header with App Logo Badge */}
          <div className="text-center space-y-3">
            <div className="inline-block relative">
              <img
                src="/assets/aistudio/Gemini_Generated_Image_5ive2u5ive2u5ive_01e06a00.jpg"
                alt="Cypher24 Emblem"
                className="w-20 h-20 rounded-3xl object-cover mx-auto shadow-2xl ring-2 ring-[var(--theme-accent-color)]/40"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {t('loginTitle', language)}
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {t('appSubtitle', language)}
            </p>
          </div>

          {/* Language Selection Bar */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('chooseLanguage', language)}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono uppercase">
                6 lingue supportate
              </span>
            </div>
            <LanguageSelector
              currentLanguage={language}
              onSelectLanguage={handleSelectLanguage}
            />
          </div>

          {/* Core Guarantees Banner */}
          <div className="grid grid-cols-3 gap-2.5 py-1 text-center text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <Lock className="w-4 h-4 text-emerald-400 mb-1.5" />
              <span className="font-semibold text-white">{t('zeroPassword', language)}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{t('zeroPasswordDesc', language)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <Clock className="w-4 h-4 text-sky-400 mb-1.5" />
              <span className="font-semibold text-white">{t('wipe24h', language)}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{t('wipe24hDesc', language)}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
              <Smartphone className="w-4 h-4 text-purple-400 mb-1.5" />
              <span className="font-semibold text-white">{t('iphoneReady', language)}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{t('iphoneReadyDesc', language)}</span>
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
                  title={t('photoProfile', language)}
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{t('photoProfile', language)}</span>
                  {customPhoto && (
                    <button
                      type="button"
                      onClick={() => setCustomPhoto('')}
                      className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                    >
                      {t('removePhoto', language)}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Foto da fotocamera o galleria (opzionale)
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
                    <span>{customPhoto ? t('changePhoto', language) : t('choosePhoto', language)}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ID Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  {t('chooseId', language)}
                </label>
                <button
                  type="button"
                  onClick={handleRandomizeId}
                  className="flex items-center gap-1 text-[11px] text-[var(--theme-accent-color)] hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{t('generateRandom', language)}</span>
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
                {t('idHelper', language)}
              </p>
            </div>

            {/* Optional Nickname / Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {t('displayName', language)}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Es. Marco, Alex, Anon..."
                className="w-full px-4 py-2.5 rounded-2xl bg-black/60 border border-white/15 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[var(--theme-accent-color)] transition"
              />
            </div>

            {/* Theme Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {t('chooseTheme', language)}
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
                <span>{t('creatingKeys', language)}</span>
              ) : (
                <>
                  <span>{t('enterApp', language)}</span>
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
