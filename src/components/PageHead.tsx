import type { ReactNode } from 'react';

export default function PageHead({
  title, eyebrow, crumb,
}: { title: ReactNode; eyebrow?: string; crumb?: ReactNode }) {
  return (
    <section className="hero" style={{ padding: '26px 0 24px' }}>
      <div className="wrap hero-in">
        {crumb ? (
          <p className="breadcrumb" style={{ color: '#9d9d99', paddingTop: 0, marginBottom: 8 }}>{crumb}</p>
        ) : null}
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 style={{ fontSize: 'clamp(34px,6vw,62px)' }}>{title}</h1>
      </div>
    </section>
  );
}
