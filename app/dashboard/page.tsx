"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildOnboardingSteps,
  getOnboardingStatusView,
  parseBackendCreatorStatus,
  type BackendCreatorStatus,
  type OnboardingAction,
} from "@/lib/creatorOnboarding";

type CreateRoomResponse = {
  roomName?: string;
  name?: string;
  url?: string;
};
import { getNightPassRemaining } from "@/lib/countdown";

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
  onboardingStatus?: BackendCreatorStatus;
  onboardingReferenceId?: string;
};

type DepositStatus =
  | "deposit_missing"
  | "deposit_pending"
  | "deposit_paid"
  | "deposit_failed"
  | "deposit_refunded";

type DepositStatusResponse = {
  status?: DepositStatus;
};

type AuthMode = "login" | "register";

const ACCOUNT_STORAGE_KEY = "sanctum.creator.account";
const SESSION_STORAGE_KEY = "sanctum.creator.session";
const ANALYTICS_STORAGE_KEY = "sanctum.creator.onboarding.analytics";

/**
 * Simple hash function for password verification in demo/prototype environment.
 * WARNING: This is NOT suitable for production. Passwords should never be stored
 * on the client side. Use proper server-side authentication in production.
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(password),
  );
  // Use for-loop for better performance - avoids intermediate array creation
  const bytes = new Uint8Array(hashBuffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
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
    if (!parsed.email || !parsed.passwordHash || !parsed.customSlug)
      return null;
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
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [sessionEmail, setSessionEmail] = useState("");
  const [account, setAccount] = useState<CreatorAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [clock, setClock] = useState(Date.now());

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerSlug, setRegisterSlug] = useState("");

  const [newSlug, setNewSlug] = useState("");

  const [roomUrl, setRoomUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [authFeedback, setAuthFeedback] = useState("");
  const [onboardingStatus, setOnboardingStatus] =
    useState<BackendCreatorStatus>("account_created");
  const [onboardingEventMessage, setOnboardingEventMessage] = useState("");

  const isAuthed = Boolean(
    account && sessionEmail && account.email === sessionEmail,
  );
  const [depositStatus, setDepositStatus] =
    useState<DepositStatus>("deposit_missing");
  const [depositFeedback, setDepositFeedback] = useState("");
  const [isInitiatingDeposit, setIsInitiatingDeposit] = useState(false);

  useEffect(() => {
    const session = window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "";
    const stored = readStoredAccount();
    setSessionEmail(session);
    setAccount(stored);
    if (!stored) setAuthMode("register");
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const refreshDepositStatus = useCallback(async () => {
    if (!account) {
      setDepositStatus("deposit_missing");
      return;
    }

    try {
      const response = await fetch(
        `/api/payments/deposit/status?creator_id=${encodeURIComponent(account.customSlug)}`,
      );
      const data = (await response.json()) as DepositStatusResponse;
      setDepositStatus(
        response.ok && data.status ? data.status : "deposit_missing",
      );
    } catch {
      setDepositStatus("deposit_missing");
    }

    if (account?.onboardingStatus) {
      setOnboardingStatus(parseBackendCreatorStatus(account.onboardingStatus));
      return;
    }

    const envStatus = parseBackendCreatorStatus(
      process.env.NEXT_PUBLIC_CREATOR_ONBOARDING_STATUS,
    );
    setOnboardingStatus(envStatus);
  }, [account]);

  useEffect(() => {
    if (!isAuthed || !account) {
      return;
    }

    const currentStep = getOnboardingStatusView(onboardingStatus).currentStep;
    const event = {
      event: "creator_onboarding_step_seen",
      step: currentStep,
      status: onboardingStatus,
      timestamp: new Date().toISOString(),
    };

    const existingRaw = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
    let existingEvents: unknown[] = [];
    if (existingRaw) {
      try {
        existingEvents = JSON.parse(existingRaw) as unknown[];
      } catch {
        existingEvents = [];
      }
    }
    // Keep only last 100 events to prevent unbounded growth
    const MAX_ANALYTICS_EVENTS = 100;
    const updatedEvents = [...existingEvents, event].slice(
      -MAX_ANALYTICS_EVENTS,
    );
    window.localStorage.setItem(
      ANALYTICS_STORAGE_KEY,
      JSON.stringify(updatedEvents),
    );

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
    setDepositFeedback("");

    try {
      const response = await fetch("/api/payments/deposit/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `deposit-${account.customSlug}-${Date.now()}`,
        },
        body: JSON.stringify({
          creator_id: account.customSlug,
          provider: "stripe",
          amount: 500,
          currency: "USD",
        }),
      });

      if (!response.ok) {
        setDepositFeedback("Unable to initiate deposit. Please retry.");
        return;
      }

      setDepositFeedback(
        "Deposit initiated. Room creation unlocks only after confirmed settled/succeeded webhook.",
      );
      await refreshDepositStatus();
    } catch {
      setDepositFeedback("Unable to initiate deposit. Please retry.");
    } finally {
      setIsInitiatingDeposit(false);
    }
  }, [account, refreshDepositStatus]);

  const depositNextStep = useMemo(() => {
    if (depositStatus === "deposit_paid") {
      return "Deposit settled. You can generate room links.";
    }

    if (depositStatus === "deposit_failed") {
      return "Deposit failed. Retry by initiating a new deposit.";
    }

    if (depositStatus === "deposit_refunded") {
      return "Deposit refunded. Start a new deposit to continue.";
    }

    if (depositStatus === "deposit_pending") {
      return "Deposit pending. Await provider webhook confirmation.";
    }

    return "No deposit yet. Initiate a deposit to continue.";
  }, [depositStatus]);

  const creatorBaseUrl = useMemo(() => {
    if (!isAuthed || !account) {
      return "";
    }

    if (typeof window === "undefined") {
      return `/c/${account.customSlug}`;
    }

    return `${window.location.origin}/c/${account.customSlug}`;
  }, [account, isAuthed]);

  const handleRegister = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFeedback("");
      const slug = toSlug(registerSlug || registerName);
      if (
        !registerName ||
        !registerEmail ||
        !registerPassword ||
        !slug ||
        !isValidSlug(slug)
      ) {
        setFeedback("Complete all fields with a valid slug.");
        return;
      }

      setIsLoading(true);

      try {
        const passwordHash = await hashPassword(registerPassword);
        const nextAccount: CreatorAccount = {
          displayName: registerName,
          email: registerEmail.toLowerCase(),
          passwordHash,
          customSlug: slug,
          slugChangeUsed: false,
          rooms: [],
          credits: 3,
          onboardingStatus: "account_created",
          onboardingReferenceId: `REF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        };

        writeStoredAccount(nextAccount);
        window.localStorage.setItem(SESSION_STORAGE_KEY, nextAccount.email);

        setAccount(nextAccount);
        setSessionEmail(nextAccount.email);
        setNewSlug(nextAccount.customSlug);
        setAuthFeedback("Registration complete. Welcome to your dashboard.");
        setOnboardingStatus("account_created");
        setFeedback("Registration complete. Cockpit armed.");
      } finally {
        setIsLoading(false);
      }
    },
    [registerEmail, registerName, registerPassword, registerSlug],
  );

  const handleLogin = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFeedback("");
      const stored = readStoredAccount();
      if (!stored) {
        setFeedback("No account found. Register first.");
        setAuthMode("register");
        return;
      }
      if (
        stored.email !== loginEmail.toLowerCase() ||
        !(await verifyPassword(loginPassword, stored.passwordHash))
      ) {
        setFeedback("Invalid credentials.");
        return;
      }

      window.localStorage.setItem(SESSION_STORAGE_KEY, stored.email);
      setSessionEmail(stored.email);
      setAccount(stored);
      setNewSlug(stored.customSlug);
      setOnboardingStatus(parseBackendCreatorStatus(stored.onboardingStatus));
      setFeedback("Authenticated.");
    },
    [loginEmail, loginPassword],
  );

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionEmail("");
    setAccount(null);
    setRoomUrl("");
    setCopyFeedback("");
    setAuthFeedback("Logged out.");
    setOnboardingStatus("account_created");
  }, []);

  const handleRecoverableAction = useCallback(
    (action: OnboardingAction) => {
      if (!account) {
        return;
      }

      if (action.id === "retry_payment") {
        setOnboardingEventMessage(
          "Payment retry initiated. Confirming updated status from backend...",
        );
      }

      if (action.id === "restart_verification") {
        setOnboardingEventMessage(
          "Verification session restarted. Complete ID + selfie to continue.",
        );
      }

      if (action.id === "contact_support") {
        const refId = account.onboardingReferenceId ?? "REF-UNKNOWN";
        window.location.href = `mailto:support@sanctum.local?subject=Manual%20review%20request%20${refId}&body=Please%20review%20creator%20onboarding.%20Reference%20ID:%20${refId}`;
      }
    },
    [account],
  );

  const handleSlugUpdate = useCallback(() => {
    if (!account) {
      return;
    }

    if (onboardingStatus !== "active") {
      setAuthFeedback(
        "Custom URL changes are locked until onboarding status is active.",
      );
      return;
    }

    const candidate = toSlug(newSlug);

    if (!candidate || !isValidSlug(candidate)) {
      setAuthFeedback(
        "Custom URL is invalid. Use letters, numbers, and dashes only.",
      );
      return;
    }

    if (candidate === account.customSlug) {
      setAuthFeedback("That custom URL is already active.");
      return;
    }

    if (account.slugChangeUsed) {
      setAuthFeedback(
        "Your included one-time custom URL change has already been used.",
      );
      return;
    }

    const updatedAccount: CreatorAccount = {
      ...account,
      customSlug: candidate,
      slugChangeUsed: true,
    };

    writeStoredAccount(updatedAccount);
    setAccount(updatedAccount);
    setNewSlug(updatedAccount.customSlug);
    setAuthFeedback(
      "Custom URL updated. Your one-time included change is now used.",
    );
  }, [account, newSlug, onboardingStatus]);

  const handleGenerateLink = useCallback(async () => {
    if (!account) {
      return;
    }

    if (onboardingStatus !== "active") {
      setCopyFeedback(
        "Dashboard features remain locked until your backend status is active.",
      );
      return;
    }

    setIsLoading(true);
    setCopyFeedback("");
    setFeedback("");

    try {
      const response = await fetch("/api/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ creatorIdentityId: account.customSlug }),
      });

      const body = (await response.json()) as CreateRoomResponse & {
        error?: string;
      };
      const nextRoomId = body.roomName ?? body.name;
      const nextRoomUrl = body.url;

      if (!response.ok || !nextRoomId || !nextRoomUrl) {
        setFeedback(body.error ?? "Unable to generate safe link.");
        return;
      }

      const nextRoom: BurnerRoom = {
        id: nextRoomId,
        createdAt: new Date().toISOString(),
        url: nextRoomUrl,
      };

      const nextAccount: CreatorAccount = {
        ...account,
        rooms: [nextRoom, ...account.rooms],
      };

      writeStoredAccount(nextAccount);
      setAccount(nextAccount);
      setRoomUrl(nextRoom.url);
      setFeedback("Safe link generated.");
    } catch {
      setFeedback("Unable to generate safe link.");
    } finally {
      setIsLoading(false);
    }
  }, [account, onboardingStatus]);

  const handleCopy = useCallback(
    async (url: string) => {
      if (onboardingStatus !== "active") {
        setCopyFeedback(
          "Copy actions are locked until onboarding status is active.",
        );
        return;
      }

      const value = url.startsWith("http")
        ? url
        : `${window.location.origin}${url}`;

      try {
        await navigator.clipboard.writeText(value);
        setCopyFeedback("Link copied to clipboard.");
      } catch {
        setCopyFeedback("Copy failed. Please copy manually.");
      }
    },
    [onboardingStatus],
  );

  const creatorUrl = useMemo(() => {
    if (!account) return "";
    return typeof window === "undefined"
      ? `/c/${account.customSlug}`
      : `${window.location.origin}/c/${account.customSlug}`;
  }, [account]);

  const onboardingView = useMemo(
    () => getOnboardingStatusView(onboardingStatus),
    [onboardingStatus],
  );
  const onboardingSteps = useMemo(
    () => buildOnboardingSteps(onboardingStatus),
    [onboardingStatus],
  );
  const isDashboardLocked = useMemo(
    () => onboardingStatus !== "active",
    [onboardingStatus],
  );

  if (!isAuthed) {
    return (
      <main className="min-h-[100dvh] bg-void px-6 py-8 text-slate-100">
        <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-800 bg-black p-6">
          <h1 className="text-2xl font-semibold text-neon-green">
            The Iron Gate
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Federal law requires verified creator identity before activation.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              className={`flex-1 rounded-md px-3 py-2 ${authMode === "login" ? "bg-neon-green text-black" : "bg-slate-900"}`}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={`flex-1 rounded-md px-3 py-2 ${authMode === "register" ? "bg-neon-green text-black" : "bg-slate-900"}`}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>

          {authMode === "login" ? (
            <form className="mt-4 space-y-3" onSubmit={handleLogin}>
              <input
                className="w-full rounded-md border border-slate-700 bg-void px-3 py-2"
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-slate-700 bg-void px-3 py-2"
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <button
                className="w-full rounded-md bg-neon-green px-4 py-3 font-semibold text-black"
                disabled={loading}
              >
                Authenticate
              </button>
            </form>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={handleRegister}>
              <input
                className="w-full rounded-md border border-slate-700 bg-void px-3 py-2"
                type="text"
                placeholder="Display name"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-slate-700 bg-void px-3 py-2"
                type="email"
                placeholder="Email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-slate-700 bg-void px-3 py-2"
                type="password"
                placeholder="Password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-slate-700 bg-void px-3 py-2"
                type="text"
                placeholder="Custom slug"
                value={registerSlug}
                onChange={(e) => setRegisterSlug(e.target.value)}
              />
              <button
                className="w-full rounded-md bg-neon-green px-4 py-3 font-semibold text-black"
                disabled={loading}
              >
                Create account
              </button>
            </form>
          )}

          {feedback ? (
            <p className="mt-3 text-sm text-slate-300">{feedback}</p>
          ) : null}
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-slate-400 underline"
          >
            Back to site
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-void px-4 py-6 text-slate-100">
      <section className="mx-auto w-full max-w-xl space-y-4 rounded-2xl border border-slate-800 bg-black p-4">
        <header className="flex items-start justify-between">
          <div>
            <p className="mono-data text-xs uppercase tracking-[0.3em] text-neon-green">
              Creator cockpit
            </p>
            <h1 className="text-xl font-semibold">The Sovereign Gate</h1>
          </div>
          <div className="rounded-md border border-neon-green/60 bg-neon-green/10 px-3 py-2 text-right">
            <p className="mono-data text-xs text-slate-300">Credits</p>
            <p className="mono-data text-lg font-semibold text-neon-green">
              {account?.credits ?? 0}
            </p>
          </div>
        </header>

        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <h2 className="text-lg font-semibold text-slate-50">
            Creator onboarding progress
          </h2>
          <p className="mt-2 text-sm text-slate-300">{onboardingView.title}</p>
          <p className="mt-1 text-sm text-slate-400">
            {onboardingView.description}
          </p>
          <ol className="mt-4 space-y-2">
            {onboardingSteps.map((step, index) => (
              <li
                key={step.id}
                className="flex items-center gap-3 rounded-md border border-slate-700 bg-black px-3 py-2 text-sm"
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step.state === "complete" ? "bg-neon-green text-black" : step.state === "current" ? "bg-slate-200 text-black" : "bg-slate-700 text-slate-200"}`}
                >
                  {index + 1}
                </span>
                <span
                  className={
                    step.state === "upcoming"
                      ? "text-slate-400"
                      : "text-slate-100"
                  }
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
          {onboardingView.actions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {onboardingView.actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleRecoverableAction(action)}
                  className="rounded-md border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
          {isDashboardLocked ? (
            <p className="mt-3 text-xs text-amber-300">
              Dashboard features are hard-blocked until backend status returns{" "}
              <code>active</code>.
            </p>
          ) : null}
          {onboardingEventMessage ? (
            <p className="mt-2 text-xs text-slate-300">
              {onboardingEventMessage}
            </p>
          ) : null}
        </div>

        <div
          className={`rounded-lg border border-slate-700 bg-slate-950 p-4 ${isDashboardLocked ? "opacity-60" : ""}`}
        >
          <h2 className="text-lg font-semibold text-slate-50">
            Your creator URL
          </h2>
          <p className="mt-2 break-all font-mono text-sm text-neon-green">
            {creatorBaseUrl}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={newSlug}
              onChange={(event) => setNewSlug(event.target.value)}
              disabled={isDashboardLocked}
              className="w-full rounded-md border border-slate-600 bg-black px-3 py-2 text-sm"
              placeholder="Update slug one time"
            />
            <button
              type="button"
              onClick={handleSlugUpdate}
              disabled={isDashboardLocked}
              className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-black"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <h2 className="text-lg font-semibold text-slate-50">
            Deposit status
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Current status:{" "}
            <span className="font-semibold text-neon-green">
              {depositStatus}
            </span>
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
            {depositStatus === "deposit_missing" ||
            depositStatus === "deposit_failed" ||
            depositStatus === "deposit_refunded" ? (
              <button
                type="button"
                disabled={isInitiatingDeposit}
                onClick={() => void handleInitiateDeposit()}
                className="rounded-md bg-neon-green px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {isInitiatingDeposit ? "Starting..." : "Initiate deposit"}
              </button>
            ) : null}
          </div>
          {depositFeedback ? (
            <p className="mt-2 text-sm text-slate-300">{depositFeedback}</p>
          ) : null}
        </div>

        <div
          className={`rounded-lg border border-slate-700 bg-slate-950 p-4 ${isDashboardLocked ? "opacity-60" : ""}`}
        >
          <h2 className="text-lg font-semibold text-slate-50">
            Burner room generator
          </h2>
          <button
            onClick={handleGenerateLink}
            disabled={isLoading || isDashboardLocked}
            className="mt-3 w-full rounded-md bg-neon-green px-4 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isLoading ? "GENERATING…" : "[ GENERATE SAFE LINK ]"}
          </button>
          {roomUrl ? (
            <div className="mt-3 space-y-2">
              <p className="break-all rounded-md border border-slate-700 bg-black px-3 py-2 font-mono text-sm">
                {roomUrl}
              </p>
              <button
                type="button"
                onClick={() => void handleCopy(roomUrl)}
                className="rounded-md border border-slate-600 px-3 py-2 text-sm"
              >
                Copy latest URL
              </button>
            </div>
          ) : null}
          {copyFeedback ? (
            <p className="mt-2 text-sm text-slate-300">{copyFeedback}</p>
          ) : null}
        </div>

        <div
          className={`rounded-lg border border-slate-700 bg-slate-950 p-4 ${isDashboardLocked ? "opacity-60" : ""}`}
        >
          <h2 className="text-lg font-semibold text-slate-50">Active rooms</h2>
          {account && account.rooms.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {account.rooms.map((room) => (
                <li
                  key={room.id}
                  className="rounded-md border border-slate-700 bg-black p-3 text-sm"
                >
                  <p className="break-all font-mono text-neon-green">
                    {room.url}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Expires in {getNightPassRemaining(room.createdAt, clock)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopy(room.url)}
                      className="rounded border border-slate-600 px-2 py-1 text-xs"
                    >
                      Copy
                    </button>
                    {isDashboardLocked ? (
                      <span className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-500">
                        Open room
                      </span>
                    ) : (
                      <Link
                        href={`/room/${room.id}`}
                        className="rounded border border-neon-green px-2 py-1 text-xs text-neon-green"
                      >
                        Open room
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No active rooms.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-void p-3">
          <p className="mono-data text-xs text-slate-400">Static link</p>
          <p className="mono-data mt-1 break-all text-sm text-neon-green">
            {creatorUrl}
          </p>
        </div>

        {feedback ? <p className="text-sm text-slate-300">{feedback}</p> : null}
        {authFeedback ? (
          <p className="text-sm text-slate-300">{authFeedback}</p>
        ) : null}

        <button
          onClick={handleLogout}
          className="w-full rounded-md border border-danger px-3 py-2 text-sm text-red-400"
        >
          Logout
        </button>
      </section>
    </main>
  );
}
