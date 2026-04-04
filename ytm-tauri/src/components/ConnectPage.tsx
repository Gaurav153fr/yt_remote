import React, { useState } from 'react';
import { ThemeColors } from '../hooks/useColorExtractor';

interface ConnectPageProps {
  isConnected: boolean;
  onJoin: (code: string) => void;
  theme: ThemeColors;
}

export const ConnectPage: React.FC<ConnectPageProps> = ({ isConnected, onJoin, theme }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError('Enter a valid room code');
      return;
    }
    setError('');
    onJoin(code);
  };

  return (
    <div className="connect-page">
      <div className="connect-glow" />

      <div className="connect-logo">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="28" fill="rgba(255,255,255,0.08)" />
          <path d="M20 18 L20 38 L40 28 Z" fill="white" />
          <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      <h1 className="connect-title">YTM Remote</h1>
      <p className="connect-subtitle">
        {isConnected ? 'Connected to server' : 'Connecting to server…'}
      </p>
      <div className={`connect-status-dot ${isConnected ? 'online' : 'offline'}`} />

      <div className="connect-card">
        <p className="connect-instructions">
          Open the <strong>YTM Remote</strong> extension in Chrome, click the popup icon, and enter the room code shown there.
        </p>

        <form onSubmit={handleSubmit} className="connect-form">
          <input
            className="connect-input"
            type="text"
            placeholder="ROOM CODE"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            maxLength={8}
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
          {error && <p className="connect-error">{error}</p>}
          <button
            className="connect-btn"
            type="submit"
            disabled={!isConnected}
            style={{
              background: isConnected
                ? `linear-gradient(135deg, rgba(${theme.accentRgb},0.8), rgba(${theme.accentRgb},0.4))`
                : 'rgba(255,255,255,0.05)',
            }}
          >
            {isConnected ? 'Connect to Room' : 'Waiting for server…'}
          </button>
        </form>
      </div>

      <p className="connect-hint">
        Room code resets every time the extension restarts
      </p>
    </div>
  );
};
