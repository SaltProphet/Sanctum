import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-[100dvh] bg-void px-6 py-10 text-slate-100">
      <section className="mx-auto flex min-h-[88dvh] w-full max-w-4xl flex-col justify-between rounded-2xl border border-slate-800 bg-black p-8">
        <div className="space-y-6">
          <p className="mono-data text-xs uppercase tracking-[0.35em] text-neon-green">Sanctum // Secure Infrastructure</p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-slate-50 sm:text-5xl">
            The Burner Phone for Professional Creators. Encrypted. Ephemeral. Unbannable.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-400">
            Secure, ephemeral video conferencing for independent consultants.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-lg border border-neon-green bg-neon-green px-5 py-4 text-base font-semibold text-black transition hover:shadow-[0_0_24px_rgba(0,255,65,0.45)]"
          >
            SECURE YOUR ROOM
          </Link>
          <Link href="/terms" className="inline-block text-sm text-slate-400 underline underline-offset-4 hover:text-slate-200">
            Terms of service
          </Link>
        </div>
      </section>
    </main>
  );
}
