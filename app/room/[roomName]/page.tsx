'use client';

import { useEffect, useMemo, useState } from 'react';

interface RoomPageProps {
  params: {
    roomName: string;
  };
}

const DAILY_SUBDOMAIN = process.env.NEXT_PUBLIC_DAILY_SUBDOMAIN;

if (!DAILY_SUBDOMAIN) {
  throw new Error(
    'NEXT_PUBLIC_DAILY_SUBDOMAIN environment variable is not configured. ' +
    'Please set it in your .env.local file.'
  );
}

function buildDailyRoomUrl(roomName: string): string {
  return `https://${DAILY_SUBDOMAIN}.daily.co/${encodeURIComponent(roomName)}`;
}

function isValidRoomName(roomName: string): boolean {
  // Validate against expected room naming patterns from the API:
  // 1. room-{UUID} format: room-550e8400-e29b-41d4-a716-446655440000
  // 2. room-{timestamp}-{random} format: room-1234567890-abc123xyz
  return /^room-[a-z0-9-]+$/i.test(roomName) && roomName.length >= 8;
}

function detectMobileViewport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
}

export default function RoomPage({ params }: RoomPageProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const isValid = useMemo(() => isValidRoomName(params.roomName), [params.roomName]);
  const roomUrl = useMemo(() => {
    if (!isValid) return '';
    return buildDailyRoomUrl(params.roomName);
  }, [params.roomName, isValid]);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsMobileViewport(detectMobileViewport());
    };

    updateViewportMode();

    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    mediaQuery.addEventListener('change', updateViewportMode);
    window.addEventListener('resize', updateViewportMode);
    window.addEventListener('orientationchange', updateViewportMode);

    return () => {
      mediaQuery.removeEventListener('change', updateViewportMode);
      window.removeEventListener('resize', updateViewportMode);
      window.removeEventListener('orientationchange', updateViewportMode);
    };
  }, []);
  
  // Validate room name before attempting to embed
  if (!isValid) {
    return (
      <main
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100dvh',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Invalid Room Name</h1>
          <p style={{ fontSize: '1rem', color: '#999' }}>
            The room name &quot;{params.roomName}&quot; is not valid. Please check the URL and try again.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      <iframe
        title={`Daily room ${params.roomName}`}
        src={roomUrl}
        allow="camera; microphone; fullscreen; speaker-selection; display-capture"
        allowFullScreen
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100dvh',
          border: 0,
          objectFit: isMobileViewport ? 'cover' : 'contain',
        }}
      />
    </main>
  );
}
