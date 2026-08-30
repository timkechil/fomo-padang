/**
 * V1.3 §9 — the supplied FOMO Padang logo asset.
 *
 * Rendered at a fixed height with width:auto so the aspect ratio of the
 * original file is preserved exactly; the source is 1038x484 (2.145:1) at
 * roughly 2x the displayed height, so it stays sharp on retina screens.
 */
export default function Logo({ variant = 'on-dark' }: { variant?: 'on-dark' | 'on-light' }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      className={`logo-img ${variant}`}
      src="/logo-fomo-padang.png"
      alt="FOMO Padang"
      width={1038}
      height={484}
      decoding="async"
    />
  );
}
