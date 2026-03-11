import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PulseMiner Ghana | Civic Intelligence Dashboard',
  description:
    'Real-time ethical public sentiment observatory for Ghana — tracking what people care about across all 16 regions.',
  keywords: ['Ghana', 'public sentiment', 'civic intelligence', 'PulseMiner'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
