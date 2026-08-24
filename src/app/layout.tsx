import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import ToastHost from '@/components/Toast';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/constants';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fomopadang.id';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website', siteName: SITE_NAME, locale: 'id_ID',
    title: SITE_NAME, description: SITE_TAGLINE, url: siteUrl,
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_TAGLINE },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: '#161616',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,300..900;1,300..900&family=Anton&display=swap" />
      </head>
      <body>
        <TopBar />
        {children}
        <BottomNav />
        <ToastHost />
      </body>
    </html>
  );
}
