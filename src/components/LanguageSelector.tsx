import React from 'react';
import type { AppLanguage } from '../types';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';
import { Globe, Check } from 'lucide-react';

interface Props {
  currentLanguage: AppLanguage;
  onSelectLanguage: (lang: AppLanguage) => void;
  compact?: boolean;
}

export const LanguageSelector: React.FC<Props> = ({
  currentLanguage,
  onSelectLanguage,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = currentLanguage === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => onSelectLanguage(lang.code)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-white/20 text-white shadow-xs font-semibold border border-white/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
              title={`${lang.name} (${lang.nativeName})`}
            >
              <span>{lang.flag}</span>
              <span className="uppercase text-[11px] font-mono">{lang.code}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isSelected = currentLanguage === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => onSelectLanguage(lang.code)}
            className={`flex items-center justify-between p-2.5 rounded-2xl border text-left transition cursor-pointer active:scale-98 ${
              isSelected
                ? 'bg-[var(--theme-accent-color)]/15 border-[var(--theme-accent-color)]/60 text-white shadow-sm ring-1 ring-[var(--theme-accent-color)]/40'
                : 'bg-black/40 border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0" role="img" aria-label={lang.name}>
                {lang.flag}
              </span>
              <div className="min-w-0">
                <span className="block text-xs font-bold truncate text-white">
                  {lang.nativeName}
                </span>
                <span className="block text-[10px] text-slate-400 truncate">
                  {lang.name}
                </span>
              </div>
            </div>

            {isSelected && (
              <div className="w-4 h-4 rounded-full bg-[var(--theme-accent-color)] text-black flex items-center justify-center shrink-0 ml-1">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
