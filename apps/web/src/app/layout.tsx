import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PulseMiner Ghana | Civic Intelligence Dashboard',
  description:
    'Real-time ethical public sentiment observatory for Ghana — tracking what people care about across all 16 regions.',
  keywords: ['Ghana', 'public sentiment', 'civic intelligence', 'PulseMiner'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
