import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sanctum',
  description: 'Sanctum daily call workflow'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col bg-black text-slate-100">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-slate-800 bg-black/90 px-6 py-4">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between text-sm text-slate-300">
            <span>© {new Date().getFullYear()} Sanctum</span>
            <Link href="/terms" className="text-neon-green hover:underline">
              Terms of Service
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
