import PageHead from '@/components/PageHead';
import { BlockSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHead title="Kalender Padang" eyebrow="Rencanakan dari jauh hari" />
      <section className="section">
        <div className="wrap">
          <div style={{ position: 'relative', height: 520 }}><BlockSkeleton height={520} /></div>
        </div>
      </section>
    </>
  );
}
