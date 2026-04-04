import { useEffect, useState, useMemo } from "react";
import { useSocket } from "./hooks/useSocket";
import { useColorExtractor } from "./hooks/useColorExtractor";
import { PlayerPage } from "./components/PlayerPage";
import { LyricsPage } from "./components/LyricsPage";
import { QueuePage } from "./components/QueuePage";
import { SearchOverlay } from "./components/SearchOverlay";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { Visualizer } from "./components/Visualizer";
import "./App.css";

function replace60WithHighRes(url: string, newSize = 512) {
  if (!url || url === 'Unknown Image') return '';
  if (url.includes('googleusercontent.com')) {
    return url.split('=')[0] + '=s' + newSize + '-c';
  }
  const replaced = url.replace(/w\d+-h\d+/, `w${newSize}-h${newSize}`);
  return replaced || url;
}

async function smoothResize(targetWidth: number, targetHeight: number, duration = 250) {
  const window = getCurrentWindow();
  const currentSize = await window.innerSize();
  const factor = await window.scaleFactor();
  
  const startW = currentSize.width / factor;
  const startH = currentSize.height / factor;
  const startTime = performance.now();

  return new Promise<void>((resolve) => {
    let lastUpdate = 0;
    const updateFreq = 1000 / 45; // Caps updates at ~45fps for Windows stability
    
    const step = async (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Only call setSize if enough time has passed from the last update
      if (currentTime - lastUpdate >= updateFreq || progress === 1) {
        lastUpdate = currentTime;

        // Easing function: Quartic ease-out for a snappier, less laggy feel
        const easing = 1 - Math.pow(1 - progress, 4);

        const nextW = startW + (targetWidth - startW) * easing;
        const nextH = startH + (targetHeight - startH) * easing;

        // Fire and forget intermediate steps, but await the final 
        if (progress < 1) {
          window.setSize(new LogicalSize(Math.round(nextW), Math.round(nextH)));
        } else {
          await window.setSize(new LogicalSize(targetWidth, targetHeight));
          resolve();
          return;
        }
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  });
}

function App() {
  const { metadata, playback, sendControl, sendRequest } = useSocket();
  const { extractColors } = useColorExtractor();
  
  const [theme, setTheme] = useState({
    bg: 'rgb(30,30,30)', bgExpanded: 'rgb(10,10,10)', 
    fg: '#ffffff', accent: '#4285f4', accentRgb: '66,133,244', brightnessOverlay: 'rgba(0,0,0,0)'
  });
  
  const [activeTab, setActiveTab] = useState<'player'|'lyrics'|'queue'>('player');
  const [searchOpen, setSearchOpen] = useState(false);
  
  const [isMini, setIsMini] = useState(false);

  // Handle Mini Mode Window Resize
  const toggleMini = async () => {
    const nextIsMini = !isMini;
    setIsMini(nextIsMini); // Switch UI mode at the start so internal CSS transitions trigger

    if (nextIsMini) {
      await smoothResize(300, 70);
    } else {
      await smoothResize(420, 500);
    }
  };

  // Update theme when album art changes
  useEffect(() => {
    if (metadata?.image) {
      extractColors(metadata.image).then(setTheme);
    }
  }, [metadata?.image, extractColors]);

  // Global search shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const songTitle = metadata?.title ? (metadata.title.split(' - ')[1] || metadata.title) : 'Unknown Title';
  const songArtist = metadata?.artist ? metadata.artist.split(' • ')[0] : 'Unknown Artist';

  const highResImage = useMemo(() => {
    const raw = metadata?.image;
    if (!raw) return '';
    const high = replace60WithHighRes(raw);
    return high || raw;
  }, [metadata?.image]);

  return (
    <div 
      className="relative w-screen h-screen flex flex-col transition-all duration-300 ease-in-out overflow-hidden border border-white/10 box-border"
      style={{ 
        backgroundColor: isMini ? theme.accent : theme.bgExpanded,
        borderRadius: isMini ? '40px' : '20px',
        color: theme.fg,
        '--fg': theme.fg,
        '--bg': theme.bg,
        '--bg-exp': theme.bgExpanded,
      } as React.CSSProperties}
    >
      {/* Background blur image */}
      <img 
        className={`absolute inset-0 w-full h-full object-cover blur-[0px] brightness-60 z-0 pointer-events-none transition duration-300 ${isMini ? 'opacity-0' : 'opacity-100'}`} 
        src={highResImage} 
      />
      <div className="absolute inset-0 z-[1] pointer-events-none color-transition" style={{ background: theme.brightnessOverlay }} />

      {/* Dedicated Mini Player View */}
      {isMini ? (
        <div className="flex flex-row items-center justify-start h-screen p-3 gap-2 relative z-20 box-border tauri-drag-region ">
          {/* Background Visualizer */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30 px-4">
            <Visualizer isPlaying={playback?.playing || false} accentColor={theme.fg} barCount={20} gap={6} />
          </div>

          <img src={highResImage} className="w-[40px] h-[40px] rounded-full object-cover shadow-[0_4px_12px_rgba(0,0,0,0.5)] shrink-0 ml-[2px] tauri-no-drag z-10" onClick={toggleMini} />
          <div className="flex flex-col overflow-hidden grow pt-1 z-10">
            <div className="flex items-center gap-1  tauri-no-drag ">
              <button className="w-8 h-8 p-1.5 rounded-full border-none bg-transparent hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity cursor-pointer text-inherit flex items-center justify-center shrink-0" onClick={() => sendControl('prevSong')}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
              </button>
              <button 
                className="w-10 h-10 p-2 rounded-full border-none  transition-transform hover:scale-110 cursor-pointer flex items-center justify-center shrink-0" 
                onClick={() => sendControl('play_pause')}
                style={{ background: theme.fg, color: theme.bg }}
              >
                {playback?.playing 
                  ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
              </button>

              <button className="w-8 h-8 p-1.5 rounded-full border-none bg-transparent hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity cursor-pointer text-inherit flex items-center justify-center shrink-0" onClick={() => sendControl('nextSong')}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5-3.92V14.9L8.5 12zM16 6h2v12h-2z" /></svg>
              </button>
            </div>
          </div>
          <button className="absolute top-2 right-2 opacity-50 hover:opacity-100 transition w-7 h-7 z-30 bg-transparent border-none  flex items-center justify-center text-inherit  tauri-drag-region cursor-move ">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        </div>
      ) : (
        <>
          {/* Top Navigation */}
          <div className="absolute top-5 right-5 flex gap-2 z-[100] bg-white/10 p-1.5 rounded-3xl border border-white/10 backdrop-blur-md tauri-drag-region">
            <button className={`w-8 h-8 rounded-full border-none bg-transparent text-inherit cursor-pointer flex items-center justify-center text-[14px] transition duration-200 tauri-no-drag p-0 hover:opacity-100 hover:bg-white/10 ${activeTab === 'player' ? 'bg-[var(--fg)] text-[var(--bg-exp)] opacity-100 shadow-[0_4px_10px_rgba(0,0,0,0.3)]' : 'opacity-70'}`} onClick={() => setActiveTab('player')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="12" cy="12" r="10"/><path d="M6 12c0-1.7.7-3.2 1.8-4.2"/><circle cx="12" cy="12" r="2"/><path d="M18 12c0 1.7-.7 3.2-1.8 4.2"/>
              </svg>
            </button>
            <button className={`w-8 h-8 rounded-full border-none bg-transparent text-inherit cursor-pointer flex items-center justify-center text-[14px] transition duration-200 tauri-no-drag p-0 hover:opacity-100 hover:bg-white/10 ${activeTab === 'lyrics' ? 'bg-[var(--fg)] text-[var(--bg-exp)] opacity-100 shadow-[0_4px_10px_rgba(0,0,0,0.3)]' : 'opacity-70'}`} onClick={() => setActiveTab('lyrics')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12"/><path d="M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5"/><circle cx="16" cy="7" r="5"/>
              </svg>
            </button>
            <button className={`w-8 h-8 rounded-full border-none bg-transparent text-inherit cursor-pointer flex items-center justify-center text-[14px] transition duration-200 tauri-no-drag p-0 hover:opacity-100 hover:bg-white/10 ${activeTab === 'queue' ? 'bg-[var(--fg)] text-[var(--bg-exp)] opacity-100 shadow-[0_4px_10px_rgba(0,0,0,0.3)]' : 'opacity-70'}`} onClick={() => setActiveTab('queue')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/>
              </svg>
            </button>
            <button className="w-8 h-8 rounded-full border-none bg-transparent text-inherit cursor-pointer flex items-center justify-center text-[14px] transition duration-200 tauri-no-drag p-0 opacity-70 hover:opacity-100 hover:bg-white/10" onClick={() => setSearchOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </button>
            
            {/* Window Controls */}
            <div className="ml-auto flex gap-1">
              <button className={`w-8 h-8 rounded-full border-none bg-transparent text-inherit cursor-pointer flex items-center justify-center text-[14px] transition duration-200 tauri-no-drag p-0 hover:opacity-100 hover:bg-white/10 ${isMini ? 'bg-[var(--fg)] text-[var(--bg-exp)] opacity-100 shadow-[0_4px_10px_rgba(0,0,0,0.3)]' : 'opacity-70'}`} onClick={toggleMini} title="Toggle Mini Form">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                </svg>
              </button>
            </div>

            <div className=" tauri-drag hover:cursor-move flex items-center mr-2">
              D
            </div>
          </div>

          {/* Header Info */}
          {activeTab === 'player' && (
          <div className="z-10 px-6 pt-[30px] pb-2.5 flex flex-col justify-center transition duration-300 tauri-drag-region mt-10">
            <h2 className="text-2xl font-extrabold m-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] transition duration-300">{songTitle}</h2>
            <div className="text-base opacity-80 mt-1.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] transition duration-300">{songArtist}</div>
          </div>
          )}

          {/* Main Content Area */}
          <div className="grow z-10 relative flex flex-col overflow-hidden  ">
            {activeTab === 'player' && (
              <PlayerPage metadata={metadata} playback={playback} theme={theme} sendControl={sendControl} />
            )}
            {activeTab === 'lyrics' && (
              <LyricsPage 
                songTitle={songTitle}
                songArtist={songArtist}
                currentTimeSeconds={playback?.currentTimeSeconds || 0}
                theme={theme}
              />
            )}
            {activeTab === 'queue' && (
              <QueuePage theme={theme} sendRequest={sendRequest} />
            )}
          </div>
        </>
      )}

      <SearchOverlay 
        isOpen={searchOpen} 
        onClose={() => setSearchOpen(false)} 
        sendRequest={sendRequest} 
      />
    </div>
  );
}

export default App;
