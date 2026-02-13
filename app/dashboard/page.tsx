'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { getNightPassRemaining } from '@/lib/countdown';

type BurnerRoom = {
  id: string;
  createdAt: string;
  url: string;
};

type CreatorAccount = {
  email: string;
  passwordHash: string;
  displayName: string;
  customSlug: string;
  credits: number;
  rooms: BurnerRoom[];
  predatorWatermark: boolean;
  geoBlockBannedStates: boolean;
};

type AuthMode = 'login' | 'register';

const ACCOUNT_STORAGE_KEY = 'sanctum.creator.account';
const SESSION_STORAGE_KEY = 'sanctum.creator.session';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  // Use for-loop for better performance - avoids intermediate array creation
  const bytes = new Uint8Array(hashBuffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

function readStoredAccount(): CreatorAccount | null {
  const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CreatorAccount;
    if (!parsed.email || !parsed.passwordHash || !parsed.customSlug) {
      return null;
    }

    return {
      ...parsed,
      credits: parsed.credits ?? 3,
      rooms: parsed.rooms ?? [],
      predatorWatermark: parsed.predatorWatermark ?? true,
      geoBlockBannedStates: parsed.geoBlockBannedStates ?? true,
    };
  } catch {
    return null;
  }
}

function writeStoredAccount(account: CreatorAccount) {
  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
}

export default function DashboardPage() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [sessionEmail, setSessionEmail] = useState('');
  const [account, setAccount] = useState<CreatorAccount | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerSlug, setRegisterSlug] = useState('');

  const [roomFeedback, setRoomFeedback] = useState('');
  const [latestUrl, setLatestUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    const session = window.localStorage.getItem(SESSION_STORAGE_KEY) ?? '';
    const stored = readStoredAccount();
    setSessionEmail(session);
    setAccount(stored);
    if (!stored) setAuthMode('register');
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const isAuthed = Boolean(account && sessionEmail && account.email === sessionEmail);

  const handleLogin = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAuthLoading(true);
      setAuthFeedback('');
  const refreshDepositStatus = useCallback(async () => {
    if (!account) {
      setDepositStatus('deposit_missing');
      return;
    }

    try {
      const response = await fetch(`/api/payments/deposit/status?creator_id=${encodeURIComponent(account.customSlug)}`);
      const data = (await response.json()) as DepositStatusResponse;
      setDepositStatus(response.ok && data.status ? data.status : 'deposit_missing');
    } catch {
      setDepositStatus('deposit_missing');
    }

    if (account?.onboardingStatus) {
      setOnboardingStatus(parseBackendCreatorStatus(account.onboardingStatus));
      return;
    }

    const envStatus = parseBackendCreatorStatus(process.env.NEXT_PUBLIC_CREATOR_ONBOARDING_STATUS);
    setOnboardingStatus(envStatus);
  }, [account]);

  useEffect(() => {
    if (!isAuthed || !account) {
      return;
    }

    const currentStep = getOnboardingStatusView(onboardingStatus).currentStep;
    const event = {
      event: 'creator_onboarding_step_seen',
      step: currentStep,
      status: onboardingStatus,
      timestamp: new Date().toISOString(),
    };

      const stored = readStoredAccount();
      if (!stored || stored.email.toLowerCase() !== loginEmail.trim().toLowerCase()) {
        setAuthLoading(false);
        setAuthFeedback('No account found for this email.');
        return;
      }

      const valid = await verifyPassword(loginPassword, stored.passwordHash);
      if (!valid) {
        setAuthLoading(false);
        setAuthFeedback('Incorrect password.');
    }
    // Keep only last 100 events to prevent unbounded growth
    const MAX_ANALYTICS_EVENTS = 100;
    const updatedEvents = [...existingEvents, event].slice(-MAX_ANALYTICS_EVENTS);
    window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(updatedEvents));

    const { dataLayer } = window as Window & { dataLayer?: unknown[] };
    if (Array.isArray(dataLayer)) {
      dataLayer.push(event);
    }
  }, [account, isAuthed, onboardingStatus]);

  useEffect(() => {
    if (!isAuthed) {
      return;
    }

    void refreshDepositStatus();
  }, [isAuthed, refreshDepositStatus]);

  const handleInitiateDeposit = useCallback(async () => {
    if (!account) {
      return;
    }

    setIsInitiatingDeposit(true);
    setDepositFeedback('');

    try {
      const response = await fetch('/api/payments/deposit/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `deposit-${account.customSlug}-${Date.now()}`,
        },
        body: JSON.stringify({
          creator_id: account.customSlug,
          provider: 'stripe',
          amount: 500,
          currency: 'USD',
        }),
      });

      if (!response.ok) {
        setDepositFeedback('Unable to initiate deposit. Please retry.');
        return;
      }

      window.localStorage.setItem(SESSION_STORAGE_KEY, stored.email);
      setSessionEmail(stored.email);
      setAccount(stored);
      setAuthLoading(false);
      setAuthFeedback('Authenticated. Welcome back to the cockpit.');
    },
    [loginEmail, loginPassword],
  );

  const handleRegister = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAuthLoading(true);
      setAuthFeedback('');

      const normalizedEmail = registerEmail.trim().toLowerCase();
      const slug = toSlug(registerSlug || registerName);

      if (!registerName.trim() || !normalizedEmail || !registerPassword || !slug) {
        setAuthFeedback('Name, email, password, and custom slug are required.');
        setAuthLoading(false);
        return;
      }

      const nextAccount: CreatorAccount = {
        email: normalizedEmail,
        passwordHash: await hashPassword(registerPassword),
        displayName: registerName.trim(),
        customSlug: slug,
        credits: 3,
        rooms: [],
        predatorWatermark: true,
        geoBlockBannedStates: true,
      };

      writeStoredAccount(nextAccount);
      window.localStorage.setItem(SESSION_STORAGE_KEY, nextAccount.email);
      setAccount(nextAccount);
      setSessionEmail(nextAccount.email);
      setAuthLoading(false);
      setAuthFeedback('Registration complete. Iron Gate cleared.');
    },
    [registerEmail, registerName, registerPassword, registerSlug],
  );

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionEmail('');
    setRoomFeedback('');
    setLatestUrl('');
  }, []);

  const handleGenerateLink = useCallback(async () => {
    if (!account) return;

    setIsGenerating(true);
    setRoomFeedback('');

    try {
      const response = await fetch('/api/create-room', { method: 'POST' });
      const body = (await response.json()) as { roomName?: string; url?: string; error?: string };

      if (!response.ok || !body.roomName || !body.url) {
        setRoomFeedback(body.error ?? 'Unable to create room.');
        return;
      }

      const room: BurnerRoom = {
        id: body.roomName,
        url: body.url,
        createdAt: new Date().toISOString(),
      };

      const next = { ...account, rooms: [room, ...account.rooms] };
      setAccount(next);
      writeStoredAccount(next);
      setLatestUrl(room.url);
      setRoomFeedback('Secure room generated.');
    } catch {
      setRoomFeedback('Unable to create room. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  }, [account]);

  const handleToggle = useCallback(
    (field: 'predatorWatermark' | 'geoBlockBannedStates') => {
      if (!account) return;
      const next = { ...account, [field]: !account[field] };
      setAccount(next);
      writeStoredAccount(next);
    },
    [account],
  );

  const handleCopy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setRoomFeedback('Link copied.');
      if (navigator.vibrate) navigator.vibrate(20);
    } catch {
      setRoomFeedback('Copy failed.');
    }
  }, []);

  const creatorUrl = useMemo(() => {
    if (!account) return '';
    return `${origin}/c/${account.customSlug}`;
  }, [account, origin]);
    return typeof window === 'undefined' ? `/c/${account.customSlug}` : `${window.location.origin}/c/${account.customSlug}`;
  }, [account]);

  const onboardingView = useMemo(() => getOnboardingStatusView(onboardingStatus), [onboardingStatus]);
  const onboardingSteps = useMemo(() => buildOnboardingSteps(onboardingStatus), [onboardingStatus]);
  const isDashboardLocked = useMemo(() => onboardingStatus !== 'active', [onboardingStatus]);

  if (!isAuthed) {
    return (
      <main className="min-h-[100dvh] bg-void px-6 py-8 text-slate-100">
        <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-800 bg-black p-6">
          <h1 className="text-2xl font-semibold text-neon-green">The Iron Gate</h1>
          <p className="mt-2 text-sm text-slate-400">Federal law requires verified creator identity before activation.</p>
          <div className="mt-5 flex gap-2">
            <button className={`flex-1 rounded-md px-3 py-2 ${authMode === 'login' ? 'bg-neon-green text-black' : 'bg-slate-900'}`} onClick={() => setAuthMode('login')}>Login</button>
            <button className={`flex-1 rounded-md px-3 py-2 ${authMode === 'register' ? 'bg-neon-green text-black' : 'bg-slate-900'}`} onClick={() => setAuthMode('register')}>Register</button>
          </div>

          {authMode === 'login' ? (
            <form className="mt-4 space-y-3" onSubmit={handleLogin}>
              <input className="w-full rounded-md border border-slate-700 bg-void px-3 py-2" type="email" placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              <input className="w-full rounded-md border border-slate-700 bg-void px-3 py-2" type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              <button className="w-full rounded-md bg-neon-green px-4 py-3 font-semibold text-black" disabled={authLoading}>Authenticate</button>
            </form>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={handleRegister}>
              <input className="w-full rounded-md border border-slate-700 bg-void px-3 py-2" type="text" placeholder="Display name" value={registerName} onChange={(e) => setRegisterName(e.target.value)} />
              <input className="w-full rounded-md border border-slate-700 bg-void px-3 py-2" type="email" placeholder="Email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} />
              <input className="w-full rounded-md border border-slate-700 bg-void px-3 py-2" type="password" placeholder="Password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} />
              <input className="w-full rounded-md border border-slate-700 bg-void px-3 py-2" type="text" placeholder="Custom slug" value={registerSlug} onChange={(e) => setRegisterSlug(e.target.value)} />
              <button className="w-full rounded-md bg-neon-green px-4 py-3 font-semibold text-black" disabled={authLoading}>Create account</button>
            </form>
          )}

          {authFeedback ? <p className="mt-3 text-sm text-slate-300">{authFeedback}</p> : null}
          <Link href="/" className="mt-4 inline-block text-sm text-slate-400 underline">Back to site</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-void px-4 py-6 text-slate-100">
      <section className="mx-auto w-full max-w-xl space-y-4 rounded-2xl border border-slate-800 bg-black p-4">
        <header className="flex items-start justify-between">
          <div>
            <p className="mono-data text-xs uppercase tracking-[0.3em] text-neon-green">Creator cockpit</p>
            <h1 className="text-xl font-semibold">The Sovereign Gate</h1>
          </div>
          <div className="rounded-md border border-neon-green/60 bg-neon-green/10 px-3 py-2 text-right">
            <p className="mono-data text-xs text-slate-300">Credits</p>
            <p className="mono-data text-lg font-semibold text-neon-green">{account?.credits ?? 0}</p>
          </div>
        </header>

        <button
          onClick={handleGenerateLink}
          disabled={isGenerating}
          className="mono-data w-full rounded-xl border border-neon-green bg-neon-green/10 px-4 py-8 text-lg font-semibold tracking-[0.2em] text-neon-green transition hover:bg-neon-green/20 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {isGenerating ? 'GENERATING…' : '[ GENERATE SAFE LINK ]'}
        </button>

        <section className="rounded-lg border border-slate-800 bg-void p-3">
          <p className="mono-data text-xs uppercase tracking-[0.2em] text-slate-400">Control toggles</p>
          <div className="mt-3 grid gap-2">
            <button className="flex items-center justify-between rounded-md border border-slate-700 px-3 py-2" onClick={() => handleToggle('predatorWatermark')}>
              <span>Predator Watermark</span>
              <span className={account?.predatorWatermark ? 'text-neon-green' : 'text-slate-400'}>{account?.predatorWatermark ? 'ON' : 'OFF'}</span>
            </button>
            <button className="flex items-center justify-between rounded-md border border-slate-700 px-3 py-2" onClick={() => handleToggle('geoBlockBannedStates')}>
              <span>Geo-Block Banned States</span>
              <span className={account?.geoBlockBannedStates ? 'text-neon-green' : 'text-slate-400'}>
                {account?.geoBlockBannedStates ? 'ON (TX, UT, NC, VA)' : 'OFF'}
              </span>
            </button>
          </div>
        </section>

        {latestUrl ? (
          <div className="rounded-lg border border-slate-800 bg-void p-3">
            <p className="mono-data break-all text-sm text-neon-green">{origin}{latestUrl}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => void handleCopy(`${origin}${latestUrl}`)} className="rounded-md border border-slate-700 px-3 py-2 text-xs">Copy link</button>
              <Link href={latestUrl} className="rounded-md border border-neon-green px-3 py-2 text-xs text-neon-green">Open room</Link>
            </div>
          </div>
        ) : null}

        <section className="rounded-lg border border-slate-800 bg-void p-3">
          <p className="mono-data text-xs uppercase tracking-[0.2em] text-slate-400">Active rooms</p>
          {account?.rooms.length ? (
            <ul className="mt-3 space-y-2">
              {account.rooms.map((room) => (
                <li key={room.id} className="rounded-md border border-slate-800 bg-black p-3">
                  <p className="mono-data break-all text-sm text-neon-green">{origin}{room.url}</p>
                  <p className="mono-data mt-1 text-xs text-slate-400">Expires in {getNightPassRemaining(room.createdAt, clock)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No active rooms.</p>
          )}
        </section>

        <div className="rounded-lg border border-slate-800 bg-void p-3">
          <p className="mono-data text-xs text-slate-400">Static link</p>
          <p className="mono-data mt-1 break-all text-sm text-neon-green">{creatorUrl}</p>
        </div>

        {roomFeedback ? <p className="text-sm text-slate-300">{roomFeedback}</p> : null}

        <button onClick={handleLogout} className="w-full rounded-md border border-danger px-3 py-2 text-sm text-red-400">Logout</button>
      </section>
    </main>
  );
}
