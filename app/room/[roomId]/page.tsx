'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';

type RoomPageProps = {
  params: {
    roomId: string;
  };
};

const MOCK_IP = '203.0.113.42';

type MeetingTokenResponse = {
  token?: string;
};

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callObjectRef = useRef<ReturnType<typeof DailyIframe.createFrame> | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [isJoining, setIsJoining] = useState(true);

  const roomUrl = useMemo(() => {
    const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN;

    if (!dailyDomain) {
      return '';
    }

    return `https://${dailyDomain}/${params.roomId}`;
  }, [params.roomId]);

  const role = useMemo(() => {
    return searchParams.get('role') === 'creator' ? 'creator' : 'viewer';
  }, [searchParams]);

  useEffect(() => {
    if (!roomUrl) {
      setTokenError('Missing NEXT_PUBLIC_DAILY_DOMAIN configuration.');
      setIsJoining(false);
      return;
    }

    const frameElement = document.getElementById('daily-frame');

    if (!frameElement) {
      setTokenError('Failed to initialize Daily frame.');
      setIsJoining(false);
      return;
    }

    let isDisposed = false;

    async function joinWithToken() {
      setIsJoining(true);
      setTokenError('');

      const tokenResponse = await fetch('/api/meeting-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomName: params.roomId, role }),
      });

      if (!tokenResponse.ok) {
        setTokenError('Unable to issue a meeting token for this room.');
        setIsJoining(false);
        return;
      }

      const tokenBody = (await tokenResponse.json()) as MeetingTokenResponse;

      if (typeof tokenBody.token !== 'string' || tokenBody.token.length === 0) {
        setTokenError('Received an invalid meeting token.');
        setIsJoining(false);
        return;
      }

      if (isDisposed) {
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

      try {
        await callObject.join({
          url: roomUrl,
          token: tokenBody.token,
        });
      } catch {
        setTokenError('Token-based join failed.');
      } finally {
        setIsJoining(false);
      }
    }

    void joinWithToken();

    return () => {
      isDisposed = true;

      const currentCall = callObjectRef.current;
      callObjectRef.current = null;

      if (!currentCall) {
        return;
      }

      void currentCall.leave().finally(() => {
        currentCall.destroy();
      });
    };
  }, [params.roomId, role, roomUrl]);

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
      {tokenError ? (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 p-6 text-center text-white">
          <p>{tokenError}</p>
        </div>
      ) : null}

      {isJoining ? (
        <div className="absolute inset-0 z-[65] flex items-center justify-center bg-black/50 p-6 text-center text-white">
          <p>Joining room…</p>
        </div>
      ) : null}

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
        className="absolute bottom-6 left-1/2 z-[60] flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-red-600 text-xs font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
      >
        Panic
      </button>
    </main>
  );
}
