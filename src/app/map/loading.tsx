import { BlockSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="mappage">
      <aside className="map-side">
        <h1>Peta Padang</h1>
        <p className="sec-note">Memuat titik acara…</p>
        <div style={{ position: 'relative', height: 260 }}><BlockSkeleton height={260} /></div>
      </aside>
      <div style={{ position: 'relative', minHeight: '62vh' }}><BlockSkeleton height="100%" /></div>
    </div>
  );
}
