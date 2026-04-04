import React, { useEffect, useState, useRef } from 'react';
import { ThemeColors } from '../hooks/useColorExtractor';

interface LyricsPageProps {
  songTitle: string;
  songArtist: string;
  currentTimeSeconds: number;
  theme: ThemeColors;
}

interface LyricLine {
  time: number;
  text: string;
}

export const LyricsPage: React.FC<LyricsPageProps> = ({ songTitle, songArtist, currentTimeSeconds, theme }) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!songTitle || !songArtist) return;

    let isMounted = true;
    setLoading(true);
    setError(false);
    setLyrics([]);

    const fetchLyrics = async () => {
      try {
        const query = new URLSearchParams({ track_name: songTitle, artist_name: songArtist });
        const res = await fetch(`https://lrclib.net/api/get?${query}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();

        if (data.syncedLyrics && isMounted) {
          const parsed = parseLRC(data.syncedLyrics);
          setLyrics(parsed);
        } else if (data.plainLyrics && isMounted) {
          // Fallback to plain lyrics (all at time 0)
          const lines = data.plainLyrics.split('\n').map((l: string) => ({ time: 0, text: l }));
          setLyrics(lines);
        } else if (isMounted) {
          setError(true);
        }
      } catch {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLyrics();
    return () => { isMounted = false; };
  }, [songTitle, songArtist]);

  const parseLRC = (lrc: string): LyricLine[] => {
    const lines = lrc.split('\n');
    const result: LyricLine[] = [];
    lines.forEach(line => {
      const match = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
      if (match) {
        const m = parseInt(match[1]);
        const s = parseInt(match[2]);
        const cs = match[3] ? parseInt(match[3]) : 0;
        const text = match[4].trim();
        if (text) {
          result.push({ time: m * 60 + s + cs / 100, text });
        }
      }
    });
    return result.sort((a, b) => a.time - b.time);
  };

  // Find active line
  let activeIndex = -1;
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if ((currentTimeSeconds + 0.5) >= lyrics[i].time) {
      activeIndex = i;
      break;
    }
  }

  // Auto scroll
  useEffect(() => {
    if (activeIndex >= 0 && containerRef.current) {
      const activeEl = containerRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex]);

  return (
    <div className="grow overflow-y-auto hide-scrollbar px-6 pt-5 pb-[100px] " style={{ maskImage: 'linear-gradient(to bottom, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent)' }} ref={containerRef}>
      {loading && <div className="text-center opacity-50 mt-10 text-base">Loading lyrics...</div>}
      {error && <div className="text-center opacity-50 mt-10 text-base">Instrumental or No Lyrics Found</div>}
      
      {!loading && !error && lyrics.map((line, i) => (
        <div
          key={i}
          className={`font-bold mb-6 transition-all duration-400 leading-snug cursor-pointer ${
            i === activeIndex 
              ? 'opacity-100 blur-none scale-105 text-[32px]' 
              : i < activeIndex 
                ? 'opacity-50 blur-none text-[26px]' 
                : 'opacity-30 blur-[1px] text-[26px]'
          }`}
          style={{
            textShadow: i === activeIndex ? `0 0 20px ${theme.fg}` : 'none',
          }}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
};
