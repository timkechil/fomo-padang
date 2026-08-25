import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PosterVisual from '@/components/PosterVisual';
import PlanButton from '@/components/PlanButton';
import ShareButton from '@/components/ShareButton';
import MapView from '@/components/MapView';
import SiteFooter from '@/components/SiteFooter';
import Icon from '@/components/Icon';
import { getNearbyEvents, getPlaceBySlug } from '@/lib/queries';
import { fmtPrice, fmtShort, todayWIB } from '@/lib/format';
import { SPOT_LABEL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return { title: 'Tempat tidak ditemukan' };
  return {
    title: place.name,
    description: place.description?.slice(0, 160) ?? `${place.name} di ${place.district ?? 'Padang'}.`,
    alternates: { canonical: `/place/${place.slug}` },
    openGraph: {
      title: place.name,
      description: place.description?.slice(0, 200) ?? '',
      images: place.cover_image_url ? [place.cover_image_url] : undefined,
      url: `/place/${place.slug}`,
    },
  };
}

export default async function PlaceDetail({ params }: { params: Params }) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  const nearby = place.district ? await getNearbyEvents(place.district, 4) : [];
  const hours = place.opening_hours?.label ?? 'Cek jam buka';
  const price = place.admission_type === 'free' ? 'Gratis' : fmtPrice('paid', place.admission_price);
  const hasCoords = place.latitude != null && place.longitude != null;

  return (
    <>
      <section className="detail-hero">
        <div className="wrap">
          <p className="breadcrumb">
            <Link href="/">Explore</Link> / <Link href="/places">Tempat</Link> / {place.name}
          </p>
          <div className="detail-hero-in">
            <div className="detail-poster">
              <PosterVisual slug={place.slug} title={place.name} kicker={place.category?.name ?? SPOT_LABEL}
                main={place.name} ghostSize="120px" posterUrl={place.cover_image_url} />
            </div>
            <div>
              <span className="badge" style={{ background: 'var(--ink)', border: '1.5px solid #fff' }}>
                {place.category?.name ?? SPOT_LABEL}
              </span>
              {place.status === 'temporarily_closed' ? (
                <span className="badge" style={{ background: '#E23E2E', marginLeft: 8 }}>Tutup sementara</span>
              ) : null}
              <h1 className="detail-title">{place.name}</h1>
              <dl className="infogrid">
                <div><dt>Jam Buka</dt><dd>{hours}</dd></div>
                <div><dt>Tiket Masuk</dt><dd>{price}</dd></div>
                <div><dt>Alamat</dt><dd>{place.address ?? '—'}</dd></div>
                <div><dt>Kecamatan</dt><dd>{place.district ?? '—'}</dd></div>
              </dl>
              <div className="actions">
                <PlanButton variant="button" item={{
                  id: place.id, kind: 'place', slug: place.slug, title: place.name,
                  venue: place.address, district: place.district, date: todayWIB(), time: null, note: '',
                }} />
                {hasCoords ? (
                  <a className="btn" target="_blank" rel="noopener noreferrer"
                    href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}>
                    <Icon name="pin" size={16} /> Buka Maps
                  </a>
                ) : null}
                <ShareButton title={place.name} path={`/place/${place.slug}`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap detail-body">
        <div>
          <h2 className="blockhead">Tentang tempat ini</h2>
          <div className="prose">
            {(place.description ?? '').split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            {place.tips ? <p><strong>Tips:</strong> {place.tips}</p> : null}
          </div>

          {place.source_photo ? (
            <p className="photo-credit">
              Foto: {/^https?:\/\//.test(place.source_photo) ? (
                <a href={place.source_photo} target="_blank" rel="noopener noreferrer">
                  {place.source_photo}
                </a>
              ) : place.source_photo}
            </p>
          ) : null}

          {hasCoords ? (
            <>
              <h2 className="blockhead" style={{ marginTop: 32 }}>Lokasi</h2>
              <div className="map-shell">
                <MapView height={280} zoom={15} scrollWheel={false}
                  center={[place.latitude!, place.longitude!]}
                  pins={[{
                    kind: 'place', id: place.id, slug: place.slug, title: place.name,
                    latitude: place.latitude!, longitude: place.longitude!,
                    start_date: null, start_time: null, venue_name: place.address,
                    poster_url: place.cover_image_url, price_type: place.admission_type,
                    price_amount: place.admission_price, category_name: place.category?.name ?? SPOT_LABEL,
                    category_color: '#161616',
                  }]} />
              </div>
              <p className="sec-note" style={{ marginTop: 10 }}>{place.address}</p>
            </>
          ) : null}
        </div>

        <aside>
          <div className="sidebox">
            <h3 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Acara di sekitar sini
            </h3>
            {nearby.length ? nearby.map((e) => (
              <Link className="agenda-item" key={e.id} href={`/event/${e.slug}`} style={{ marginBottom: 8 }}>
                <span className="agenda-time">{fmtShort(e.start_date)}</span>
                <div className="agenda-body">
                  <h4 style={{ fontSize: 14 }}>{e.title}</h4>
                  <p>{e.venue_name}</p>
                </div>
              </Link>
            )) : <p className="sec-note">Belum ada acara terdaftar di {place.district ?? 'sekitar sini'}.</p>}
          </div>

          {place.instagram_url || place.website_url ? (
            <div className="sidebox">
              <h3 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Sumber
              </h3>
              {place.instagram_url ? (
                <a className="btn btn-block" target="_blank" rel="noopener noreferrer" href={place.instagram_url}>
                  <Icon name="instagram" size={16} /> Lihat di Instagram
                </a>
              ) : null}
              {place.website_url ? (
                <a className="btn btn-block" style={{ marginTop: 8 }} target="_blank"
                  rel="noopener noreferrer" href={place.website_url}>
                  <Icon name="external" size={16} /> Website
                </a>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
      <SiteFooter />
    </>
  );
}
