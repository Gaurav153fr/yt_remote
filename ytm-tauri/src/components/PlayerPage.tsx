import React, { useRef, useEffect, useCallback, useState } from 'react';
import { SongMetadata, PlaybackState } from '../hooks/useSocket';
import { ThemeColors } from '../hooks/useColorExtractor';
import { Visualizer } from './Visualizer';

interface PlayerPageProps {
  metadata: SongMetadata | null;
  playback: PlaybackState | null;
  theme: ThemeColors;
  sendControl: (action: string, data?: number) => void;
}

export const PlayerPage: React.FC<PlayerPageProps> = ({ metadata, playback, theme, sendControl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef(0);
  const isScrubbing = useRef(false);

  const isPlaying = playback?.playing ?? false;
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Sync progress from playback and metadata
  useEffect(() => {
    if (isScrubbing.current) return;

    // Use direct numeric values if available (from our new extension scraper)
    if (playback?.progressPct !== undefined && playback?.currentTimeSeconds !== undefined) {
      setProgress(playback.progressPct);
      setCurrentTime(playback.currentTimeSeconds);
      setDuration(metadata?.durationSeconds || 0);
    } 
    // Fallback for legacy slider text
    else if (playback?.slider) {
      const pts = playback.slider.split(' of ');
      if (pts.length === 2) {
        const toSec = (s: string) => {
          const p = s.toLowerCase().split(' ');
          let total = 0;
          p.forEach((v, i) => {
            if (v.startsWith('min')) total += (parseInt(p[i - 1]) || 0) * 60;
            if (v.startsWith('sec')) total += (parseInt(p[i - 1]) || 0);
          });
          return total;
        };
        const cur = toSec(pts[0]);
        const dur = toSec(pts[1]);
        setCurrentTime(cur);
        setDuration(dur);
        setProgress(dur > 0 ? cur / dur : 0);
      }
    }
  }, [playback, metadata]);

  // Waveform animation
  const drawWave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (canvas.width !== w) { canvas.width = w; canvas.height = h; }

    ctx.clearRect(0, 0, w, h);
    const midY = h / 2;
    const progX = w * progress;

    // Background track
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 3;
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    if (progX > 0) {
      // Active wave
      ctx.beginPath();
      ctx.strokeStyle = theme.fg;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let x = 0; x <= progX; x += 2) {
        const env = Math.sin((x / (progX || 1)) * Math.PI);
        const y = midY + Math.sin(x * 0.3 - phaseRef.current) * (isPlaying ? 6 : 1.5) * env;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Progress dot
      ctx.beginPath();
      ctx.fillStyle = theme.fg;
      ctx.arc(progX, midY, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    phaseRef.current += isPlaying ? 0.1 : 0.02;
    rafRef.current = requestAnimationFrame(drawWave);
  }, [progress, isPlaying, theme.fg]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawWave);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawWave]);

  const handleSeekbarPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    isScrubbing.current = true;

    const getVal = (ev: PointerEvent) => Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));

    const onMove = (ev: PointerEvent) => {
      setProgress(getVal(ev));
    };
    const onUp = (ev: PointerEvent) => {
      const val = getVal(ev);
      setProgress(val);
      sendControl('slider', val);
      setTimeout(() => { isScrubbing.current = false; }, 200);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [sendControl]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grow flex flex-col p-6 justify-end relative z-10 box-border">
      {/* Seekbar */}
      <div className="w-full h-[70px] mb-[30px] flex flex-col justify-center">
        <div
          className="h-[50px] w-full cursor-pointer relative"
          onPointerDown={handleSeekbarPointer}
        >
          <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />
        </div>
        <div className="flex justify-between text-[12px] font-semibold opacity-60 -mt-1.5">
          <span>{duration > 0 ? fmtTime(currentTime) : '--:--'}</span>
          <span>{duration > 0 ? fmtTime(duration) : '--:--'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 pb-5">
        <button
          className="w-12 h-12 p-3 rounded-full border-none bg-transparent hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity cursor-pointer text-inherit flex items-center justify-center"
          onClick={() => sendControl('prevSong')}
          title="Previous"
        >
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
        </button>

        <button
          className="w-16 h-16 p-[18px] rounded-full border-none shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:scale-110 transition-transform cursor-pointer flex items-center justify-center"
          onClick={() => sendControl('play_pause')}
          title={isPlaying ? 'Pause' : 'Play'}
          style={{ background: theme.fg, color: theme.bg }}
        >
          {isPlaying
            ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          }
        </button>

        <button
          className="w-12 h-12 p-3 rounded-full border-none bg-transparent hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity cursor-pointer text-inherit flex items-center justify-center"
          onClick={() => sendControl('nextSong')}
          title="Next"
        >
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5-3.92V14.9L8.5 12zM16 6h2v12h-2z" /></svg>
        </button>
      </div>

      {/* Stylized Visualizer Strip */}
      <div className="w-full h-8 flex items-center justify-center opacity-40 hover:opacity-100 transition duration-300">
         <div className="w-32 h-full">
            <Visualizer isPlaying={isPlaying} accentColor={theme.fg} barCount={16} gap={4} />
         </div>
      </div>
    </div>
  );
};
