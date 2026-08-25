import { RowSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head"><h2 className="sec-title">Mencari…</h2></div>
        <RowSkeleton count={5} />
      </div>
    </section>
  );
}
