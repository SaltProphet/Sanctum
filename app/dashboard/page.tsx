'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type CreateRoomResponse = {
  roomName?: string;
  name?: string;
  url?: string;
};

type BurnerRoom = {
  id: string;
  createdAt: string;
  url: string;
};

type CreatorAccount = {
  email: string;
  password: string;
  displayName: string;
  customSlug: string;
  slugChangeUsed: boolean;
  rooms: BurnerRoom[];
};

type AuthMode = 'login' | 'register';

const ACCOUNT_STORAGE_KEY = 'sanctum.creator.account';
const SESSION_STORAGE_KEY = 'sanctum.creator.session';

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

  if (!rawAccount) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawAccount) as CreatorAccount;

    if (!parsed.email || !parsed.password || !parsed.customSlug) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredAccount(account: CreatorAccount) {
  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
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
  const [hydrated, setHydrated] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [sessionEmail, setSessionEmail] = useState('');
  const [account, setAccount] = useState<CreatorAccount | null>(null);

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

  useEffect(() => {
    setHydrated(true);

    const session = window.localStorage.getItem(SESSION_STORAGE_KEY) ?? '';
    const storedAccount = readStoredAccount();

    setSessionEmail(session);
    setAccount(storedAccount);

    if (!storedAccount) {
      setAuthMode('register');
      return;
    }

    if (storedAccount.customSlug) {
      setRegisterSlug(storedAccount.customSlug);
      setNewSlug(storedAccount.customSlug);
    }
  }, []);

  const isAuthed = Boolean(account && sessionEmail && account.email === sessionEmail);

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
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAuthFeedback('');

      const slug = toSlug(registerSlug || registerName);

      if (!registerName || !registerEmail || !registerPassword) {
        setAuthFeedback('All register fields are required.');
        return;
      }

      if (!slug || !isValidSlug(slug)) {
        setAuthFeedback('Choose a valid custom URL slug (letters, numbers, dashes).');
        return;
      }

      const nextAccount: CreatorAccount = {
        displayName: registerName,
        email: registerEmail.toLowerCase(),
        password: registerPassword,
        customSlug: slug,
        slugChangeUsed: false,
        rooms: [],
      };

      writeStoredAccount(nextAccount);
      window.localStorage.setItem(SESSION_STORAGE_KEY, nextAccount.email);

      setAccount(nextAccount);
      setSessionEmail(nextAccount.email);
      setNewSlug(nextAccount.customSlug);
      setAuthFeedback('Registration complete. Welcome to your dashboard.');
    },
    [registerEmail, registerName, registerPassword, registerSlug],
  );

  const handleLogin = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAuthFeedback('');

      const storedAccount = readStoredAccount();

      if (!storedAccount) {
        setAuthFeedback('No creator account found yet. Please register first.');
        setAuthMode('register');
        return;
      }

      if (
        storedAccount.email !== loginEmail.toLowerCase() ||
        storedAccount.password !== loginPassword
      ) {
        setAuthFeedback('Invalid email or password.');
        return;
      }

      window.localStorage.setItem(SESSION_STORAGE_KEY, storedAccount.email);
      setSessionEmail(storedAccount.email);
      setAccount(storedAccount);
      setNewSlug(storedAccount.customSlug);
      setAuthFeedback('Login successful.');
    },
    [loginEmail, loginPassword],
  );

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionEmail('');
    setRoomUrl('');
    setCopyFeedback('');
    setAuthFeedback('Logged out.');
  }, []);

  const handleSlugUpdate = useCallback(() => {
    if (!account) {
      return;
    }

    const candidate = toSlug(newSlug);

    if (!candidate || !isValidSlug(candidate)) {
      setAuthFeedback('Custom URL is invalid. Use letters, numbers, and dashes only.');
      return;
    }

    if (candidate === account.customSlug) {
      setAuthFeedback('That custom URL is already active.');
      return;
    }

    if (account.slugChangeUsed) {
      setAuthFeedback('Your included one-time custom URL change has already been used.');
      return;
    }

    const updatedAccount: CreatorAccount = {
      ...account,
      customSlug: candidate,
      slugChangeUsed: true,
    };

    writeStoredAccount(updatedAccount);
    setAccount(updatedAccount);
    setAuthFeedback('Custom URL updated. Your one-time included change is now used.');
  }, [account, newSlug]);

  const handleGenerateLink = useCallback(async () => {
    if (!account) {
      return;
    }

    setIsLoading(true);
    setCopyFeedback('');

    try {
      const response = await fetch('/api/create-room', { method: 'POST' });
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
      const canonicalPath = data.url ?? (roomName ? `/room/${roomName}` : '');

      if (!canonicalPath.startsWith('/room/')) {
        throw new Error('Response missing canonical room URL.');
      }

      const generatedUrl = `${window.location.origin}/room/${roomName}`;
      const nextRoom: BurnerRoom = {
        id: roomName,
        createdAt: new Date().toISOString(),
        url: generatedUrl,
      };

      const updatedAccount: CreatorAccount = {
        ...account,
        rooms: [nextRoom, ...account.rooms].slice(0, 25),
      };

      writeStoredAccount(updatedAccount);
      setAccount(updatedAccount);
      const generatedUrl = `${window.location.origin}${canonicalPath}`;
      setRoomUrl(generatedUrl);
    } catch (error) {
      setRoomUrl('');
      setCopyFeedback(error instanceof Error ? error.message : 'Unable to generate link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  const handleCopy = useCallback(async (value: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback('Link copied to clipboard.');
    } catch {
      setCopyFeedback('Copy failed. Please copy manually.');
    }
  }, []);

  if (!hydrated) {
    return null;
  }

  if (!isAuthed) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-slate-100">
        <section className="mx-auto w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
          <h1 className="mb-5 text-2xl font-bold text-neon-green">Creator Access</h1>

          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                authMode === 'login' ? 'bg-neon-green text-black' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                authMode === 'register'
                  ? 'bg-neon-green text-black'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Register
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                type="email"
                placeholder="Email"
                className="w-full rounded-md border border-slate-600 bg-black px-3 py-2"
              />
              <input
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                type="password"
                placeholder="Password"
                className="w-full rounded-md border border-slate-600 bg-black px-3 py-2"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-neon-green px-4 py-2 font-semibold text-black"
              >
                Log in to dashboard
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <input
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                type="text"
                placeholder="Display name"
                className="w-full rounded-md border border-slate-600 bg-black px-3 py-2"
              />
              <input
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                type="email"
                placeholder="Email"
                className="w-full rounded-md border border-slate-600 bg-black px-3 py-2"
              />
              <input
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                type="password"
                placeholder="Password"
                className="w-full rounded-md border border-slate-600 bg-black px-3 py-2"
              />
              <input
                value={registerSlug}
                onChange={(event) => setRegisterSlug(event.target.value)}
                type="text"
                placeholder="Custom URL slug (e.g. star-coach)"
                className="w-full rounded-md border border-slate-600 bg-black px-3 py-2"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-neon-green px-4 py-2 font-semibold text-black"
              >
                Register and open dashboard
              </button>
            </form>
          )}

          {authFeedback ? <p className="mt-3 text-sm text-slate-300">{authFeedback}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-slate-100">
      <section className="mx-auto w-full max-w-3xl space-y-6 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neon-green">Creator Dashboard</h1>
            <p className="text-sm text-slate-300">Welcome back, {account?.displayName}.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Log out
          </button>
        </header>

        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <h2 className="text-lg font-semibold text-slate-50">Your creator URL</h2>
          <p className="mt-2 break-all font-mono text-sm text-neon-green">{creatorBaseUrl}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={newSlug}
              onChange={(event) => setNewSlug(event.target.value)}
              className="w-full rounded-md border border-slate-600 bg-black px-3 py-2 text-sm"
              placeholder="Update slug one time"
            />
            <button
              type="button"
              onClick={handleSlugUpdate}
              className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-black"
            >
              Save one-time change
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            One included custom URL change: {account?.slugChangeUsed ? 'Used' : 'Available'}.
          </p>
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
            </div>
          ) : null}
          {copyFeedback ? <p className="mt-2 text-sm text-slate-300">{copyFeedback}</p> : null}
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <h2 className="text-lg font-semibold text-slate-50">Your room URLs</h2>
          {account && account.rooms.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {account.rooms.map((room) => (
                <li key={room.id} className="rounded-md border border-slate-700 bg-black p-3 text-sm">
                  <p className="break-all font-mono text-neon-green">{room.url}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Created: {new Date(room.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(room.url)}
                      className="rounded border border-slate-600 px-2 py-1 text-xs"
                    >
                      Copy
                    </button>
                    <Link
                      href={`/room/${room.id}`}
                      className="rounded border border-neon-green px-2 py-1 text-xs text-neon-green"
                    >
                      Open room
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              No burner rooms yet. Generate your first room URL above.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
