import React from 'react';
import type { AppTheme } from '../types';
import { Check } from 'lucide-react';

interface Props {
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
}

interface ThemeOption {
  id: AppTheme;
  label: string;
  sublabel: string;
  bgPreview: string;
  accentPreview: string;
  borderPreview: string;
}

const THEMES: ThemeOption[] = [
  {
    id: 'nero',
    label: 'Nero',
    sublabel: 'Stealth OLED',
    bgPreview: '#000000',
    accentPreview: '#f8fafc',
    borderPreview: '#27272a',
  },
  {
    id: 'verde',
    label: 'Verde',
    sublabel: 'Cyber Matrix',
    bgPreview: '#020a05',
    accentPreview: '#10b981',
    borderPreview: '#134e2b',
  },
  {
    id: 'blu',
    label: 'Blu',
    sublabel: 'Cobalt Night',
    bgPreview: '#020612',
    accentPreview: '#3b82f6',
    borderPreview: '#1e3a8a',
  },
  {
    id: 'viola',
    label: 'Viola',
    sublabel: 'Neon Amethyst',
    bgPreview: '#070213',
    accentPreview: '#a855f7',
    borderPreview: '#581c87',
  },
];

export const ThemeSelector: React.FC<Props> = ({ currentTheme, onSelectTheme }) => {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {THEMES.map((t) => {
        const isSelected = currentTheme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTheme(t.id)}
            className={`group relative flex flex-col p-3 rounded-2xl text-left border transition-all cursor-pointer ${
              isSelected
                ? 'border-white/50 bg-white/5 shadow-md shadow-black/50 scale-[1.02]'
                : 'border-white/10 hover:border-white/25 bg-black/30'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2.5">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center border shadow-inner"
                style={{
                  backgroundColor: t.bgPreview,
                  borderColor: t.borderPreview,
                }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: t.accentPreview }}
                />
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </div>

            <span className="text-xs font-bold text-white capitalize">{t.label}</span>
            <span className="text-[11px] text-slate-400 mt-0.5">{t.sublabel}</span>
          </button>
        );
      })}
    </div>
  );
};
