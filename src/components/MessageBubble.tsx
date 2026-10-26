import React, { useState, useEffect } from 'react';
import type { DecryptedMessage, AppLanguage } from '../types';
import { getRemainingTimeFormatted } from '../utils/avatar';
import { formatExpiryText, t } from '../i18n/translations';
import { AudioPlayerBubble } from './AudioPlayerBubble';
import { Flame, Lock, CheckCheck, Eye, EyeOff, Languages } from 'lucide-react';

interface Props {
  message: DecryptedMessage;
  isMine: boolean;
  onBurnMessage: (messageId: string) => void;
  onOpenViewOnce: (message: DecryptedMessage) => void;
  onToggleOriginal?: (messageId: string) => void;
  onTranslateMessage?: (messageId: string) => void;
  senderPhoto?: string;
  senderName?: string;
  isGroup?: boolean;
  currentLanguage?: AppLanguage;
}

export const MessageBubble: React.FC<Props> = ({
  message,
  isMine,
  onBurnMessage,
  onOpenViewOnce,
  onToggleOriginal,
  senderPhoto,
  senderName,
  isGroup,
  currentLanguage = 'it',
}) => {
  const [remaining, setRemaining] = useState(() => getRemainingTimeFormatted(message.expiresAt));

  // Dynamic countdown interval
  useEffect(() => {
    const updateCountdown = () => {
      setRemaining(getRemainingTimeFormatted(message.expiresAt));
    };

    updateCountdown();
    const intervalMs = remaining.hours < 1 ? 1000 : 5000;
    const timer = setInterval(updateCountdown, intervalMs);
    return () => clearInterval(timer);
  }, [message.expiresAt, remaining.hours]);

  const timeFormatted = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const expiresTimeFormatted = new Date(message.expiresAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const strokeDashoffset = 37.7 * (1 - remaining.pctRemaining / 100);

  // View-Once status
  const isViewOnceBurned =
    message.viewOnce &&
    (message.viewed || message.isViewOnceOpenedLocally || !message.encryptedPayload);

  // Localized countdown string
  const localizedExpiry = formatExpiryText(
    remaining.hours,
    remaining.minutes,
    remaining.seconds,
    currentLanguage
  );

  // Text message translation logic
  const hasTranslation = Boolean(message.translatedContent && message.translatedContent !== message.decryptedContent);
  const isShowingTranslated = hasTranslation && !message.showOriginal;
  const displayedText = isShowingTranslated ? message.translatedContent : message.decryptedContent;

  return (
    <div className={`flex items-end gap-2 group mb-3.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {!isMine && (
        <div className="flex flex-col items-center shrink-0 mb-1">
          {senderPhoto ? (
            <img
              src={senderPhoto}
              alt={senderName || 'Contact'}
              className="w-7 h-7 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] text-white">
              {(senderName || message.senderId).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      <div
        className={`relative max-w-[88%] sm:max-w-md rounded-2xl px-4 py-3 shadow-md border transition-all ${
          isMine
            ? 'bg-[var(--theme-bubble-sent)] border-[var(--theme-bubble-sent-border)] text-slate-100 rounded-br-xs'
            : 'bg-[var(--theme-bubble-received)] border-[var(--theme-bubble-received-border)] text-slate-200 rounded-bl-xs'
        }`}
      >
        {/* Group Sender Name Label */}
        {isGroup && !isMine && (
          <div className="text-[11px] font-semibold text-[var(--theme-accent-color)] mb-1">
            @{message.senderId}
          </div>
        )}

        {/* 1. VIEW ONCE MEDIA (Photo or Video) */}
        {message.viewOnce ? (
          isViewOnceBurned ? (
            // Burned / Destroyed State
            <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl bg-black/40 border border-white/5 text-slate-400 text-xs">
              <EyeOff className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="italic">
                {message.messageType === 'video'
                  ? t('viewOnceBurnedVideo', currentLanguage)
                  : t('viewOnceBurnedPhoto', currentLanguage)}
              </span>
            </div>
          ) : (
            // Unopened View-Once Card
            <button
              type="button"
              onClick={() => onOpenViewOnce(message)}
              className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition active:scale-98 cursor-pointer w-full text-left shadow-sm"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-xs shrink-0">
                1x
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-bold">
                  {message.messageType === 'video'
                    ? t('viewOnceCardVideo', currentLanguage)
                    : t('viewOnceCardPhoto', currentLanguage)}
                </span>
                <span className="text-[10px] text-amber-400/80 mt-0.5 block">
                  {t('viewOncePrompt', currentLanguage)}
                </span>
              </div>
              <Eye className="w-4 h-4 shrink-0 text-amber-300" />
            </button>
          )
        ) : message.messageType === 'audio' && message.decryptedContent ? (
          /* 2. VOICE NOTE PLAYER */
          <AudioPlayerBubble
            audioSrc={message.decryptedContent}
            duration={message.audioDuration}
            effect={message.audioEffect}
            isMine={isMine}
          />
        ) : message.messageType === 'video' && message.decryptedContent ? (
          /* 3. STANDARD VIDEO */
          <div className="mb-2.5 rounded-xl overflow-hidden border border-black/20 bg-black">
            <video
              src={message.decryptedContent}
              controls
              playsInline
              className="max-h-80 w-auto rounded-xl object-contain"
            />
          </div>
        ) : message.messageType === 'image' && message.decryptedContent ? (
          /* 4. STANDARD PHOTO */
          <div className="mb-2.5 rounded-xl overflow-hidden border border-black/20">
            <img
              src={message.decryptedContent}
              alt="Cifrata"
              className="max-h-80 w-auto object-cover rounded-xl"
              loading="lazy"
            />
          </div>
        ) : (
          /* 5. TEXT MESSAGE (With Automatic / Manual Translation support) */
          <div className="space-y-1.5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {displayedText || (
                <span className="text-xs text-slate-400 italic flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 animate-pulse" /> Decifrazione in corso...
                </span>
              )}
            </p>

            {hasTranslation && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[10px]">
                <span className="inline-flex items-center gap-1 text-[var(--theme-accent-color)] font-medium">
                  <Languages className="w-3 h-3 shrink-0" />
                  <span>
                    {isShowingTranslated
                      ? t('translatedFrom', currentLanguage)
                      : 'Originale'}
                  </span>
                </span>
                {onToggleOriginal && (
                  <button
                    type="button"
                    onClick={() => onToggleOriginal(message.id)}
                    className="text-slate-400 hover:text-white underline cursor-pointer transition text-[10px]"
                  >
                    {isShowingTranslated
                      ? t('showOriginal', currentLanguage)
                      : t('showTranslated', currentLanguage)}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Metadata bar: Visual Expiry Counter, Send Time, Checkmarks, Burn button */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1.5 border-t border-white/10 text-[10px]">
          {/* Visual 24h Countdown Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] tabular-nums transition-colors shadow-xs ${
              remaining.isUrgent
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 animate-pulse'
                : 'bg-black/40 border border-white/10 text-slate-300'
            }`}
            title={`Eliminazione programmata: ${expiresTimeFormatted}`}
          >
            {/* Circular mini gauge */}
            <svg className="w-3.5 h-3.5 -rotate-90 shrink-0" viewBox="0 0 16 16">
              <circle
                cx="8"
                cy="8"
                r="6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.25"
              />
              <circle
                cx="8"
                cy="8"
                r="6"
                fill="none"
                stroke={remaining.isUrgent ? '#f59e0b' : 'var(--theme-accent-color)'}
                strokeWidth="2"
                strokeDasharray="37.7"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>

            {/* Explicit Countdown Label */}
            <span className="font-semibold tracking-tight text-[10px]">
              {localizedExpiry}
            </span>
          </div>

          {/* Time & Message status */}
          <div className="flex items-center gap-1.5 text-slate-400 ml-auto">
            <span className="tabular-nums font-mono text-[10px]">{timeFormatted}</span>
            {isMine && <CheckCheck className="w-3.5 h-3.5 text-sky-400" />}

            {/* Quick manual burn action button */}
            <button
              onClick={() => onBurnMessage(message.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-rose-400 cursor-pointer ml-1"
              title="Brucia ora (elimina subito)"
            >
              <Flame className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
