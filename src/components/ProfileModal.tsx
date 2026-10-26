import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile, AppTheme } from '../types';
import { ThemeSelector } from './ThemeSelector';
import { compressUserPhoto, generateDefaultAvatar } from '../utils/avatar';
import { PWAInstallButton } from './PWAInstallButton';
import {
  getNotificationSettings,
  saveNotificationSettings,
  getSystemNotificationPermission,
  requestSystemNotificationPermission,
  triggerSystemNotification,
  triggerHapticFeedback,
  NotificationSettings,
} from '../utils/notifications';
import { playReceiveSound } from '../utils/audio';
import {
  X,
  Camera,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Upload,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import QRCode from 'qrcode';

interface Props {
  user: UserProfile;
  currentTheme: AppTheme;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProfile: (displayName: string, avatar: string) => Promise<void>;
  onSelectTheme: (theme: AppTheme) => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<Props> = ({
  user,
  currentTheme,
  isOpen,
  onClose,
  onUpdateProfile,
  onSelectTheme,
  onLogout,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatar, setAvatar] = useState(user.avatar || generateDefaultAvatar(user.userId));
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification states
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(() => getNotificationSettings());
  const [sysPermission, setSysPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>(() =>
    getSystemNotificationPermission()
  );
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    setSysPermission(getSystemNotificationPermission());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleOpenQr = async () => {
    try {
      const url = `${window.location.origin}/?chatWith=${encodeURIComponent(user.userId)}`;
      const qr = await QRCode.toDataURL(url, {
        margin: 2,
        width: 320,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(qr);
      setShowQrModal(true);
    } catch (err) {
      console.error('Failed to generate QR:', err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);
      const compressed = await compressUserPhoto(file, 280, 0.85);
      setAvatar(compressed);
      await onUpdateProfile(displayName, compressed);
    } catch (err) {
      console.error('Failed to compress photo:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaultAvatar = async () => {
    const defaultAv = generateDefaultAvatar(user.userId);
    setAvatar(defaultAv);
    await onUpdateProfile(displayName, defaultAv);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setIsSaving(true);
    await onUpdateProfile(displayName.trim(), avatar);
    setIsSaving(false);
  };

  // Notification Handlers
  const handleToggleSystemNotifs = async () => {
    if (sysPermission !== 'granted') {
      const granted = await requestSystemNotificationPermission();
      setSysPermission(granted ? 'granted' : 'denied');
      if (!granted) return;
    }

    const updated = { ...notifSettings, systemEnabled: !notifSettings.systemEnabled };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleToggleSound = () => {
    const updated = { ...notifSettings, soundEnabled: !notifSettings.soundEnabled };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleTogglePreview = () => {
    const updated = { ...notifSettings, previewEnabled: !notifSettings.previewEnabled };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleSendTestNotification = () => {
    triggerHapticFeedback();
    if (notifSettings.soundEnabled) {
      playReceiveSound();
    }
    triggerSystemNotification({
      title: 'Cypher24 · Notifica di Prova',
      body: notifSettings.previewEnabled
        ? 'Le notifiche per i nuovi messaggi funzionano correttamente!'
        : 'Nuovo messaggio cifrato ricevuto',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-2xl p-6 relative my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Profilo & Notifiche</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestisci la tua foto profilo, le notifiche per nuovi messaggi e i temi personalizzati
          </p>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-black/40 border border-white/5">
            <div className="relative group shrink-0">
              <img
                src={avatar}
                alt={user.displayName}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold cursor-pointer"
                title="Cambia foto profilo"
              >
                <Camera className="w-6 h-6 mb-1" />
                <span>Carica</span>
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-sm font-semibold text-white">Foto Profilo</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Carica una foto dalla galleria o fotocamera
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
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
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--theme-accent-color)]/20 hover:bg-[var(--theme-accent-color)]/30 text-[var(--theme-accent-color)] text-xs font-semibold border border-[var(--theme-accent-color)]/30 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Scegli Foto</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefaultAvatar}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Avatar Grafico</span>
                </button>
              </div>
            </div>
          </div>

          {/* User ID Section */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Il Tuo ID Univoco (senza password)</span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" /> E2E Attivo
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/10 font-mono text-sm font-semibold text-white tracking-wider truncate select-all">
                @{user.userId}
              </div>

              <button
                onClick={handleCopyId}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
                title="Copia ID"
              >
                {copiedId ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={handleOpenQr}
                className="p-2.5 rounded-xl bg-[var(--theme-accent-color)]/20 hover:bg-[var(--theme-accent-color)]/30 text-[var(--theme-accent-color)] border border-[var(--theme-accent-color)]/40 transition active:scale-95 cursor-pointer"
                title="Mostra QR Code per iPhone / Condividi"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* NOTIFICATION SETTINGS SECTION */}
          {/* ============================================================ */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[var(--theme-accent-color)]/20 text-[var(--theme-accent-color)]">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Notifiche Nuovi Messaggi</h3>
                  <p className="text-[11px] text-slate-400">Ricevi avvisi sonori e di sistema</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendTestNotification}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] text-slate-200 transition cursor-pointer"
                title="Prova la notifica"
              >
                {testSent ? <Check className="w-3 h-3 text-emerald-400" /> : <Sparkles className="w-3 h-3 text-amber-400" />}
                <span>{testSent ? 'Inviata!' : 'Test Notifica'}</span>
              </button>
            </div>

            {/* Toggle 1: System / Browser Push Notification */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="min-w-0 pr-3">
                <span className="text-xs font-semibold text-white block">Notifiche del Dispositivo</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {sysPermission === 'denied'
                    ? '⚠️ Bloccate nel browser. Abilita le notifiche nelle impostazioni del sito.'
                    : sysPermission === 'unsupported'
                    ? 'Non supportate da questo browser'
                    : 'Avviso a schermo quando l\'app è in background o minimizzata'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleSystemNotifs}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  notifSettings.systemEnabled && sysPermission === 'granted'
                    ? 'bg-emerald-500'
                    : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                    notifSettings.systemEnabled && sysPermission === 'granted' ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Sound Notification */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-1.5">
                  {notifSettings.soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className="text-xs font-semibold text-white">Suono Notifiche</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Riproduci un segnale acustico alla ricezione di ogni messaggio
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleSound}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  notifSettings.soundEnabled ? 'bg-sky-500' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                    notifSettings.soundEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3: Privacy Mode / Anteprima */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-1.5">
                  {notifSettings.previewEnabled ? (
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span className="text-xs font-semibold text-white">Anteprima Riservata</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {notifSettings.previewEnabled
                    ? 'Mostra mittente e anteprima nelle notifiche'
                    : 'Modalità Privacy: nascondi il testo e mostra solo "Nuovo messaggio cifrato"'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleTogglePreview}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  notifSettings.previewEnabled ? 'bg-purple-500' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                    notifSettings.previewEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Display Name Edit Form */}
          <form onSubmit={handleSaveName} className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Nome Visualizzato
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={30}
                placeholder="Es. Marco Rossi"
                className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--theme-accent-color)]"
              />
              <button
                type="submit"
                disabled={isSaving || displayName === user.displayName}
                className="px-4 py-2 rounded-xl bg-[var(--theme-accent-color)] text-black font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition cursor-pointer"
              >
                Salva
              </button>
            </div>
          </form>

          {/* Theme Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Tema Personalizzato
              </label>
              <span className="text-[11px] text-slate-400 capitalize">
                Attuale: {currentTheme}
              </span>
            </div>
            <ThemeSelector currentTheme={currentTheme} onSelectTheme={onSelectTheme} />
          </div>

          {/* Installation on iPhone / Standalone */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">App Web per iPhone & Desktop</p>
              <p className="text-[11px] text-slate-400">Installa su schermata Home per notifiche e schermo intero</p>
            </div>
            <PWAInstallButton />
          </div>

          {/* Logout / Switch ID */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition py-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Esci o cambia ID su questo dispositivo</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal for Mobile Scan */}
      {showQrModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-xs rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center text-white relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold">Scansiona con iPhone</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Inquadra con la fotocamera per iniziare a chattare all'istante
            </p>

            <div className="p-3 bg-white rounded-2xl inline-block shadow-xl">
              <img src={qrDataUrl} alt="QR Code ID" className="w-56 h-56 mx-auto rounded-lg" />
            </div>

            <div className="mt-4 font-mono text-xs text-slate-300">
              ID: <span className="font-bold text-white">@{user.userId}</span>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
