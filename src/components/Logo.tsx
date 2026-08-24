export default function Logo({ variant = 'on-dark' }: { variant?: 'on-dark' | 'on-light' }) {
  return (
    <span className={`logo ${variant}`} aria-label="FOMO Padang">
      <span className="l1">PADANG</span>
      <span className="l2">FOMO</span>
    </span>
  );
}
