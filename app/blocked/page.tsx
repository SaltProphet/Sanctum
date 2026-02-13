import Link from 'next/link';
import { appRoutes, externalRoutes } from '@/lib/routes';

export default function BlockedPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-12 text-slate-100">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col justify-center gap-6 rounded-xl border border-slate-800 bg-slate-950/60 p-8">
        <h1 className="text-3xl font-bold leading-tight text-slate-50 sm:text-4xl">
          Service not available in your region
        </h1>
        <p className="text-base leading-relaxed text-slate-300">
          Due to local regulations requiring age/ID verification, this service is currently
          unavailable in your region.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link
            href={externalRoutes.supportEmail}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Contact support for appeals
          </Link>
          <Link
            href={appRoutes.home()}
            className="inline-flex items-center justify-center rounded-lg border border-neon-green bg-neon-green px-5 py-3 text-sm font-semibold text-black shadow-[0_0_24px_rgba(57,255,20,0.65)] transition hover:bg-neon-green/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
