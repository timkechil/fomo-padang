/**
 * Canonical public URL resolution.
 *
 * V1.2 bug #2: shared event links opened "Halaman nggak ketemu". The chain was
 * NEXT_PUBLIC_SITE_URL being unset (or left as http://localhost:3000) in the
 * deployment, so canonical/og:url pointed at localhost or at the placeholder
 * domain fomopadang.id — WhatsApp and other scrapers surface og:url, so the
 * link people actually tapped was not the live Vercel URL.
 *
 * Resolution order, first usable wins:
 *   1. NEXT_PUBLIC_SITE_URL  (ignored when it points at localhost in production)
 *   2. Vercel-provided deployment host
 *   3. the browser's own origin (client only)
 *   4. the production domain as a last resort
 */

const FALLBACK = 'https://fomo-padang.vercel.app';

function normalise(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    // A localhost value is fine while developing, never in a deployed build.
    if (isLocal && process.env.NODE_ENV === 'production') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Absolute site origin, safe to use in metadata and share sheets. */
export function siteUrl(): string {
  return (
    normalise(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalise(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalise(process.env.VERCEL_URL) ??
    (typeof window !== 'undefined' ? window.location.origin : null) ??
    FALLBACK
  );
}

/** Absolute URL for a path such as `/event/padang-coffee-week-2026`. */
export function canonicalUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl()}${clean}`;
}
