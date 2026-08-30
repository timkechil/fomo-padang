import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import ToastHost from '@/components/Toast';
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/constants';

import { siteUrl as resolveSiteUrl } from '@/lib/site-url';

const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  /**
   * V1.3 §8 — the homepage previously had no og:image of its own, so scrapers
   * picked the first poster they found on the page. This declares a dedicated
   * image. Event detail pages override `openGraph` wholesale in their own
   * generateMetadata, so event-specific previews are unaffected.
   */
  openGraph: {
    type: 'website', siteName: SITE_NAME, locale: 'id_ID',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`, description: SITE_DESCRIPTION, url: siteUrl,
    images: [{
      url: '/og-fomo-padang.png',
      width: OG_IMAGE.width, height: OG_IMAGE.height,
      alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ['/og-fomo-padang.png'],
  },
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
