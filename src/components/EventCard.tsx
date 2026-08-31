import Link from 'next/link';
import PosterVisual from './PosterVisual';
import PlanButton from './PlanButton';
import Icon from './Icon';
import { DOW, MON, fmtPrice, fmtTime, isFree, parseISODate, relLabel } from '@/lib/format';
import {
  displayDate, formatScheduleCompact, nextOccurrenceLabel, occurrenceDates, scheduleTypeOf,
} from '@/lib/schedule';
import { primaryCategory } from '@/lib/event-view';
import type { EventView } from '@/lib/types';

export default function EventCard({ event: e }: { event: EventView }) {
  const cat = primaryCategory(e);
  // The chip and the meta line show the occurrence that matters now — the next
  // one — not the first date in the series, which may be long past.
  const shown = displayDate(e);
  const d = parseISODate(shown);
  const type = scheduleTypeOf(e);
  const multi = type === 'multiple'
    ? occurrenceDates(e).length > 1
    : Boolean(e.end_date && e.end_date !== e.start_date);
  const free = isFree(e.price_type);
  const nextLabel = nextOccurrenceLabel(e);

  return (
    <article className="card">
      {/* One stretched link covering the whole card. The card has cursor:pointer,
          so every part of it — including the price row — must actually navigate. */}
      <Link href={`/event/${e.slug}`} className="card-hit" aria-label={e.title} />

      <div className="poster">
        <PosterVisual slug={e.slug} title={e.title} posterUrl={e.poster_url}
          kicker={e.organizer?.name ?? e.district ?? 'Padang'} />
        <div className="datechip">
          <span className="d-dow">{DOW[d.getDay()]}</span>
          <span className="d-num">{d.getDate()}</span>
          <span className="d-mon">{MON[d.getMonth()]}{multi ? '+' : ''}</span>
        </div>
        <div className="poster-badges">
          {e.featured ? <span className="badge" style={{ background: 'var(--ink)' }}>Lagi Ramai</span> : null}
          {free ? <span className="badge tag-free">Gratis</span> : null}
          {e.status === 'cancelled' ? <span className="badge" style={{ background: '#E23E2E' }}>Batal</span> : null}
          {nextLabel ? <span className="badge" style={{ background: 'var(--blue)' }}>{nextLabel}</span> : null}
        </div>
      </div>

      <div className="card-body">
        <span className="card-cat" style={{ color: cat?.color ?? 'var(--orange)' }}>
          {cat?.name ?? 'Event'}
        </span>
        <h3 className="card-title">{e.title}</h3>
        <div className="card-meta">
          <span>{e.venue_name ?? e.district ?? 'Padang'}</span>
          <span>{relLabel(e.start_date)}{e.start_time ? ` · ${fmtTime(e.start_time)} WIB` : ''}</span>
        </div>

        <div className="card-foot">
          <span className={`price${free ? ' free' : ''}`}>{fmtPrice(e.price_type, e.price_amount)}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="card-arrow"><Icon name="arrow" size={16} /></span>
            <PlanButton item={{
              id: e.id, kind: 'event', slug: e.slug, title: e.title,
              venue: e.venue_name, district: e.district,
              date: shown, time: e.start_time ? fmtTime(e.start_time) : null, note: '',
            }} />
          </div>
        </div>
      </div>
    </article>
  );
}
