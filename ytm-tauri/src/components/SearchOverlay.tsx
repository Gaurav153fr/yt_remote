import React, { useState, useEffect, useRef } from 'react';

interface SearchResult {
  videoId: string;
  title: string;
  artist: string;
  cover: string;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  sendRequest: (type: string, payload?: any) => Promise<any>;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, sendRequest }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number>(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      const res = await sendRequest('liveSearch', { query: query.trim() });
      if (res && res.data) {
        setResults(res.data);
        setSelectedIndex(res.data.length > 0 ? 0 : -1);
      }
      setLoading(false);
    }, 400);
  }, [query, sendRequest]);

  const handlePlay = (item: SearchResult) => {
    sendRequest('playSearchResult', { videoId: item.videoId });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(s => Math.min(results.length - 1, s + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(s => Math.max(0, s - 1));
    }
    if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      handlePlay(results[selectedIndex]);
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const el = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[10px] z-[999] cursor-pointer" onClick={onClose} />
      <div className="fixed inset-0 z-[1000] flex flex-col p-6 pt-10 pointer-events-none">
        <div className="flex items-center bg-white/10 border border-white/20 rounded-2xl p-4 px-5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-[20px] pointer-events-auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-70 mr-4 text-white">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="grow bg-transparent border-none outline-none text-lg text-white font-semibold placeholder:text-white/40"
            placeholder="Search YouTube Music..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
          />
          <button onClick={onClose} className="bg-transparent border-none text-white cursor-pointer opacity-70 hover:opacity-100 transition-opacity ml-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        
        <div 
          className="mt-4 bg-[#141414]/80 border border-white/10 rounded-2xl overflow-y-auto max-h-[calc(100%-80px)] hide-scrollbar shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-[20px] p-2 pointer-events-auto" 
          ref={resultsRef} 
          style={{ display: results.length > 0 || loading ? 'block' : 'none' }}
        >
          {loading && <div className="text-center p-6 opacity-50 text-sm text-white">Searching...</div>}
          {!loading && query && results.length === 0 && <div className="text-center p-6 opacity-50 text-sm text-white">No results found</div>}
          
          {!loading && results.map((item, i) => (
            <div
              key={item.videoId}
              className={`flex items-center p-3 rounded-xl cursor-pointer transition duration-150 mb-1 ${i === selectedIndex ? 'bg-white/15 scale-[0.98]' : 'hover:bg-white/15 hover:scale-[0.98]'}`}
              onClick={() => handlePlay(item)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <img className="w-14 h-14 rounded-xl object-cover bg-neutral-800 shadow-[0_4px_10px_rgba(0,0,0,0.3)] shrink-0" src={item.cover} alt={item.title} />
              <div className="flex flex-col overflow-hidden whitespace-nowrap ml-4 justify-center grow">
                <div className="font-semibold text-[15px] text-white text-ellipsis overflow-hidden">{item.title}</div>
                <div className="text-[13px] opacity-60 text-white text-ellipsis overflow-hidden mt-1">{item.artist}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
