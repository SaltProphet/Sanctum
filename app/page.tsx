import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black px-6 py-12 text-slate-100">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-start justify-center gap-6">
        <h1 className="text-4xl font-bold leading-tight text-slate-50">
          Sanctum: Secure Disposable Video
        </h1>
        <p className="text-base leading-relaxed text-slate-300">
          No logs. No recordings. Links expire in 30 minutes.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex w-full items-center justify-center rounded-lg border border-neon-green bg-neon-green px-5 py-3 text-base font-semibold text-black shadow-[0_0_24px_rgba(57,255,20,0.65)] transition hover:bg-neon-green/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Creator Dashboard
        </Link>
        <Link href="/terms" className="text-sm text-slate-300 underline underline-offset-2 hover:text-slate-100">
          Review Terms of Service
        </Link>
      </div>
    </main>
  );
}
