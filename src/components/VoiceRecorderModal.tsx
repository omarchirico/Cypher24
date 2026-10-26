import React, { useState, useEffect, useRef } from 'react';
import type { AudioPitchEffect } from '../types';
import { applyPitchModulation } from '../utils/audioModulation';
import {
  Mic,
  Square,
  Play,
  Pause,
  Send,
  X,
  Volume2,
  Sparkles,
  ArrowDownUp,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSendVoice: (audioDataUrl: string, duration: number, effect: AudioPitchEffect) => Promise<void>;
  recipientName: string;
}

export const VoiceRecorderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSendVoice,
  recipientName,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedRawBlob, setRecordedRawBlob] = useState<Blob | null>(null);
  const [pitchEffect, setPitchEffect] = useState<AudioPitchEffect>('normal');
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
  const [processedDuration, setProcessedDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-start recording on open
  useEffect(() => {
    if (isOpen) {
      startRecording();
    } else {
      cleanup();
    }
    return () => cleanup();
  }, [isOpen]);

  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    clearInterval(timerRef.current);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsRecording(false);
    setRecordSeconds(0);
    setRecordedRawBlob(null);
    setProcessedAudioUrl(null);
    setIsPlaying(false);
    setPlayProgress(0);
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      setRecordedRawBlob(null);
      setProcessedAudioUrl(null);
      setIsPlaying(false);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        setRecordedRawBlob(rawBlob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        // Process initial normal pitch
        await processModulation(rawBlob, pitchEffect);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          if (s >= 120) {
            // Cap recording at 2 minutes
            stopRecording();
            return 120;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage('Accesso al microfono negato o non supportato.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Re-process audio whenever pitch effect changes
  const processModulation = async (blob: Blob, effect: AudioPitchEffect) => {
    try {
      setIsProcessing(true);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      }
      const result = await applyPitchModulation(blob, effect);
      setProcessedAudioUrl(result.dataUrl);
      setProcessedDuration(result.duration);
    } catch (err) {
      console.error('Pitch processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectPitch = async (effect: AudioPitchEffect) => {
    setPitchEffect(effect);
    if (recordedRawBlob) {
      await processModulation(recordedRawBlob, effect);
    }
  };

  const togglePlayback = () => {
    if (!processedAudioUrl) return;

    if (!audioElementRef.current) {
      const audio = new Audio(processedAudioUrl);
      audioElementRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlayProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      audio.onended = () => {
        setIsPlaying(false);
        setPlayProgress(0);
      };
    } else {
      audioElementRef.current.src = processedAudioUrl;
    }

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = async () => {
    if (!processedAudioUrl) return;
    try {
      setIsProcessing(true);
      await onSendVoice(processedAudioUrl, processedDuration, pitchEffect);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(recordSeconds / 60);
  const seconds = recordSeconds % 60;
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-2xl p-6 text-slate-100 relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-base font-bold text-white">Messaggio Vocale Cifrato</h3>
          <p className="text-xs text-slate-400 mt-1">
            Invia a <strong className="text-white">{recipientName}</strong> (scade tra 24h)
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            {errorMessage}
          </div>
        )}

        {/* 1. Live Recording View */}
        {isRecording && (
          <div className="flex flex-col items-center py-6 space-y-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500 animate-ping absolute inset-0" />
              <div className="w-20 h-20 rounded-full bg-rose-600 flex items-center justify-center text-white relative shadow-xl shadow-rose-600/40">
                <Mic className="w-8 h-8" />
              </div>
            </div>

            <div className="text-center">
              <span className="font-mono text-2xl font-bold tracking-wider text-rose-400">
                {timeDisplay}
              </span>
              <p className="text-xs text-slate-400 mt-1 animate-pulse">
                Registrazione vocale in corso...
              </p>
            </div>

            {/* Stop Button */}
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-bold text-xs shadow-lg hover:bg-slate-200 active:scale-95 transition cursor-pointer"
            >
              <Square className="w-4 h-4 fill-black" />
              <span>Termina Registrazione</span>
            </button>
          </div>
        )}

        {/* 2. Review & Pitch Modulation View */}
        {!isRecording && recordedRawBlob && (
          <div className="space-y-5">
            {/* Audio Preview Card */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex items-center gap-3">
              <button
                onClick={togglePlayback}
                disabled={isProcessing}
                className="w-12 h-12 rounded-xl bg-[var(--theme-accent-color)] text-black flex items-center justify-center font-bold shadow-md hover:brightness-110 active:scale-95 transition cursor-pointer shrink-0 disabled:opacity-40"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-black" />
                ) : (
                  <Play className="w-5 h-5 fill-black ml-0.5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-mono">
                    {Math.round(processedDuration || recordSeconds)}s
                  </span>
                  <span className="text-[11px] text-[var(--theme-accent-color)] font-semibold uppercase tracking-wider">
                    {pitchEffect === 'normal'
                      ? 'Normale'
                      : pitchEffect === 'high'
                      ? 'Tono Alto'
                      : 'Tono Basso'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--theme-accent-color)] h-full transition-all duration-100"
                    style={{ width: `${playProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Voice Pitch Modification Controls */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ArrowDownUp className="w-3.5 h-3.5 text-sky-400" />
                <span>Modifica Voce (Effetto Tono):</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPitch('normal')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    pitchEffect === 'normal'
                      ? 'bg-white/15 border-white/40 text-white font-bold'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs block">Normale</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Originale</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPitch('high')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    pitchEffect === 'high'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:text-amber-300'
                  }`}
                >
                  <span className="text-xs block">Tono Alto</span>
                  <span className="text-[10px] text-amber-400/70 mt-0.5 block">Acuta / Chipmunk</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPitch('low')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    pitchEffect === 'low'
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:text-purple-300'
                  }`}
                >
                  <span className="text-xs block">Tono Basso</span>
                  <span className="text-[10px] text-purple-400/70 mt-0.5 block">Profonda / Cyborg</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 transition cursor-pointer"
                title="Registra di nuovo"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rifai</span>
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-2xl bg-[var(--theme-accent-color)] text-black font-bold text-xs hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <>
                    <Send className="w-4 h-4 fill-black" />
                    <span>Invia Vocale Cifrato</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
