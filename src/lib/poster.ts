/** Poster themes from the original identity, kept as generative fallbacks.
 *  A real poster_url always wins; otherwise the theme is derived from the
 *  slug so a given event always looks the same. */

export type PosterTheme =
  | 'gradient-orange' | 'gradient-yellow' | 'gradient-blue'
  | 'block-navy' | 'block-green' | 'block-orange' | 'block-yellow';

export const THEMES: Record<PosterTheme, { bg: string; fg: string; ghost: string }> = {
  'gradient-orange': { bg: 'linear-gradient(135deg,#FD7318 0%,#FAB02F 62%,#F09020 100%)', fg: '#fff', ghost: 'rgba(255,255,255,.24)' },
  'gradient-yellow': { bg: 'linear-gradient(150deg,#FAB02F 0%,#FD7318 100%)', fg: '#fff', ghost: 'rgba(255,255,255,.26)' },
  'gradient-blue':   { bg: 'linear-gradient(140deg,#14376E 0%,#6096C9 100%)', fg: '#fff', ghost: 'rgba(255,255,255,.2)' },
  'block-navy':      { bg: '#14376E', fg: '#fff', ghost: 'rgba(255,255,255,.14)' },
  'block-green':     { bg: '#019736', fg: '#fff', ghost: 'rgba(255,255,255,.16)' },
  'block-orange':    { bg: '#FD7318', fg: '#fff', ghost: 'rgba(255,255,255,.2)' },
  'block-yellow':    { bg: '#FAB02F', fg: '#161616', ghost: 'rgba(22,22,22,.12)' },
};

const ORDER: PosterTheme[] = [
  'gradient-orange', 'block-navy', 'block-green', 'gradient-blue',
  'block-yellow', 'gradient-yellow', 'block-orange',
];

export function themeFor(seed: string): PosterTheme {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ORDER[h % ORDER.length];
}
