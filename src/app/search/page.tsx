import Link from 'next/link';
import type { Metadata } from 'next';
import SearchBox from '@/components/SearchBox';
import SiteFooter from '@/components/SiteFooter';
import EmptyState from '@/components/EmptyState';
import PosterVisual from '@/components/PosterVisual';
import { searchPublic } from '@/lib/queries';
import { fmtPrice, fmtShort, fmtTime } from '@/lib/format';
import { SPOT_LABEL } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cari', robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = ((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? '').trim();
  const hits = q ? await searchPublic(q) : [];
  const events = hits.filter((h) => h.kind === 'event');
  const places = hits.filter((h) => h.kind === 'place');

  return (
    <>
      <section className="hero" style={{ padding: '26px 0 24px' }}>
        <div className="wrap hero-in">
          <p className="eyebrow">Pencarian</p>
          <h1 style={{ fontSize: 'clamp(30px,5vw,52px)' }}>{q || 'Cari apa hari ini?'}</h1>
          <SearchBox defaultValue={q} />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="sec-title">{hits.length} hasil</h2>
            <span className="sec-note">{events.length} event · {places.length} tempat</span>
          </div>

          {hits.length === 0 ? (
            <EmptyState title="Belum ketemu acaranya 👀">
              Coba kata lain, atau{' '}
              <Link href="/submit" style={{ borderBottom: '2px solid var(--orange)' }}>kasih tahu kami</Link>{' '}
              kalau acaranya belum terdaftar.
            </EmptyState>
          ) : null}

          {events.length ? (
            <>
              <div style={{ marginBottom: 14 }}><span className="resultkind ev">Event</span></div>
              <div style={{ marginBottom: 34 }}>
                {events.map((h) => (
                  <Link className="agenda-item" key={h.id} href={`/event/${h.slug}`}>
                    <span className="agenda-time">{h.start_date ? fmtShort(h.start_date) : '—'}</span>
                    <div className="agenda-body">
                      <h4>{h.title}</h4>
                      <p>
                        {h.subtitle ?? ''}{h.start_time ? ` · ${fmtTime(h.start_time)} WIB` : ''}
                        {h.category_name ? (
                          <> · <span style={{ color: h.category_color ?? 'var(--orange)', fontWeight: 800 }}>
                            {h.category_name}</span></>
                        ) : null}
                      </p>
                    </div>
                    <span className={`price${h.price_type === 'free' ? ' free' : ''}`} style={{ marginLeft: 'auto' }}>
                      {fmtPrice(h.price_type, h.price_amount)}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          ) : null}

          {places.length ? (
            <>
              <div style={{ marginBottom: 14 }}><span className="resultkind">Tempat</span></div>
              <div className="grid g2 places">
                {places.map((h) => (
                  <Link className="pcard" key={h.id} href={`/place/${h.slug}`}>
                    <div className="pc-visual">
                      <PosterVisual slug={h.slug} title={h.title} kicker="" main="" ghostSize="54px"
                        posterUrl={h.poster_url} />
                    </div>
                    <div className="pc-body">
                      <span className="pc-tag">{h.category_name ?? SPOT_LABEL} · {h.district ?? 'Padang'}</span>
                      <h3>{h.title}</h3>
                      <span className="pc-meta">{h.subtitle ?? ''}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
