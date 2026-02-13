'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  slugChangeUsed: boolean;
  credits: number;
  rooms: BurnerRoom[];
};

type DepositStatus =
  | 'deposit_missing'
  | 'deposit_pending'
  | 'deposit_paid'
  | 'deposit_failed'
  | 'deposit_refunded';

type DepositStatusResponse = {
  status?: DepositStatus;
};

type AuthMode = 'login' | 'register';

const ACCOUNT_STORAGE_KEY = 'sanctum.creator.account';
const SESSION_STORAGE_KEY = 'sanctum.creator.session';
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
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

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function readStoredAccount(): CreatorAccount | null {
  const rawAccount = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (!rawAccount) return null;

  try {
    const parsed = JSON.parse(rawAccount) as CreatorAccount;
    if (!parsed.email || !parsed.passwordHash || !parsed.customSlug) return null;
    return {
      ...parsed,
      credits: parsed.credits ?? 3,
      rooms: parsed.rooms ?? [],
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
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [latestUrl, setLatestUrl] = useState('');
  const [clock, setClock] = useState(Date.now());
  const [origin, setOrigin] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerSlug, setRegisterSlug] = useState('');

  const [newSlug, setNewSlug] = useState('');

  const [roomUrl, setRoomUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [authFeedback, setAuthFeedback] = useState('');
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('deposit_missing');
  const [depositFeedback, setDepositFeedback] = useState('');
  const [isInitiatingDeposit, setIsInitiatingDeposit] = useState(false);

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
  }, [account]);

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

      setDepositFeedback('Deposit initiated. Room creation unlocks only after confirmed settled/succeeded webhook.');
      await refreshDepositStatus();
    } catch {
      setDepositFeedback('Unable to initiate deposit. Please retry.');
    } finally {
      setIsInitiatingDeposit(false);
    }
  }, [account, refreshDepositStatus]);

  const depositNextStep = useMemo(() => {
    if (depositStatus === 'deposit_paid') {
      return 'Deposit settled. You can generate room links.';
    }

    if (depositStatus === 'deposit_failed') {
      return 'Deposit failed. Retry by initiating a new deposit.';
    }

    if (depositStatus === 'deposit_refunded') {
      return 'Deposit refunded. Start a new deposit to continue.';
    }

    if (depositStatus === 'deposit_pending') {
      return 'Deposit pending. Await provider webhook confirmation.';
    }

    return 'No deposit yet. Initiate a deposit to continue.';
  }, [depositStatus]);

  const creatorBaseUrl = useMemo(() => {
    if (!isAuthed || !account) {
      return '';
    }

    if (typeof window === 'undefined') {
      return `/c/${account.customSlug}`;
    }

    return `${window.location.origin}/c/${account.customSlug}`;
  }, [account, isAuthed]);

  const handleRegister = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFeedback('');
      const slug = toSlug(registerSlug || registerName);
      if (!registerName || !registerEmail || !registerPassword || !slug || !isValidSlug(slug)) {
        setFeedback('Complete all fields with a valid slug.');
        return;
      }

      setLoading(true);
      const passwordHash = await hashPassword(registerPassword);
      const nextAccount: CreatorAccount = {
        displayName: registerName,
        email: registerEmail.toLowerCase(),
        passwordHash,
        customSlug: slug,
        slugChangeUsed: false,
        credits: 3,
        rooms: [],
      };
      writeStoredAccount(nextAccount);
      window.localStorage.setItem(SESSION_STORAGE_KEY, nextAccount.email);
      setAccount(nextAccount);
      setSessionEmail(nextAccount.email);
      setLoading(false);
      setFeedback('Registration complete. Cockpit armed.');
    },
    [registerEmail, registerName, registerPassword, registerSlug],
  );

  const handleLogin = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFeedback('');
      const stored = readStoredAccount();
      if (!stored) {
        setFeedback('No account found. Register first.');
        setAuthMode('register');
        return;
      }
      if (stored.email !== loginEmail.toLowerCase() || !(await verifyPassword(loginPassword, stored.passwordHash))) {
        setFeedback('Invalid credentials.');
        return;
      }

      window.localStorage.setItem(SESSION_STORAGE_KEY, stored.email);
      setSessionEmail(stored.email);
      setAccount(stored);
      setFeedback('Authenticated.');
    },
    [loginEmail, loginPassword],
  );

  const handleGenerate = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setFeedback('');

    try {
      const response = await fetch('/api/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creatorIdentityId: account.customSlug }),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorIdentityId: account.email }),
      });
      const body = (await response.json()) as { roomName?: string; url?: string; error?: string };
      if (!response.ok || !body.roomName || !body.url) {
        setFeedback(body.error ?? 'Unable to generate safe link.');
        return;
      }

      const room: BurnerRoom = { id: body.roomName, url: body.url, createdAt: new Date().toISOString() };
      const nextAccount = { ...account, rooms: [room, ...account.rooms] };
      writeStoredAccount(nextAccount);
      setAccount(nextAccount);
      setLatestUrl(body.url);
      setFeedback('Safe link generated.');
      if (navigator.vibrate) navigator.vibrate(40);
    } catch {
      setFeedback('Unable to generate safe link.');
    } finally {
      setLoading(false);
    }
  }, [account]);

  const handleCopy = useCallback(async (url: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}${url}`);
    setFeedback('Link copied.');
    if (navigator.vibrate) navigator.vibrate([20, 10, 20]);
  }, []);

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionEmail('');
    setFeedback('Logged out.');
  }, []);

  const creatorUrl = useMemo(() => {
    if (!account) return '';
    return typeof window === 'undefined' ? `/c/${account.customSlug}` : `${window.location.origin}/c/${account.customSlug}`;
  }, [account]);

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
              <button className="w-full rounded-md bg-neon-green px-4 py-3 font-semibold text-black" disabled={loading}>Authenticate</button>
            </form>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={handleRegister}>
              <input className="w-full rounded-md border border-slate-700 bg-void px-3 py-2" type="text" placeholder="Display name" value={registerName} onChange={(e) => setRegisterName(e.target.value)} />
              <input className="w-full rounded-md border border-slate-700 bg-void px-3 py-2" type="email" placeholder="Email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} />
              <input className="w-full rounded-md border border-slate-700 bg-void px-3 py-2" type="password" placeholder="Password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} />
              <input className="w-full rounded-md border border-slate-700 bg-void px-3 py-2" type="text" placeholder="Custom slug" value={registerSlug} onChange={(e) => setRegisterSlug(e.target.value)} />
              <button className="w-full rounded-md bg-neon-green px-4 py-3 font-semibold text-black" disabled={loading}>Create account</button>
            </form>
          )}

          {feedback ? <p className="mt-3 text-sm text-slate-300">{feedback}</p> : null}
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

        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <h2 className="text-lg font-semibold text-slate-50">Deposit status</h2>
          <p className="mt-2 text-sm text-slate-300">
            Current status: <span className="font-semibold text-neon-green">{depositStatus}</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">{depositNextStep}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refreshDepositStatus()}
              className="rounded-md border border-slate-600 px-3 py-2 text-sm"
            >
              Refresh status
            </button>
            {(depositStatus === 'deposit_missing' ||
              depositStatus === 'deposit_failed' ||
              depositStatus === 'deposit_refunded') && (
              <button
                type="button"
                disabled={isInitiatingDeposit}
                onClick={() => void handleInitiateDeposit()}
                className="rounded-md bg-neon-green px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {isInitiatingDeposit ? 'Starting...' : 'Initiate deposit'}
              </button>
            )}
          </div>
          {depositFeedback ? <p className="mt-2 text-sm text-slate-300">{depositFeedback}</p> : null}
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <h2 className="text-lg font-semibold text-slate-50">Burner room generator</h2>
          <button
            onClick={handleGenerateLink}
            disabled={isLoading}
            className="mt-3 w-full rounded-md bg-neon-green px-4 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isLoading ? 'Generating...' : 'Create burner room URL'}
          </button>
          {roomUrl ? (
            <div className="mt-3 space-y-2">
              <p className="break-all rounded-md border border-slate-700 bg-black px-3 py-2 font-mono text-sm">
                {roomUrl}
              </p>
              <button
                type="button"
                onClick={() => handleCopy(roomUrl)}
                className="rounded-md border border-slate-600 px-3 py-2 text-sm"
              >
                Copy latest URL
              </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mono-data w-full rounded-xl border border-neon-green bg-neon-green/10 px-4 py-8 text-lg font-semibold tracking-[0.2em] text-neon-green transition hover:bg-neon-green/20"
        >
          {loading ? 'GENERATING…' : '[ GENERATE SAFE LINK ]'}
        </button>

        {latestUrl ? (
          <div className="rounded-lg border border-slate-800 bg-void p-3">
            <p className="mono-data break-all text-sm text-neon-green">{origin}{latestUrl}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => handleCopy(latestUrl)} className="rounded-md border border-slate-700 px-3 py-2 text-xs">Copy link</button>
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

        {feedback ? <p className="text-sm text-slate-300">{feedback}</p> : null}

        <button onClick={handleLogout} className="w-full rounded-md border border-danger px-3 py-2 text-sm text-red-400">Logout</button>
      </section>
    </main>
  );
}
