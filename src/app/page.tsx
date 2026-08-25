import Link from 'next/link';
import FilterBar from '@/components/FilterBar';
import EventCard from '@/components/EventCard';
import PlaceCard from '@/components/PlaceCard';
import SearchBox from '@/components/SearchBox';
import Marquee from '@/components/Marquee';
import EmptyState from '@/components/EmptyState';
import CtaStrip from '@/components/CtaStrip';
import SiteFooter from '@/components/SiteFooter';
import MapView from '@/components/MapView';
import GeoNearby from '@/components/GeoNearby';
import Icon from '@/components/Icon';
import {
  getCategories, getFeaturedEvents, getFilteredEvents, getFreeEvents,
  getMapPins, getNearbyEvents, getPlaces, getTodayEvents, getWeekendEvents,
} from '@/lib/queries';
import { DISTRICTS, DATE_CHIPS } from '@/lib/constants';
import { fmtLong, fmtShort, todayWIB, weekendRange } from '@/lib/format';
import type { EventView, PublicFilters } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readFilters(sp: Record<string, string | string[] | undefined>): PublicFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  return {
    q: one('q') ?? '',
    date: one('date') ?? 'semua',
    cat: one('cat') ?? 'semua',
    price: (one('price') as PublicFilters['price']) ?? 'all',
    area: one('area') ?? 'all',
    audience: one('audience') ?? 'all',
  };
}

const filtersActive = (f: PublicFilters) =>
  Boolean(f.q) || f.date !== 'semua' || f.cat !== 'semua'
  || f.price !== 'all' || f.area !== 'all' || f.audience !== 'all';

export default async function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filters = readFilters(sp);
  const near = (Array.isArray(sp.near) ? sp.near[0] : sp.near) ?? 'Padang Barat';
  const today = todayWIB();
  const { sat, sun } = weekendRange();

  const categories = await getCategories('event');

  if (filtersActive(filters)) {
    const results = await getFilteredEvents(filters);
    return (
      <>
        <Hero today={today} q={filters.q ?? ''} />
        <FilterBar categories={categories} />
        <section className="section">
          <div className="wrap">
            <div className="sec-head">
              <h2 className="sec-title">
                {results.length ? `${results.length} acara ketemu` : 'Belum ketemu acaranya 👀'}
              </h2>
              <span className="sec-note">{summarise(filters, categories)}</span>
            </div>
            {results.length ? (
              <div className="grid">{results.map((e) => <EventCard key={e.id} event={e} />)}</div>
            ) : (
              <EmptyState title="Belum ketemu acaranya 👀">
                Coba ganti tanggal atau kategori. Atau kasih tahu kami acaranya lewat{' '}
                <Link href="/submit" style={{ borderBottom: '2px solid var(--orange)' }}>Kasih Info Event</Link>.
              </EmptyState>
            )}
          </div>
        </section>
        <CtaStrip />
        <SiteFooter />
      </>
    );
  }

  const [todayEvents, weekendEvents, freeEvents, featured, places, pins, nearby] = await Promise.all([
    getTodayEvents(12),
    getWeekendEvents(8),
    getFreeEvents(8),
    getFeaturedEvents(8),
    getPlaces(4),
    getMapPins({ date: 'minggu-ini' }),
    getNearbyEvents(near, 4),
  ]);

  const marquee =
    `JANGAN SAMPAI TAUNYA PAS ACARANYA UDAH SELESAI · ${todayEvents.length} ACARA HARI INI · ` +
    `${weekendEvents.length} ACARA WEEKEND INI · KASIH INFO EVENT KAMU · `;

  return (
    <>
      <Marquee line={marquee} />
      <Hero today={today} q="" />
      <FilterBar categories={categories} />

      <Rail title="Hari Ini di Padang" note={fmtLong(today)} events={todayEvents}
        emptyTitle="Hari ini masih sepi 👀"
        emptyBody="Coba lihat acara besok atau weekend ini." />

      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="sec-title">Sebaran di peta</h2>
            <Link className="linkmore" href="/map">Buka peta penuh <Icon name="arrow" size={14} /></Link>
          </div>
          <div className="map-shell">
            <MapView pins={pins} height={340} scrollWheel={false} zoom={11} />
          </div>
        </div>
      </section>

      <Grid title="Weekend Ini" note={`Sabtu–Minggu, ${fmtShort(sat)}–${fmtShort(sun)}`} events={weekendEvents} />
      <Grid title="Gratisan 👀" note="Masuk tanpa bayar" events={freeEvents} />

      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="sec-title">Di sekitar kamu</h2>
            <span className="sec-note">{near}</span>
          </div>
          <GeoNearby current={near} />
          <div className="chiprow" style={{ marginBottom: 16 }}>
            {DISTRICTS.map((d) => (
              <Link key={d} href={`/?near=${encodeURIComponent(d)}`} scroll={false}
                className="chip" aria-pressed={near === d}
                style={near === d ? { background: 'var(--ink)', color: '#fff' } : undefined}>{d}</Link>
            ))}
          </div>
          {nearby.length ? (
            <div className="grid">{nearby.map((e) => <EventCard key={e.id} event={e} />)}</div>
          ) : (
            <EmptyState title="Belum ada acara di sini 👀">
              Belum ada yang terdaftar di {near}. Coba kecamatan lain.
            </EmptyState>
          )}
        </div>
      </section>

      <Rail title="Lagi Ramai" note="Dipilih tim FOMO minggu ini" events={featured}
        emptyTitle="Belum ada yang di-highlight"
        emptyBody="Tim FOMO belum menandai acara unggulan minggu ini." />

      <section className="section alt">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="sec-title">Buka setiap saat</h2>
            <Link className="linkmore" href="/places">Semua tempat <Icon name="arrow" size={14} /></Link>
          </div>
          <div className="grid g2 places">{places.map((p) => <PlaceCard key={p.id} place={p} />)}</div>
        </div>
      </section>

      <CtaStrip />
      <SiteFooter />
    </>
  );
}

function Hero({ today, q }: { today: string; q: string }) {
  return (
    <section className="hero">
      <div className="wrap hero-in">
        <p className="eyebrow">Padang · {fmtLong(today)}</p>
        <h1>Lagi ada apa<br />di <em>Padang?</em></h1>
        <p className="sub">Cari acara, tempat, dan aktivitas yang bisa kamu lakukan hari ini.</p>
        <SearchBox defaultValue={q} />
      </div>
    </section>
  );
}

function Rail({
  title, note, events, emptyTitle, emptyBody,
}: { title: string; note?: string; events: EventView[]; emptyTitle: string; emptyBody: string }) {
  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head">
          <h2 className="sec-title">{title}</h2>
          {note ? <span className="sec-note">{note}</span> : null}
        </div>
        {events.length ? (
          <div className="rail">{events.map((e) => <EventCard key={e.id} event={e} />)}</div>
        ) : (
          <EmptyState title={emptyTitle}>{emptyBody}</EmptyState>
        )}
      </div>
    </section>
  );
}

function Grid({ title, note, events }: { title: string; note?: string; events: EventView[] }) {
  if (!events.length) return null;
  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head">
          <h2 className="sec-title">{title}</h2>
          {note ? <span className="sec-note">{note}</span> : null}
        </div>
        <div className="grid">{events.map((e) => <EventCard key={e.id} event={e} />)}</div>
      </div>
    </section>
  );
}

function summarise(f: PublicFilters, categories: { slug: string; name: string }[]) {
  const bits: string[] = [];
  if (f.q) bits.push(`"${f.q}"`);
  if (f.date && f.date !== 'semua') {
    bits.push(f.date.startsWith('tgl:')
      ? fmtShort(f.date.slice(4))
      : DATE_CHIPS.find((c) => c.k === f.date)?.l ?? f.date);
  }
  if (f.cat && f.cat !== 'semua') bits.push(categories.find((c) => c.slug === f.cat)?.name ?? f.cat);
  if (f.price && f.price !== 'all') bits.push(f.price === 'free' ? 'Gratis' : 'Berbayar');
  if (f.area && f.area !== 'all') bits.push(f.area);
  if (f.audience && f.audience !== 'all') bits.push(f.audience);
  return bits.join(' · ');
}
