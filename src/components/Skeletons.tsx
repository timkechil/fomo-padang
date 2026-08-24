/** Subtle skeletons, not spinners (spec §39). Styling stays inside the
 *  existing card frame so nothing jumps when the data lands. */

export function CardSkeleton() {
  return (
    <div className="card" aria-hidden="true">
      <div className="poster"><div className="skeleton-fill" /></div>
      <div className="card-body">
        <span className="skeleton-line" style={{ width: '35%', height: 10 }} />
        <span className="skeleton-line" style={{ width: '85%', height: 16 }} />
        <span className="skeleton-line" style={{ width: '60%', height: 12 }} />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function RowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="agenda-item" style={{ pointerEvents: 'none' }}>
          <span className="skeleton-line" style={{ width: 46, height: 14 }} />
          <span className="skeleton-line" style={{ width: '55%', height: 14 }} />
        </div>
      ))}
    </div>
  );
}

export function BlockSkeleton({ height = 340 }: { height?: number | string }) {
  return <div className="skeleton-fill" style={{ height }} aria-hidden="true" />;
}
