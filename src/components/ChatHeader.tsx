import React, { useState } from 'react';
import type { UserProfile, GroupChat, AppLanguage } from '../types';
import { t } from '../i18n/translations';
import { ArrowLeft, ShieldCheck, Flame, Users, Clock, Info } from 'lucide-react';

interface Props {
  target: { type: 'direct'; user: UserProfile } | { type: 'group'; group: GroupChat };
  isVerified?: boolean;
  onBack: () => void;
  onOpenSafetyNumber?: () => void;
  onOpenGroupInfo?: () => void;
  onBurnConversation: () => void;
  currentLanguage?: AppLanguage;
}

export const ChatHeader: React.FC<Props> = ({
  target,
  isVerified = false,
  onBack,
  onOpenSafetyNumber,
  onOpenGroupInfo,
  onBurnConversation,
  currentLanguage = 'it',
}) => {
  const [showConfirmBurn, setShowConfirmBurn] = useState(false);

  const isGroup = target.type === 'group';
  const name = isGroup ? target.group.name : target.user.displayName;
  const avatar = isGroup ? target.group.avatar : target.user.avatar;
  const isOnline = !isGroup && Date.now() - target.user.lastSeen < 2 * 60 * 1000;

  return (
    <div className="h-16 px-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/90 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
      {/* Left side: Back button (mobile) + Contact/Group details */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="lg:hidden p-2 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Indietro"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="relative shrink-0">
          <img
            src={avatar}
            alt={name}
            className="w-10 h-10 rounded-2xl object-cover border border-white/15"
          />
          {isOnline && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black"
              title={t('onlineNow', currentLanguage)}
            />
          )}
          {isGroup && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-sky-500 text-black border-2 border-black flex items-center justify-center text-[9px]"
              title="Gruppo"
            >
              <Users className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-white truncate max-w-[140px] sm:max-w-xs">
              {name}
            </h2>
            {isVerified && !isGroup && (
              <span title="Identità Verificata" className="inline-flex">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {isGroup ? (
              <button
                type="button"
                onClick={onOpenGroupInfo}
                className="hover:underline flex items-center gap-1 text-[11px] text-sky-400 font-mono"
              >
                <span>{target.group.members.length} {t('participants', currentLanguage)}</span>
              </button>
            ) : (
              <span className="font-mono text-slate-400">@{target.user.userId}</span>
            )}
            <span>·</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3 h-3 text-sky-400" /> {t('autoWipe', currentLanguage)}
            </span>
          </div>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1.5">
        {isGroup ? (
          <button
            onClick={onOpenGroupInfo}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition cursor-pointer"
            title="Info Gruppo"
          >
            <Info className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Info</span>
          </button>
        ) : (
          <button
            onClick={onOpenSafetyNumber}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition cursor-pointer"
            title="Codice di Sicurezza"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">E2E</span>
          </button>
        )}

        <button
          onClick={() => setShowConfirmBurn(true)}
          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
          title={t('burnConversation', currentLanguage)}
        >
          <Flame className="w-4 h-4" />
        </button>
      </div>

      {/* Confirm Burn Modal */}
      {showConfirmBurn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--theme-surface)] border border-rose-500/30 p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Flame className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-center text-white">
              {t('burnConversationConfirm', currentLanguage)}
            </h3>
            <p className="text-xs text-slate-400 text-center mt-2 leading-relaxed">
              {t('burnConversationDesc', currentLanguage)}
            </p>

            <div className="flex items-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowConfirmBurn(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition cursor-pointer"
              >
                {t('cancel', currentLanguage)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmBurn(false);
                  onBurnConversation();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition cursor-pointer shadow-lg shadow-rose-600/30"
              >
                {t('burnNow', currentLanguage)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
