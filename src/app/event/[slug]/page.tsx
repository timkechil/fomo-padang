import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PosterVisual from '@/components/PosterVisual';
import PlanButton from '@/components/PlanButton';
import ShareButton from '@/components/ShareButton';
import MapView from '@/components/MapView';
import SiteFooter from '@/components/SiteFooter';
import Icon from '@/components/Icon';
import { getEventBySlug, getRelatedEvents } from '@/lib/queries';
import { primaryCategory } from '@/lib/event-view';
import {
  fmtPrice, fmtShort, fmtTime, isFree, relLabel, todayWIB,
} from '@/lib/format';
import {
  displayDate, formatSchedule, isFinished, lastOccurrence, nextOccurrence,
  occurrenceDates, scheduleTypeOf,
} from '@/lib/schedule';

export const dynamic = 'force-dynamic';

/** Display handle for a stored Instagram URL. Never built from free text —
 *  if there is no URL there is no handle (V1.2 §6). */
function igHandle(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\/+|\/+$/g, '');
    return path ? `@${path.split('/')[0]}` : 'Instagram';
  } catch {
    return 'Instagram';
  }
}

type Params = Promise<{ slug: string }>;
import { siteUrl as resolveSiteUrl } from '@/lib/site-url';

const siteUrl = resolveSiteUrl();

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEventBySlug(slug);
  if (!e) return { title: 'Acara tidak ditemukan', robots: { index: false } };

  const desc = e.description?.slice(0, 160)
    ?? `${e.title} di ${e.venue_name ?? 'Padang'}, ${formatSchedule(e)}.`;

  return {
    title: e.title,
    description: desc,
    alternates: { canonical: `/event/${e.slug}` },
    openGraph: {
      type: 'article',
      title: e.title,
      description: desc,
      url: `${siteUrl}/event/${e.slug}`,
      images: e.poster_url ? [{ url: e.poster_url }] : undefined,
      publishedTime: e.published_at ?? undefined,
    },
    twitter: {
      card: e.poster_url ? 'summary_large_image' : 'summary',
      title: e.title,
      description: desc,
      images: e.poster_url ? [e.poster_url] : undefined,
    },
  };
}

export default async function EventDetail({ params }: { params: Params }) {
  const { slug } = await params;
  const e = await getEventBySlug(slug);
  if (!e) notFound();

  const related = await getRelatedEvents(e, 3);
  const cat = primaryCategory(e);
  const free = isFree(e.price_type);
  const past = isFinished(e, todayWIB());   // only after the LAST occurrence
  const hasCoords = e.latitude != null && e.longitude != null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: e.description ?? undefined,
    startDate: e.start_time ? `${e.start_date}T${fmtTime(e.start_time)}:00+07:00` : e.start_date,
    endDate: e.end_time
      ? `${lastOccurrence(e)}T${fmtTime(e.end_time)}:00+07:00`
      : lastOccurrence(e),
    eventSchedule: scheduleTypeOf(e) === 'multiple'
      ? occurrenceDates(e).map((d) => ({
          '@type': 'Schedule',
          startDate: d,
          endDate: d,
          scheduleTimezone: 'Asia/Jakarta',
        }))
      : undefined,
    eventStatus: e.status === 'cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: e.poster_url ? [e.poster_url] : undefined,
    url: `${siteUrl}/event/${e.slug}`,
    location: {
      '@type': 'Place',
      name: e.venue_name ?? 'Padang',
      address: {
        '@type': 'PostalAddress',
        streetAddress: e.address ?? undefined,
        addressLocality: e.district ?? 'Padang',
        addressRegion: 'Sumatera Barat',
        addressCountry: 'ID',
      },
      geo: hasCoords
        ? { '@type': 'GeoCoordinates', latitude: e.latitude, longitude: e.longitude }
        : undefined,
    },
    organizer: e.organizer
      ? { '@type': 'Organization', name: e.organizer.name, url: e.organizer.website_url ?? e.organizer.instagram_url ?? undefined }
      : undefined,
    offers: {
      '@type': 'Offer',
      price: free ? 0 : Number(e.price_amount ?? 0),
      priceCurrency: 'IDR',
      availability: 'https://schema.org/InStock',
      url: e.ticket_url ?? `${siteUrl}/event/${e.slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="detail-hero">
        <div className="wrap">
          <p className="breadcrumb">
            <Link href="/">Explore</Link> / <Link href="/calendar">Kalender</Link> / {e.title}
          </p>
          <div className="detail-hero-in">
            <div className="detail-poster">
              <PosterVisual slug={e.slug} title={e.title} posterUrl={e.poster_url}
                kicker={e.organizer?.name ?? e.district ?? 'Padang'} ghostSize="120px" />
            </div>
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {e.categories.map((c) => (
                  <span className="badge" key={c.id} style={{ background: c.color }}>{c.name}</span>
                ))}
                {free
                  ? <span className="badge tag-free">Gratis</span>
                  : <span className="badge" style={{ background: '#fff', color: 'var(--ink)' }}>Berbayar</span>}
                {e.registration_required
                  ? <span className="badge" style={{ background: 'var(--blue)' }}>Perlu Daftar</span> : null}
                {e.featured
                  ? <span className="badge" style={{ background: '#fff', color: 'var(--ink)' }}>Lagi Ramai</span> : null}
              </div>

              <h1 className="detail-title">{e.title}</h1>

              {past || e.status === 'cancelled' ? (
                <div className="formnote" style={{ background: '#2A2A28', borderColor: '#4a4a48', color: '#F3F3F1' }}>
                  {e.status === 'cancelled'
                    ? 'Acara ini dibatalkan penyelenggara.'
                    : 'Acara sudah selesai. Halaman ini disimpan sebagai arsip.'}
                </div>
              ) : null}

              <dl className="infogrid">
                <div><dt>Tanggal</dt><dd>{formatSchedule(e)}</dd></div>
                <div><dt>Waktu</dt><dd>
                  {e.start_time ? `${fmtTime(e.start_time)}${e.end_time ? `–${fmtTime(e.end_time)}` : ''} WIB` : 'Cek penyelenggara'}
                </dd></div>
                <div><dt>Lokasi</dt><dd>{e.venue_name ?? e.district ?? 'Padang'}</dd></div>
                <div><dt>HTM</dt><dd>{fmtPrice(e.price_type, e.price_amount)}</dd></div>
                <div><dt>Penyelenggara</dt><dd>{e.organizer?.name ?? 'Belum tercatat'}</dd></div>
                <div><dt>Untuk</dt><dd>{e.audience ?? 'Semua Umur'}</dd></div>
                {e.contributor_name ? (
                  <div><dt>Kontributor</dt><dd>{e.contributor_name}</dd></div>
                ) : null}
              </dl>

              <div className="actions">
                <PlanButton variant="button" item={{
                  id: e.id, kind: 'event', slug: e.slug, title: e.title,
                  venue: e.venue_name, district: e.district,
                  date: displayDate(e),
                  time: e.start_time ? fmtTime(e.start_time) : null, note: '',
                }} />
                {hasCoords ? (
                  <a className="btn" target="_blank" rel="noopener noreferrer"
                    href={`https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}`}>
                    <Icon name="pin" size={16} /> Buka Maps
                  </a>
                ) : null}
                <ShareButton title={e.title} path={`/event/${e.slug}`} />
                {e.ticket_url && !past ? (
                  <a className="btn btn-ink" target="_blank" rel="noopener noreferrer" href={e.ticket_url}>
                    <Icon name="ticket" size={16} /> Beli / Daftar
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap detail-body">
        <div>
          <h2 className="blockhead">Tentang event</h2>
          <div className="prose">
            {(e.description ?? '').split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            {e.registration_required ? (
              <p><strong>Perlu daftar dulu.</strong> Slot terbatas, amankan tempat sebelum datang.</p>
            ) : null}
          </div>

          {hasCoords ? (
            <>
              <h2 className="blockhead" style={{ marginTop: 32 }}>Lokasi</h2>
              <div className="map-shell">
                <MapView height={280} zoom={15} scrollWheel={false}
                  center={[e.latitude!, e.longitude!]}
                  pins={[{
                    kind: 'event', id: e.id, slug: e.slug, title: e.title,
                    latitude: e.latitude!, longitude: e.longitude!,
                    start_date: e.start_date, start_time: e.start_time,
                    venue_name: e.venue_name, poster_url: e.poster_url,
                    price_type: e.price_type, price_amount: e.price_amount,
                    category_name: cat?.name ?? 'Event', category_color: cat?.color ?? '#FD7318',
                  }]} />
              </div>
              <p className="sec-note" style={{ marginTop: 10 }}>
                <strong style={{ color: 'var(--ink)' }}>{e.venue_name}</strong> · {e.address}
              </p>
            </>
          ) : null}

          {e.source_url || e.instagram_url ? (
            <>
              <h2 className="blockhead" style={{ marginTop: 32 }}>Poster / info dari penyelenggara</h2>
              <div className="sourcecard">
                <div style={{ width: 96, height: 120, flex: 'none', border: '1.5px solid var(--ink)',
                  position: 'relative', overflow: 'hidden' }}>
                  <PosterVisual slug={e.slug} title={e.title} kicker="" main="" ghostSize="44px"
                    posterUrl={e.poster_url} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, marginBottom: 4 }}>
                    <Icon name="instagram" size={16} />
                    <span>{e.organizer?.name ?? 'Sumber asli'}</span>
                  </div>
                  <p className="sec-note" style={{ marginBottom: 10 }}>
                    Info ini bersumber dari unggahan penyelenggara. Cek postingan aslinya untuk detail
                    dan perubahan terbaru.
                  </p>
                  <a className="btn btn-sm" target="_blank" rel="noopener noreferrer"
                    /* V1.3 §2 — source_url is authoritative. This used to
                       prefer the event's instagram_url, which is why "Lihat
                       Info Asli" could land on a profile instead of the
                       original post. instagram_url is only a fallback for
                       historical rows that predate the change. */
                    href={e.source_url ?? e.instagram_url!}>
                    <Icon name="external" size={15} /> Lihat Info Asli
                  </a>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <aside>
          <div className="sidebox">
            <h3 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Ringkas
            </h3>
            <p style={{ fontWeight: 700, margin: '0 0 4px' }}>
              {relLabel(displayDate(e))}{e.start_time ? ` · ${fmtTime(e.start_time)} WIB` : ''}
            </p>
            <p className="sec-note" style={{ margin: '0 0 12px' }}>
              {e.district ?? 'Padang'} · {fmtPrice(e.price_type, e.price_amount)}
            </p>
            <PlanButton variant="block" item={{
              id: e.id, kind: 'event', slug: e.slug, title: e.title,
              venue: e.venue_name, district: e.district,
              date: displayDate(e),
              time: e.start_time ? fmtTime(e.start_time) : null, note: '',
            }} />
          </div>

          {e.organizer ? (
            <div className="sidebox">
              <h3 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Penyelenggara
              </h3>
              {e.organizer.instagram_url ? (
                <a href={e.organizer.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="organizer-link">
                  <span className="organizer-name">{e.organizer.name}</span>
                  <span className="organizer-handle">
                    <Icon name="instagram" size={14} /> {igHandle(e.organizer.instagram_url)}
                  </span>
                </a>
              ) : (
                <p style={{ fontWeight: 800, marginBottom: 6 }}>{e.organizer.name}</p>
              )}
              {!e.organizer.instagram_url && e.organizer.website_url ? (
                <a className="btn btn-sm btn-block" target="_blank" rel="noopener noreferrer"
                  href={e.organizer.website_url}>
                  <Icon name="external" size={15} /> Profil penyelenggara
                </a>
              ) : null}
            </div>
          ) : null}

          {related.length ? (
            <div className="sidebox">
              <h3 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Mirip ini
              </h3>
              {related.map((r) => (
                <Link className="agenda-item" key={r.id} href={`/event/${r.slug}`} style={{ marginBottom: 8 }}>
                  <span className="agenda-time">{fmtShort(r.start_date)}</span>
                  <div className="agenda-body">
                    <h4 style={{ fontSize: 14 }}>{r.title}</h4>
                    <p>{r.venue_name}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
      <SiteFooter />
    </>
  );
}
