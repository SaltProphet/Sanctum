import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sanctum',
  description: 'Secure, ephemeral video conferencing for independent consultants.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-void text-slate-100">{children}</body>
    </html>
  );
}
