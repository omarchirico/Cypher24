import React, { useState } from 'react';
import { Download, Check, FileCode, Sparkles } from 'lucide-react';
import type { AppLanguage } from '../types';
import { t } from '../i18n/translations';
import { apiUrl } from '../utils/api';

interface Props {
  currentLanguage?: AppLanguage;
  variant?: 'compact' | 'card' | 'badge';
  className?: string;
}

export const DownloadHtmlButton: React.FC<Props> = ({
  currentLanguage = 'it',
  variant = 'compact',
  className = '',
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloading) return;

    try {
      setDownloading(true);

      // Attempt to download the single-file HTML bundle from server
      const downloadEndpoint = apiUrl('/api/download-app');
      const response = await fetch(downloadEndpoint);

      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'cypher24-standalone.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } else {
        // Fallback: direct browser navigation to file
        const directLink = apiUrl('/cypher24.html');
        window.open(directLink, '_blank');
      }

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3500);
    } catch (err) {
      console.warn('Download error, trying direct navigation:', err);
      window.location.href = apiUrl('/cypher24.html');
    } finally {
      setDownloading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className={`p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/30 transition cursor-pointer flex items-center justify-center relative ${className}`}
        title={t('downloadHtml', currentLanguage)}
      >
        {downloaded ? (
          <Check className="w-4 h-4 text-emerald-400 animate-in zoom-in" />
        ) : (
          <Download className={`w-4 h-4 ${downloading ? 'animate-bounce text-emerald-400' : ''}`} />
        )}
      </button>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer ${className}`}
      >
        {downloaded ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('copied', currentLanguage)}</span>
          </>
        ) : (
          <>
            <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{t('downloadHtmlBtn', currentLanguage)}</span>
          </>
        )}
      </button>
    );
  }

  // 'card' variant for Settings / Profile modal
  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
            <FileCode className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>{t('downloadHtml', currentLanguage)}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-normal">
              .HTML Standalone
            </span>
          </p>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {t('downloadHtmlDesc', currentLanguage)}
        </p>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
      >
        {downloaded ? (
          <>
            <Check className="w-4 h-4 text-black stroke-[3]" />
            <span>Scaricato!</span>
          </>
        ) : (
          <>
            <Download className={`w-4 h-4 text-black stroke-[2.5] ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? 'Generazione...' : t('downloadHtmlBtn', currentLanguage)}</span>
          </>
        )}
      </button>
    </div>
  );
};
