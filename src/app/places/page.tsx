import Link from 'next/link';
import type { Metadata } from 'next';
import PageHead from '@/components/PageHead';
import PlaceCard from '@/components/PlaceCard';
import PlacesFilter from '@/components/PlacesFilter';
import EmptyState from '@/components/EmptyState';
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
          <div className="places-cta">
            <Link className="btn btn-sm btn-primary" href="/submit-place">
              <Icon name="plus" size={15} /> Kasih Info Tempat
            </Link>
          </div>

          <div className="sec-head">
            <h2 className="sec-title">
              {places.length} tempat{activeName ? ` · ${activeName}` : ''}
            </h2>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link className="linkmore" href="/map">Lihat di peta <Icon name="arrow" size={14} /></Link>
            </div>
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
      {/* V1.3 §11 — contributor CTA, mirroring the event CTA strip. */}
      <section className="cta-strip">
        <div className="wrap" style={{ display: 'flex', gap: 26, justifyContent: 'space-between',
          alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <h2>Tahu tempat yang belum masuk FOMO?</h2>
            <p style={{ marginTop: 12, fontWeight: 600, maxWidth: '44ch' }}>
              Warung favorit, spot nongkrong, toko oleh-oleh — kasih tahu kami.
              Tim FOMO yang cek sebelum tayang. Nggak perlu bikin akun.
            </p>
          </div>
          <Link className="btn btn-ink" href="/submit-place">
            <Icon name="send" size={16} /> Kasih Info Tempat
          </Link>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
