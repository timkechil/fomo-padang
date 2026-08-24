import type { Metadata } from 'next';
import PageHead from '@/components/PageHead';
import SubmitForm from '@/components/SubmitForm';
import SiteFooter from '@/components/SiteFooter';
import { getCategories } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Kasih Info Event',
  description: 'Kirim info acara di Padang. Tim FOMO cek dulu sebelum tayang.',
};

export default async function SubmitPage() {
  const categories = await getCategories('event');

  return (
    <>
      <PageHead eyebrow="Kasih Info Event" title={<>Ada event yang<br />belum masuk FOMO?</>} />
      <section className="section">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <p className="prose" style={{ marginBottom: 22, fontWeight: 600 }}>
            Kasih tahu kami. Kamu kirim infonya, tim FOMO yang cek sebelum tayang. Nggak perlu bikin akun.
          </p>
          <SubmitForm categories={categories} />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
