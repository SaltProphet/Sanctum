import InteractiveCounter from "@/components/InteractiveCounter";

export default function Home() {
  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-neon-green">
            Sanctum
          </h1>
          <p className="text-slate-400">
            Your sanctuary in the digital realm
          </p>
        </header>

        {/* Main Content Card */}
        <div className="bg-slate-800 rounded-lg p-6 space-y-4 border border-slate-700">
          <h2 className="text-2xl font-semibold text-neon-green">
            Welcome
          </h2>
          <p className="text-slate-300">
            This is a mobile-first, dark mode application built with Next.js and Tailwind CSS.
          </p>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-slate-200">Features:</h3>
            <ul className="list-disc list-inside text-slate-400 space-y-1">
              <li>Dark mode by default (black backgrounds)</li>
              <li>Slate-800 containers with neon green accents</li>
              <li>Optimized for mobile portrait mode</li>
              <li>Pure Tailwind CSS - no custom CSS files</li>
            </ul>
          </div>
        </div>

        {/* Interactive Component - uses 'use client' */}
        <InteractiveCounter />

        {/* Example Static Section */}
        <div className="bg-slate-800 rounded-lg p-6 space-y-4 border border-slate-700">
          <h2 className="text-xl font-semibold text-slate-200">
            Static Content
          </h2>
          <p className="text-slate-400">
            This component doesn&apos;t need &lsquo;use client&rsquo; as it has no interactivity.
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm pt-8">
          <p>Built with Next.js 15 & Tailwind CSS</p>
        </footer>
      </div>
    </main>
  );
}
