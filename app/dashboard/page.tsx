'use client';

import { useState } from 'react';

type CreateRoomResponse = {
  roomName?: string;
  name?: string;
};

export default function DashboardPage() {
  const [roomUrl, setRoomUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  const handleGenerateLink = async () => {
    setIsLoading(true);
    setCopyFeedback('');

    try {
      const response = await fetch('/api/create-room', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate room link.');
      }

      const data = (await response.json()) as CreateRoomResponse;
      const roomName = data.roomName ?? data.name;

      if (!roomName) {
        throw new Error('Response missing room name.');
      }

      const generatedUrl = `${window.location.origin}/room/by-name/${roomName}`;
      setRoomUrl(generatedUrl);
    } catch {
      setRoomUrl('');
      setCopyFeedback('Unable to generate link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!roomUrl) return;

    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopyFeedback('Link copied to clipboard.');
    } catch {
      setCopyFeedback('Copy failed. Please copy manually.');
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        color: '#f5f5f5',
        padding: '1rem',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#171717',
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Room Link Generator</h1>

        <button
          onClick={handleGenerateLink}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            backgroundColor: isLoading ? '#525252' : '#2563eb',
            color: '#ffffff',
          }}
        >
          {isLoading ? 'Generating...' : 'Generate 30-Minute Link'}
        </button>

        <p style={{ marginTop: '0.75rem', marginBottom: 0, color: '#ef4444', fontWeight: 600 }}>
          Link expires in 30 minutes.
        </p>

        {roomUrl ? (
          <div style={{ marginTop: '1.25rem' }}>
            <label htmlFor="generated-room-link" style={{ marginBottom: '0.5rem', display: 'block' }}>
              Generated Link
            </label>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <input
                id="generated-room-link"
                value={roomUrl}
                readOnly
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '0.65rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #3a3a3a',
                  backgroundColor: '#0f0f0f',
                  color: '#f5f5f5',
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #3a3a3a',
                  backgroundColor: '#262626',
                  color: '#f5f5f5',
                  cursor: 'pointer',
                }}
              >
                Copy
              </button>
            </div>
          </div>
        ) : null}

        {copyFeedback ? (
          <p style={{ marginTop: '0.75rem' }} role="status" aria-live="polite">
            {copyFeedback}
          </p>
        ) : null}
      </section>
    </main>
  );
}
