'use client';

import Link from 'next/link';
import { useState } from 'react';

type CreateRoomResponse = {
  roomName?: string;
  name?: string;
};

type PreflightFailure = {
  gate?: unknown;
  message?: unknown;
};

type CreateRoomErrorResponse = {
  error?: {
    code?: unknown;
    message?: unknown;
    failures?: unknown;
  };
};

function parseCreateRoomError(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return 'Unable to generate link. Please try again.';
  }

  const parsed = data as CreateRoomErrorResponse;
  const errorMessage = typeof parsed.error?.message === 'string' ? parsed.error.message : null;

  if (parsed.error?.code !== 'CREATOR_PREFLIGHT_FAILED') {
    return errorMessage ?? 'Unable to generate link. Please try again.';
  }

  const failures = Array.isArray(parsed.error.failures) ? (parsed.error.failures as PreflightFailure[]) : [];

  if (failures.length === 0) {
    return errorMessage ?? 'Room creation is blocked until creator checks pass.';
  }

  const details = failures
    .map((failure) => {
      const gate =
        failure.gate === 'payment'
          ? 'Payment'
          : failure.gate === 'verification'
            ? 'Verification'
            : 'Preflight';

      const message = typeof failure.message === 'string' ? failure.message : 'Check failed.';
      return `${gate}: ${message}`;
    })
    .join(' ');

  return details;
}

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creatorIdentityId: 'dashboard-creator' }),
      });

      const responseData = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(parseCreateRoomError(responseData));
      }

      const data = responseData as CreateRoomResponse;
      const roomName = data.roomName ?? data.name;

      if (!roomName) {
        throw new Error('Response missing room name.');
      }

      const generatedUrl = `${window.location.origin}/room/by-name/${roomName}`;
      setRoomUrl(generatedUrl);
    } catch (error) {
      setRoomUrl('');
      setCopyFeedback(error instanceof Error ? error.message : 'Unable to generate link. Please try again.');
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

        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#a3a3a3' }}>
          By generating a room, you agree to the{' '}
          <Link href="/terms" style={{ color: '#39ff14', textDecoration: 'underline' }}>
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
