import Link from 'next/link';
import type { Metadata } from 'next';
import PageHead from '@/components/PageHead';
import PlaceCard from '@/components/PlaceCard';
import PlacesFilter from '@/components/PlacesFilter';
import EmptyState from '@/components/EmptyState';
import CtaStrip from '@/components/CtaStrip';
import SiteFooter from '@/components/SiteFooter';
import Icon from '@/components/Icon';
import { getPlaceCategories, getPlaces } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Buka Setiap Saat — Tempat di Padang',
  description: 'Spot lokal, tempat makan, tempat nongkrong, dan toko oleh-oleh di Padang.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PlacesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const q = one('q') ?? '';
  const cat = one('cat') ?? 'semua';

  const [places, categories] = await Promise.all([
    getPlaces(40, q, cat),
    getPlaceCategories(),
  ]);

  const activeName = categories.find((c) => c.slug === cat)?.name;

  return (
    <>
      <PageHead eyebrow="Nggak ada acara pun, tetap ada tujuan"
        title="Buka Setiap Saat" />

      <section className="section">
        <div className="wrap">
          <PlacesFilter categories={categories} />

          <div className="sec-head">
            <h2 className="sec-title">
              {places.length} tempat{activeName ? ` · ${activeName}` : ''}
            </h2>
            <Link className="linkmore" href="/map">Lihat di peta <Icon name="arrow" size={14} /></Link>
          </div>

          {places.length ? (
            <div className="grid g2 places">{places.map((p) => <PlaceCard key={p.id} place={p} />)}</div>
          ) : (
            <EmptyState title="Belum ada tempat di kategori ini 👀">
              Coba kategori lain, atau kasih tahu kami tempat yang layak masuk FOMO.
            </EmptyState>
          )}
        </div>
      </section>
      <CtaStrip />
      <SiteFooter />
    </>
  );
}
