'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';

type WatermarkTile = {
  id: string;
  topPercent: number;
  leftPercent: number;
  rotateDeg: number;
  opacity: number;
};

type RoomClientProps = {
  roomId: string;
  watermarkText: string;
  watermarkTiles: WatermarkTile[];
};

export default function RoomClient({ roomId, watermarkText, watermarkTiles }: RoomClientProps) {
  const router = useRouter();
  const callObjectRef = useRef<ReturnType<typeof DailyIframe.createFrame> | null>(null);
  const [waiting, setWaiting] = useState(true);

  const roomUrl = useMemo(() => {
    const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN;
    if (!dailyDomain) return '';
    return `https://${dailyDomain}/${roomId}`;
  }, [roomId]);

  useEffect(() => {
    if (!roomUrl) return;
    const frameElement = document.getElementById('daily-frame');
    if (!frameElement) return;

    const callObject = DailyIframe.createFrame(frameElement, {
      iframeStyle: { width: '100%', height: '100dvh', border: '0' },
      showLeaveButton: false,
    });

    callObject.on('joined-meeting', () => setWaiting(false));
    callObject.on('left-meeting', () => setWaiting(true));

    callObjectRef.current = callObject;
    void callObject.join({ url: roomUrl });

    return () => {
      const current = callObjectRef.current;
      callObjectRef.current = null;
      if (!current) return;
      void current.leave().finally(() => current.destroy());
    };
  }, [roomUrl]);

  const handlePanicLeave = useCallback(() => {
    const currentCall = callObjectRef.current;
    if (!currentCall) {
      window.location.href = 'https://google.com';
      return;
    }

    void currentCall.leave().finally(() => {
      currentCall.destroy();
      callObjectRef.current = null;
      window.location.href = 'https://google.com';
    });
  }, []);

  if (!roomUrl) {
    return (
      <main className="flex h-[100dvh] items-center justify-center bg-black px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Configuration Error</h1>
          <button type="button" onClick={() => router.push('/')} className="mt-4 rounded-md bg-neon-green px-4 py-2 font-semibold text-black">
            Go Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div id="daily-frame" className="h-full w-full" />

      {waiting ? (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/95">
          <div className="h-12 w-12 animate-pulse rounded-full border border-neon-green/70" />
          <p className="mono-data mt-4 text-sm tracking-[0.2em] text-neon-green">IDENTITY VERIFIED. ENTERING SECURE SESSION…</p>
          <p className="mt-2 text-xs text-slate-400">Waiting for Host...</p>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-50">
        {watermarkTiles.map((tile) => (
          <p
            key={tile.id}
            className="mono-data absolute select-none text-xs tracking-wider text-white"
            style={{
              top: `${tile.topPercent}%`,
              left: `${tile.leftPercent}%`,
              transform: `translate(-50%, -50%) rotate(${tile.rotateDeg}deg)`,
              opacity: 0.3,
            }}
          >
            {watermarkText}
          </p>
        ))}
      </div>

      <div className="pointer-events-none absolute left-4 top-4 z-[60] flex items-center gap-2 rounded-full border border-neon-green/60 bg-black/70 px-3 py-1 text-xs text-neon-green">
        <span className="h-2 w-2 animate-pulse rounded-full bg-neon-green" /> Encrypted: P2P
      </div>

      <button
        type="button"
        onClick={handlePanicLeave}
        className="absolute right-4 top-4 z-[70] flex h-12 w-12 items-center justify-center rounded-full border border-danger bg-danger/90 text-xl font-bold text-white"
        aria-label="Panic kill switch"
      >
        ✕
      </button>
    </main>
  );
}
