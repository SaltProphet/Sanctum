import Link from 'next/link';
import { appRoutes } from '@/lib/routes';

const prohibitedJurisdictions = [
  'TX',
  'LA',
  'UT',
  'NC',
  'AR',
  'MS',
  'VA',
  'MT',
  'FL',
  'KS',
  'ID',
  'IN',
  'KY',
  'NE',
  'OK',
  'AL',
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-12 text-slate-100">
      <div className="mx-auto w-full max-w-3xl space-y-8 rounded-xl border border-slate-800 bg-slate-950/70 p-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-50">Terms of Service</h1>
          <p className="text-sm text-slate-300">Last updated: {new Date().toLocaleDateString()}</p>
          <p className="text-slate-200">
            By accessing or using Sanctum, you agree to these Terms of Service. If you do not agree, you
            must stop using the service immediately.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50">Prohibited Jurisdictions</h2>
          <p className="text-slate-200">
            Sanctum is not available to users accessing from the following jurisdictions:
          </p>
          <ul className="grid grid-cols-2 gap-2 text-slate-100 sm:grid-cols-4">
            {prohibitedJurisdictions.map((jurisdiction) => (
              <li key={jurisdiction} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-center">
                {jurisdiction}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50">User Certification</h2>
          <p className="text-slate-200">
            You certify that you are not physically located in, a resident of, or otherwise accessing
            Sanctum from any prohibited jurisdiction listed above.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50">No VPN or Proxy Circumvention</h2>
          <p className="text-slate-200">
            You may not use a VPN, proxy, anonymizer, relay, or any similar technology to hide your
            location or to circumvent jurisdiction-based restrictions.
          </p>
          <p className="text-slate-200">
            Any attempt to access Sanctum in violation of these restrictions is unauthorized access and a
            violation of these Terms of Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-slate-50">Contact</h2>
          <p className="text-slate-200">If you have questions about these terms, contact support before using the service.</p>
        </section>

        <Link className="inline-flex text-neon-green hover:underline" href={appRoutes.home()}>
          Return to home
        </Link>
      </div>
    </main>
  );
}
