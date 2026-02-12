'use client';

import { useEffect, useMemo, useState } from 'react';

interface RoomPageProps {
  params: {
    roomName: string;
  };
}

const DAILY_SUBDOMAIN = process.env.NEXT_PUBLIC_DAILY_SUBDOMAIN;

if (!DAILY_SUBDOMAIN) {
  throw new Error('NEXT_PUBLIC_DAILY_SUBDOMAIN environment variable is required but not configured');
}

function buildDailyRoomUrl(roomName: string): string {
  return `https://${DAILY_SUBDOMAIN}.daily.co/${encodeURIComponent(roomName)}`;
}

function detectMobileViewport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
}

export default function RoomPage({ params }: RoomPageProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const roomUrl = useMemo(() => buildDailyRoomUrl(params.roomName), [params.roomName]);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsMobileViewport(detectMobileViewport());
    };

    updateViewportMode();

    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateViewportMode);
    } else if (typeof mediaQuery.addListener === 'function') {
      // Fallback for older Safari/iOS where MediaQueryList uses addListener/removeListener
      mediaQuery.addListener(updateViewportMode);
    }

    window.addEventListener('resize', updateViewportMode);
    window.addEventListener('orientationchange', updateViewportMode);

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', updateViewportMode);
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(updateViewportMode);
      }
      window.removeEventListener('resize', updateViewportMode);
      window.removeEventListener('orientationchange', updateViewportMode);
    };
  }, []);

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
