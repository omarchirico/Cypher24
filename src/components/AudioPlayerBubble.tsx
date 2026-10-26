import React, { useState, useRef, useEffect } from 'react';
import type { AudioPitchEffect } from '../types';
import { Play, Pause, Volume2, Sparkles } from 'lucide-react';

interface Props {
  audioSrc: string;
  duration?: number;
  effect?: AudioPitchEffect;
  isMine: boolean;
}

export const AudioPlayerBubble: React.FC<Props> = ({
  audioSrc,
  duration,
  effect = 'normal',
  isMine,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioSrc);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioSrc]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * audioDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPct = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1 min-w-[210px] sm:min-w-[260px]">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition active:scale-95 cursor-pointer ${
          isMine
            ? 'bg-white text-black hover:bg-slate-200'
            : 'bg-[var(--theme-accent-color)] text-black hover:brightness-110'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-black" />
        ) : (
          <Play className="w-4 h-4 fill-black ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {/* Pitch Effect Badge */}
        {effect && effect !== 'normal' && (
          <div className="flex items-center gap-1 mb-1">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                effect === 'high'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'bg-purple-400/20 text-purple-300 border border-purple-400/30'
              }`}
            >
              {effect === 'high' ? '⚡ Tono Alto' : '🔮 Tono Basso'}
            </span>
          </div>
        )}

        {/* Waveform / Scrubber */}
        <div
          onClick={handleSeek}
          className="h-2 bg-black/40 rounded-full overflow-hidden cursor-pointer relative"
        >
          <div
            className={`h-full transition-all duration-75 ${
              isMine ? 'bg-white' : 'bg-[var(--theme-accent-color)]'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Time info */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
          <span>{formatSecs(currentTime)}</span>
          <span>{formatSecs(audioDuration)}</span>
        </div>
      </div>
    </div>
  );
};
