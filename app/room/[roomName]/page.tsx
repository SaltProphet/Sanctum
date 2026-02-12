'use client';

import { useEffect, useMemo, useState } from 'react';

interface RoomPageProps {
  params: {
    roomName: string;
  };
}

function buildDailyRoomUrl(roomName: string): string {
  const subdomain = process.env.NEXT_PUBLIC_DAILY_SUBDOMAIN;
  if (!subdomain) {
    throw new Error('NEXT_PUBLIC_DAILY_SUBDOMAIN environment variable is not configured');
  }
  return `https://${subdomain}.daily.co/${encodeURIComponent(roomName)}`;
}

export default function RoomPage({ params }: RoomPageProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const roomUrl = useMemo(() => buildDailyRoomUrl(params.roomName), [params.roomName]);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsMobileViewport(window.matchMedia('(max-width: 768px), (pointer: coarse)').matches);
    };

    updateViewportMode();

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
