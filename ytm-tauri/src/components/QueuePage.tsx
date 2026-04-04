import React, { useEffect, useState } from 'react';
import { ThemeColors } from '../hooks/useColorExtractor';

interface QueueItem {
  title: string;
  artist: { artist: string }[];
  cover?: string;
  videoId?: string;
  shelfIdx?: number;
  itemIdx?: number;
}

interface Shelf {
  title: string;
  items: QueueItem[];
}

interface QueuePageProps {
  theme: ThemeColors;
  sendRequest: (type: string, payload?: any) => Promise<any>;
}

export const QueuePage: React.FC<QueuePageProps> = ({ theme, sendRequest }) => {
  const [activeTab, setActiveTab] = useState('Up Next');
  const [tabs, setTabs] = useState(['Up Next', 'Liked Songs']);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [shelvesData, setShelvesData] = useState<Shelf[]>([]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        if (activeTab === 'Up Next') {
          const res = await sendRequest('getQueue');
          if (res && res.queue && isMounted) setItems(res.queue);
        } else if (activeTab === 'Liked Songs') {
          const res = await sendRequest('getLikedSongs');
          if (res && res.data && isMounted) setItems(res.data);
        } else {
          // Home shelves
          const shelf = shelvesData.find(s => s.title === activeTab);
          if (shelf && isMounted) setItems(shelf.items);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [activeTab, sendRequest, shelvesData]);

  // Load shelves list once
  useEffect(() => {
    const loadShelves = async () => {
      const res = await sendRequest('getHomeShelves');
      if (res && res.shelves) {
        setShelvesData(res.shelves);
        setTabs(['Up Next', 'Liked Songs', ...res.shelves.map((s: Shelf) => s.title)]);
      }
    };
    loadShelves();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = (index: number, item: QueueItem) => {
    if (activeTab === 'Up Next') {
      sendRequest('playQueue', { data: index });
    } else if (activeTab === 'Liked Songs') {
      sendRequest('playLikedSong', { videoId: item.videoId });
    } else {
      sendRequest('playShelfItem', { data: { shelfIdx: item.shelfIdx, itemIdx: item.itemIdx } });
    }
  };

  return (
    <div className="flex grow flex-col overflow-hidden mt-13">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar px-6 pt-5 pb-3 shrink-0">
        {tabs.map(t => (
          <div
            key={t}
            className={`px-4 py-2 rounded-full font-bold text-sm cursor-pointer whitespace-nowrap transition duration-200 hover:-translate-y-0.5 ${
              activeTab === t 
                ? 'shadow-[0_4px_12px_rgba(0,0,0,0.3)]' 
                : 'bg-white/5 border border-white/5 hover:bg-white/10'
            }`}
            style={activeTab === t ? { background: theme.fg, color: theme.bg } : {}}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </div>
        ))}
      </div>

      <div 
        className="overflow-y-auto hide-scrollbar grow px-6 pb-5"
        style={{ maskImage: 'linear-gradient(to bottom, black 95%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black 95%, transparent)' }}
      >
        {loading && <div className="text-center opacity-50 mt-10 text-sm">Loading...</div>}
        {!loading && items.length === 0 && <div className="text-center opacity-50 mt-10 text-sm">Nothing here</div>}
        
        {!loading && items.map((item, i) => (
          <div key={i} className="flex items-center p-3 mb-2 rounded-xl cursor-pointer bg-white/5 transition duration-200 border border-white/5 hover:bg-white/15 hover:translate-x-1" onClick={() => handlePlay(i, item)}>
            <div className="w-7 font-bold opacity-50 text-sm text-center shrink-0">{i + 1}</div>
            <div className="flex flex-col overflow-hidden whitespace-nowrap grow ml-3">
              <div className="text-ellipsis overflow-hidden font-semibold text-[15px]">{item.title}</div>
              <div className="text-[12px] opacity-60 text-ellipsis overflow-hidden mt-1">{item.artist?.[0]?.artist || 'Unknown Artist'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
