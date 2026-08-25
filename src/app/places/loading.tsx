import PageHead from '@/components/PageHead';
import { CardGridSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <>
      <PageHead eyebrow="Spot Lokal · buka setiap saat" title="Buka Setiap Saat" />
      <section className="section"><div className="wrap"><CardGridSkeleton count={4} /></div></section>
    </>
  );
}
