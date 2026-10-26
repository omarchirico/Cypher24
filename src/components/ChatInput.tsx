import React, { useState, useRef } from 'react';
import type { AppLanguage } from '../types';
import { t } from '../i18n/translations';
import { Send, Image, Video, Mic, Lock, Loader2 } from 'lucide-react';
import { compressUserPhoto } from '../utils/avatar';

interface Props {
  onSendMessage: (
    content: string,
    type: 'text' | 'image' | 'video' | 'audio',
    viewOnce?: boolean
  ) => Promise<void>;
  onOpenVoiceRecorder: () => void;
  targetName: string;
  disabled?: boolean;
  currentLanguage?: AppLanguage;
}

export const ChatInput: React.FC<Props> = ({
  onSendMessage,
  onOpenVoiceRecorder,
  targetName,
  disabled,
  currentLanguage = 'it',
}) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || isSending || disabled) return;

    try {
      setIsSending(true);
      setText('');
      await onSendMessage(cleanText, 'text', false);
      textareaRef.current?.focus();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isSending || disabled) return;

    try {
      setIsSending(true);
      const compressed = await compressUserPhoto(file, 960, 0.85);
      await onSendMessage(compressed, 'image', viewOnce);
      if (viewOnce) setViewOnce(false); // reset viewOnce after send
    } catch (err) {
      console.error('Failed to send image:', err);
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isSending || disabled) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('Il video supera il limite massimo di 20MB per la trasmissione cifrata.');
      return;
    }

    try {
      setIsSending(true);
      const reader = new FileReader();
      const videoDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await onSendMessage(videoDataUrl, 'video', viewOnce);
      if (viewOnce) setViewOnce(false);
    } catch (err) {
      console.error('Failed to send video:', err);
    } finally {
      setIsSending(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  return (
    <div className="border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/90 backdrop-blur-md px-3 sm:px-4 py-2.5 pb-safe">
      {/* View-Once Active Banner Notification */}
      {viewOnce && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300 animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-4 h-4 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[9px]">
              1x
            </span>
            <span>{t('viewOnceBanner', currentLanguage)}</span>
          </div>
          <button
            type="button"
            onClick={() => setViewOnce(false)}
            className="text-xs hover:underline text-amber-200 cursor-pointer"
          >
            {t('cancel', currentLanguage)}
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 sm:gap-2 max-w-4xl mx-auto">
        {/* Hidden inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={videoInputRef}
          onChange={handleVideoUpload}
          accept="video/*"
          className="hidden"
        />

        {/* View Once Toggle (1x) */}
        <button
          type="button"
          onClick={() => setViewOnce(!viewOnce)}
          disabled={disabled || isSending}
          className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 ${
            viewOnce
              ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
          }`}
          title={t('viewOnce', currentLanguage)}
        >
          <span className="text-[11px]">1x</span>
        </button>

        {/* Send Photo */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition disabled:opacity-40 cursor-pointer shrink-0"
          title={t('sendPhoto', currentLanguage)}
        >
          <Image className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Send Video */}
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={disabled || isSending}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition disabled:opacity-40 cursor-pointer shrink-0"
          title={t('sendVideo', currentLanguage)}
        >
          <Video className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Voice Note Recorder Button */}
        <button
          type="button"
          onClick={onOpenVoiceRecorder}
          disabled={disabled || isSending}
          className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition disabled:opacity-40 cursor-pointer shrink-0"
          title={t('recordVoice', currentLanguage)}
        >
          <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Text Input */}
        <div className="relative flex-1 flex items-center">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={`${t('typeMessage', currentLanguage)} ${targetName}...`}
            className="w-full resize-none py-2.5 pl-3.5 pr-8 rounded-2xl bg-black/50 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--theme-accent-color)] max-h-32 transition"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" title="E2E">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!text.trim() || isSending || disabled}
          className="p-2.5 rounded-xl bg-[var(--theme-accent-color)] text-black font-semibold hover:brightness-110 active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0 shadow-md"
          title="Invia"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin text-black" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 max-w-4xl mx-auto px-1">
        <span className="flex items-center gap-1 font-mono">
          <Lock className="w-3 h-3 text-emerald-400" /> {t('e2eActive', currentLanguage)}
        </span>
        <span className="flex items-center gap-2">
          <span>{t('highVoice', currentLanguage)} / {t('lowVoice', currentLanguage)}</span>
          <span>·</span>
          <span>{t('wipe24h', currentLanguage)}</span>
        </span>
      </div>
    </div>
  );
};
