import type { Metadata } from 'next';
import PageHead from '@/components/PageHead';
import SubmitPlaceForm from '@/components/SubmitPlaceForm';
import SiteFooter from '@/components/SiteFooter';
import { getPlaceCategories } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Kasih Info Tempat',
  description: 'Rekomendasikan tempat di Padang. Tim FOMO cek dulu sebelum tayang.',
};

export default async function SubmitPlacePage() {
  const categories = await getPlaceCategories();

  return (
    <>
      <PageHead eyebrow="Kasih Info Tempat" title={<>Tahu tempat yang<br />layak masuk FOMO?</>} />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <p className="prose" style={{ marginBottom: 22, fontWeight: 600 }}>
            Warung favorit, spot nongkrong, toko oleh-oleh — kasih tahu kami. Kamu kirim infonya,
            tim FOMO yang cek sebelum tayang. Nggak perlu bikin akun.
          </p>
          <SubmitPlaceForm categories={categories} />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
