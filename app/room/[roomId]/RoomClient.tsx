'use client';

import type { WatermarkTile } from '@/lib/watermark';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';

type RoomClientProps = {
  roomId: string;
  watermarkText: string;
  watermarkTiles: WatermarkTile[];
};

export default function RoomClient({ roomId, watermarkText, watermarkTiles }: RoomClientProps) {
  const router = useRouter();
  const callObjectRef = useRef<ReturnType<typeof DailyIframe.createFrame> | null>(null);

  const roomUrl = useMemo(() => {
    const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN;

    if (!dailyDomain) {
      console.error(
        'Missing NEXT_PUBLIC_DAILY_DOMAIN environment variable. ' +
        'Daily video chat will not work. Please configure this environment variable.',
      );
      return '';
    }

    return `https://${dailyDomain}/${roomId}`;
  }, [roomId]);

  const isMissingConfig = !roomUrl;

  useEffect(() => {
    if (!roomUrl) {
      return;
    }

    const frameElement = document.getElementById('daily-frame');

    if (!frameElement) {
      return;
    }

    const callObject = DailyIframe.createFrame(frameElement, {
      iframeStyle: {
        width: '100%',
        height: '100dvh',
        border: '0',
      },
      showLeaveButton: false,
    });

    callObjectRef.current = callObject;
    void callObject.join({ url: roomUrl });

    return () => {
      const currentCall = callObjectRef.current;
      callObjectRef.current = null;

      if (!currentCall) {
        return;
      }

      void currentCall.leave().finally(() => {
        currentCall.destroy();
      });
    };
  }, [roomUrl]);

  const handlePanicLeave = useCallback(() => {
    const currentCall = callObjectRef.current;

    if (!currentCall) {
      router.push('/');
      return;
    }

    void currentCall.leave().finally(() => {
      currentCall.destroy();
      callObjectRef.current = null;
      router.push('/');
    });
  }, [router]);

  if (isMissingConfig) {
    return (
      <main className="relative h-[100dvh] w-full overflow-hidden bg-black flex flex-col items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-white mb-4">Configuration Error</h1>
          <p className="text-slate-300 mb-6">
            The video chat service is not properly configured. Please contact support.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center justify-center rounded-lg bg-neon-green px-6 py-3 font-semibold text-black transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-neon-green focus:ring-offset-2 focus:ring-offset-black"
          >
            Go Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div id="daily-frame" className="h-full w-full" />

      <div className="pointer-events-none absolute inset-0 z-50">
        {watermarkTiles.map((tile) => (
          <p
            key={tile.id}
            className="absolute text-xs font-semibold tracking-wider text-white/90 select-none"
            style={{
              top: `${tile.topPercent}%`,
              left: `${tile.leftPercent}%`,
              transform: `translate(-50%, -50%) rotate(${tile.rotateDeg}deg)`,
              opacity: tile.opacity,
            }}
          >
            {watermarkText}
          </p>
        ))}
      </div>

      <button
        type="button"
        onClick={handlePanicLeave}
        className="absolute bottom-6 left-1/2 z-[60] flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-red-600 text-xs font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
      >
        Panic
      </button>
    </main>
  );
}
