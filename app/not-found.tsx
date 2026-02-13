import Link from 'next/link';
import { appRoutes } from '@/lib/routes';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-slate-100">
      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
        <p className="mono-data text-xs uppercase tracking-[0.3em] text-neon-green">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-50">Page not found</h1>
        <p className="mt-3 text-slate-300">The link may be expired or mistyped. Return home and start from a known route.</p>
        <Link
          href={appRoutes.home()}
          className="mt-6 inline-flex items-center justify-center rounded-lg border border-neon-green bg-neon-green px-4 py-2 text-sm font-semibold text-black"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
