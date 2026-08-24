import Link from 'next/link';
import type { Metadata } from 'next';
import PageHead from '@/components/PageHead';
import PlaceCard from '@/components/PlaceCard';
import EmptyState from '@/components/EmptyState';
import CtaStrip from '@/components/CtaStrip';
import SiteFooter from '@/components/SiteFooter';
import Icon from '@/components/Icon';
import { getPlaces } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Tempat di Padang',
  description: 'Pantai, museum, taman, dan local spot yang bisa dikunjungi kapan aja.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PlacesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? '';
  const places = await getPlaces(40, q);

  return (
    <>
      <PageHead eyebrow="Local Spot · buka setiap saat"
        title={<>Tempat yang bisa<br />dikunjungi kapan aja</>} />
      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="sec-title">{places.length} tempat</h2>
            <Link className="linkmore" href="/map">Lihat di peta <Icon name="arrow" size={14} /></Link>
          </div>
          {places.length ? (
            <div className="grid g2 places">{places.map((p) => <PlaceCard key={p.id} place={p} />)}</div>
          ) : (
            <EmptyState title="Belum ada tempat terdaftar 👀">
              Tim FOMO belum menerbitkan local spot. Cek lagi nanti.
            </EmptyState>
          )}
        </div>
      </section>
      <CtaStrip />
      <SiteFooter />
    </>
  );
}
