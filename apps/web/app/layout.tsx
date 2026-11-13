import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Instrument_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { SiteHeader, TabBar } from '@/components/site-header';

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
});

const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Foyer',
  description:
    'A phased renovation brief read off your rooms: what to change, in what order, and what it costs in your zip.',
  appleWebApp: { capable: true, title: 'Foyer', statusBarStyle: 'default' },
};

// Matches --canvas so the browser chrome blends into the page.
export const viewport: Viewport = { themeColor: '#f5f1e9', viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} ${mono.variable} min-h-dvh pb-[calc(3.5rem+env(safe-area-inset-bottom))] antialiased sm:pb-0`}>
        <SiteHeader />
        {children}
        <TabBar />
      </body>
    </html>
  );
}
