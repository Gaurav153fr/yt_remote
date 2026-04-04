import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

const LOCAL_WS_URL = 'ws://127.0.0.1:1422/ws';

export interface SongMetadata {
  title: string;
  artist: string;
  image: string;
  durationSeconds: number;
}

export interface PlaybackState {
  playing: boolean;
  progressPct: number;
  currentTimeSeconds: number;
  slider: string;
}

export interface UseSocketReturn {
  isConnected: boolean;
  metadata: SongMetadata | null;
  playback: PlaybackState | null;
  sendControl: (action: string, data?: number) => void;
  sendRequest: (type: string, payload?: Record<string, unknown>) => Promise<unknown>;
}

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [metadata, setMetadata] = useState<SongMetadata | null>(null);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRequests = useRef<Map<string, (data: unknown) => void>>(new Map());

  useEffect(() => {
    let reconnectTimer: number;

    const connect = () => {
      const ws = new WebSocket(LOCAL_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Ask extension for initial state
        ws.send(JSON.stringify({ type: 'widget:sync' }));
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        reconnectTimer = window.setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (!msg?.type) return;

          // Handle incoming song updates
          if (msg.type === 'songUpdate' && msg.data) {
            if (!msg.data.error) {
              const newMetadata: SongMetadata = {
                title: msg.data.title,
                artist: msg.data.artist,
                image: msg.data.image,
                durationSeconds: msg.data.durationSeconds || 0,
              };

              const newPlayback: PlaybackState = {
                playing: msg.data.playing,
                progressPct: msg.data.progressPct || 0,
                currentTimeSeconds: msg.data.currentTimeSeconds || 0,
                slider: msg.data.slider || '',
              };

              setMetadata(prev => {
                if (!prev || 
                    prev.title !== newMetadata.title || 
                    prev.artist !== newMetadata.artist) {
                  return newMetadata;
                }
                return prev;
              });

              setPlayback(prev => {
                if (!prev ||
                    prev.playing !== newPlayback.playing ||
                    prev.progressPct !== newPlayback.progressPct ||
                    prev.currentTimeSeconds !== newPlayback.currentTimeSeconds ||
                    prev.slider !== newPlayback.slider) {
                  return newPlayback;
                }
                return prev;
              });
            }
          }
          // Handle response messages
          else if (msg.type.endsWith('Response')) {
            const resolver = pendingRequests.current.get(msg.type);
            if (resolver) {
              resolver(msg.data);
              pendingRequests.current.delete(msg.type);
            }
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendControl = useCallback((action: string, data?: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    if (action === 'slider') {
      wsRef.current.send(JSON.stringify({ type: 'slider', data }));
    } else {
      wsRef.current.send(JSON.stringify({ type: action }));
    }
  }, []);

  const sendRequest = useCallback((type: string, payload: Record<string, unknown> = {}): Promise<unknown> => {
    return new Promise((resolve) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        resolve(null);
        return;
      }

      const responseType = type + 'Response';
      pendingRequests.current.set(responseType, resolve);

      wsRef.current.send(JSON.stringify({
        type,
        ...payload,
      }));

      // Timeout after 6 seconds
      setTimeout(() => {
        if (pendingRequests.current.has(responseType)) {
          pendingRequests.current.delete(responseType);
          resolve(null);
        }
      }, 6000);
    });
  }, []);

  return useMemo(() => ({
    isConnected,
    metadata,
    playback,
    sendControl,
    sendRequest,
  }), [isConnected, metadata, playback, sendControl, sendRequest]);
}
