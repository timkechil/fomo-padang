import { BlockSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <section className="detail-hero">
      <div className="wrap">
        <p className="breadcrumb" style={{ color: '#9d9d99' }}>Memuat acara…</p>
        <div className="detail-hero-in">
          <div className="detail-poster" style={{ position: 'relative' }}>
            <BlockSkeleton height="100%" />
          </div>
          <div>
            <span className="skeleton-line" style={{ width: '80%', height: 34 }} />
            <span className="skeleton-line" style={{ width: '55%', height: 18 }} />
            <span className="skeleton-line" style={{ width: '65%', height: 18 }} />
          </div>
        </div>
      </div>
    </section>
  );
}
