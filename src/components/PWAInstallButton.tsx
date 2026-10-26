import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { AppLanguage } from '../types';
import { t } from '../i18n/translations';
import {
  Download,
  Share,
  PlusSquare,
  X,
  Smartphone,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  Sparkles,
} from 'lucide-react';

interface Props {
  variant?: 'button' | 'icon' | 'badge' | 'full';
  currentLanguage?: AppLanguage;
  className?: string;
}

export const PWAInstallButton: React.FC<Props> = ({
  variant = 'button',
  currentLanguage = 'it',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>(() => {
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'desktop';
  });
  const [copiedLink, setCopiedLink] = useState(false);

  // If already running in standalone mode, display badge or hide
  if (isInstalled) {
    if (variant === 'badge' || variant === 'full') {
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 ${className}`}>
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('pwaInstalled', currentLanguage)}</span>
        </span>
      );
    }
    return null;
  }

  const handleButtonClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        // If user cancelled prompt or browser didn't handle it, open guide
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenExternal = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Trigger Button Variants */}
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={handleButtonClick}
          className={`p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-sky-400 hover:text-white border border-slate-700/60 shadow-sm transition active:scale-95 cursor-pointer ${className}`}
          title={t('useAsWebApp', currentLanguage)}
        >
          <Smartphone className="w-4 h-4" />
        </button>
      ) : variant === 'full' ? (
        <button
          type="button"
          onClick={handleButtonClick}
          className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold py-2.5 px-4 text-xs shadow-md transition active:scale-98 cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>{isInstallable ? t('installApp', currentLanguage) : t('useAsWebApp', currentLanguage)}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleButtonClick}
          className={`flex items-center gap-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700/80 hover:border-sky-500/50 px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer ${className}`}
          title={t('useAsWebApp', currentLanguage)}
        >
          {isInstallable ? (
            <Download className="w-3.5 h-3.5 text-sky-400" />
          ) : (
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          )}
          <span>{isInstallable ? t('installApp', currentLanguage) : t('useAsWebApp', currentLanguage)}</span>
        </button>
      )}

      {/* Universal PWA Installation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with App Logo */}
            <div className="flex items-center gap-3.5 mb-5 pr-8">
              <img
                src="/assets/aistudio/Gemini_Generated_Image_5ive2u5ive2u5ive_01e06a00.jpg"
                alt="Cypher24"
                className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-sky-500/30 shrink-0"
              />
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                  {t('pwaTitle', currentLanguage)}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {t('pwaSubtitle', currentLanguage)}
                </p>
              </div>
            </div>

            {/* 1-Click Native Install Button (if browser supports prompt directly) */}
            {isInstallable && (
              <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/40">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setShowModal(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition active:scale-98 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('pwaInstallNow', currentLanguage)}</span>
                </button>
              </div>
            )}

            {/* Iframe or Embedded Warning Note */}
            {isInIframe && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="flex-1">
                  <p className="leading-snug">{t('pwaIframeNote', currentLanguage)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenExternal}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-[11px] transition cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{t('pwaOpenInTab', currentLanguage)}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Device / Platform Tabs */}
            <div className="flex p-1 rounded-xl bg-slate-950/80 border border-slate-800 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{t('pwaIosTab', currentLanguage)}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{t('pwaAndroidTab', currentLanguage)}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'desktop'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>{t('pwaDesktopTab', currentLanguage)}</span>
              </button>
            </div>

            {/* Step-by-Step Instructions by Tab */}
            <div className="space-y-3 mb-5">
              {activeTab === 'ios' && (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
                      <Share className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{t('pwaIosStep1', currentLanguage)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('pwaIosStep1Desc', currentLanguage)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{t('pwaIosStep2', currentLanguage)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('pwaIosStep2Desc', currentLanguage)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{t('pwaIosStep3', currentLanguage)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('pwaIosStep3Desc', currentLanguage)}</p>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'android' && (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{t('pwaAndroidStep1', currentLanguage)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('pwaAndroidStep1Desc', currentLanguage)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{t('pwaAndroidStep2', currentLanguage)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('pwaAndroidStep2Desc', currentLanguage)}</p>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'desktop' && (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{t('pwaDesktopStep1', currentLanguage)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('pwaDesktopStep1Desc', currentLanguage)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{t('pwaDesktopStep2', currentLanguage)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('pwaDesktopStep2Desc', currentLanguage)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions (Copy Link & Open Browser) */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedLink ? t('copied', currentLanguage) : t('pwaCopyLink', currentLanguage)}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenExternal}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('pwaOpenInTab', currentLanguage)}</span>
              </button>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full mt-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition cursor-pointer"
            >
              {t('pwaClose', currentLanguage)}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
