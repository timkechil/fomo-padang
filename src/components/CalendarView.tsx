'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DOW, MON, MONL, fmtPrice, fmtTime, isFree, parseISODate, toISODate } from '@/lib/format';
import { categoryColor, primaryCategory } from '@/lib/event-view';
import type { CategoryRow, EventView } from '@/lib/types';

interface Props {
  events: EventView[];
  month: string;          // YYYY-MM
  view: 'calendar' | 'agenda';
  selected: string | null;
  today: string;
  categories: CategoryRow[];
  activeCat: string;
}

/** Grid + agenda exactly as the prototype rendered them; the month of data
 *  is fetched on the server and swapped through the URL. */
export default function CalendarView({
  events, month, view, selected, today, categories, activeCat,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function go(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    router.replace(`/calendar?${sp}`, { scroll: false });
  }

  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1, 12);
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m - 1, d, 12));
  while (cells.length % 7 !== 0) cells.push(null);

  const onDay = (iso: string) =>
    events.filter((e) => e.start_date <= iso && (e.end_date ?? e.start_date) >= iso);

  const shiftMonth = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1, 12);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const agendaDays = new Map<string, EventView[]>();
  events.forEach((e) => {
    let cur = e.start_date;
    const end = e.end_date ?? e.start_date;
    let guard = 0;
    while (cur <= end && guard < 60) {
      if (cur >= today) {
        if (!agendaDays.has(cur)) agendaDays.set(cur, []);
        agendaDays.get(cur)!.push(e);
      }
      const d = parseISODate(cur);
      d.setDate(d.getDate() + 1);
      cur = toISODate(d);
      guard++;
    }
  });

  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head">
          <div className="calnav">
            <button className="btn btn-sm" aria-label="Bulan sebelumnya"
              onClick={() => go({ month: shiftMonth(-1), d: null })}>←</button>
            <h2 className="sec-title calmonth">{MONL[m - 1]} {y}</h2>
            <button className="btn btn-sm" aria-label="Bulan berikutnya"
              onClick={() => go({ month: shiftMonth(1), d: null })}>→</button>
          </div>
          <div className="viewtoggle">
            <button aria-pressed={view === 'calendar'} onClick={() => go({ view: 'calendar' })}>Kalender</button>
            <button aria-pressed={view === 'agenda'} onClick={() => go({ view: 'agenda' })}>Agenda</button>
          </div>
        </div>

        <div className="chiprow" style={{ marginBottom: 16 }}>
          <button className="chip" aria-pressed={activeCat === 'semua'}
            onClick={() => go({ cat: null })}>Semua</button>
          {categories.map((c) => (
            <button key={c.id} className="chip" aria-pressed={activeCat === c.slug}
              style={activeCat === c.slug ? { background: c.color, color: '#fff' } : undefined}
              onClick={() => go({ cat: c.slug })}>{c.name}</button>
          ))}
        </div>

        {view === 'calendar' ? (
          <div className="calgrid">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
              <div className="dow" key={d}>{d}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div className="calcell muted" key={`x${i}`} />;
              const iso = toISODate(d);
              const list = onDay(iso);
              return (
                <div key={iso} role="button" tabIndex={0}
                  className={`calcell${iso === today ? ' today' : ''}${selected === iso ? ' sel' : ''}`}
                  aria-label={`${d.getDate()} ${MONL[d.getMonth()]}, ${list.length} acara`}
                  onClick={() => go({ d: selected === iso ? null : iso })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      go({ d: selected === iso ? null : iso });
                    }
                  }}>
                  <span className="cal-num">{d.getDate()}</span>
                  {list.slice(0, 3).map((e) => (
                    <div className="cal-ev" key={e.id} style={{ background: categoryColor(e) }}>{e.title}</div>
                  ))}
                  {list.length > 3 ? <div className="cal-more">+{list.length - 3} lagi</div> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {agendaDays.size === 0 ? (
              <div className="empty" style={{ marginTop: 20 }}>
                <h3>Agenda masih kosong</h3>
                <p>Belum ada acara terjadwal di bulan ini.</p>
              </div>
            ) : null}
            {[...agendaDays.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([iso, list]) => {
              const dt = parseISODate(iso);
              return (
                <div className="agenda-day" key={iso}>
                  <div className="agenda-date">
                    <span className="ad-dow">{DOW[dt.getDay()]}</span>
                    <span className="ad-num">{dt.getDate()}</span>
                    <span className="ad-mon">{MON[dt.getMonth()]}</span>
                  </div>
                  <div>
                    {list.map((e) => (
                      <Link className="agenda-item" key={e.id} href={`/event/${e.slug}`}>
                        <span className="agenda-time">{fmtTime(e.start_time) || '—'}</span>
                        <div className="agenda-body">
                          <h4>{e.title}</h4>
                          <p>
                            {e.venue_name ?? '—'} · {e.district ?? 'Padang'} ·{' '}
                            <span style={{ color: categoryColor(e), fontWeight: 800 }}>
                              {primaryCategory(e)?.name ?? 'Event'}
                            </span>
                          </p>
                        </div>
                        <span className={`price${isFree(e.price_type) ? ' free' : ''}`}
                          style={{ marginLeft: 'auto' }}>
                          {fmtPrice(e.price_type, e.price_amount)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
