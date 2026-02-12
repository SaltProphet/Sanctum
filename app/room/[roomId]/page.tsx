'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';

type RoomPageProps = {
  params: {
    roomId: string;
  };
};

const MOCK_IP = '203.0.113.42';

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const callObjectRef = useRef<ReturnType<typeof DailyIframe.createFrame> | null>(null);

  const roomUrl = useMemo(() => {
    const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN;

    if (!dailyDomain) {
      return '';
    }

    return `https://${dailyDomain}/${params.roomId}`;
  }, [params.roomId]);

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

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div id="daily-frame" className="h-full w-full" />

      <div className="pointer-events-none absolute inset-0 z-50 opacity-30">
        <div className="grid h-full w-full grid-cols-1 gap-8 p-6 text-white">
          {Array.from({ length: 12 }).map((_, rowIndex) => (
            <p key={`watermark-${rowIndex}`} className="text-sm tracking-wider whitespace-nowrap">
              {Array.from({ length: 4 })
                .map(() => `DO NOT RECORD - IP: ${MOCK_IP}`)
                .join('   ')}
            </p>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handlePanicLeave}
        className="absolute bottom-6 left-1/2 z-60 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-red-600 text-xs font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
      >
        Panic
      </button>
    </main>
  );
}
