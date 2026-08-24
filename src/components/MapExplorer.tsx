'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MapView from './MapView';
import PosterVisual from './PosterVisual';
import { DATE_CHIPS } from '@/lib/constants';
import { fmtPrice, fmtShort, fmtTime, relLabel } from '@/lib/format';
import type { CategoryRow, MapPin } from '@/lib/types';

export default function MapExplorer({
  pins, categories,
}: { pins: MapPin[]; categories: CategoryRow[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [focusId, setFocusId] = useState<string | null>(null);

  const date = params.get('date') ?? 'semua';
  const cat = params.get('cat') ?? 'semua';
  const price = params.get('price') ?? 'all';

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'semua' || v === 'all') sp.delete(k);
      else sp.set(k, v);
    }
    router.replace(sp.toString() ? `/map?${sp}` : '/map', { scroll: false });
  }

  const events = pins.filter((p) => p.kind === 'event');
  const places = pins.filter((p) => p.kind === 'place');

  return (
    <div className="mappage">
      <aside className="map-side">
        <h1>Peta Padang</h1>
        <p className="sec-note" style={{ marginBottom: 14 }}>
          {events.length} acara{places.length ? ` · ${places.length} tempat` : ''} di peta
        </p>

        <div className="chiprow">
          {DATE_CHIPS.map((c) => (
            <button key={c.k} type="button" className="chip date" aria-pressed={date === c.k}
              onClick={() => apply({ date: c.k })}>{c.l}</button>
          ))}
        </div>
        <div className="chiprow">
          <button type="button" className="chip" aria-pressed={cat === 'semua'}
            onClick={() => apply({ cat: 'semua' })}>Semua</button>
          {categories.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={cat === c.slug}
              style={cat === c.slug ? { background: c.color, color: '#fff' } : undefined}
              onClick={() => apply({ cat: c.slug })}>{c.name}</button>
          ))}
        </div>
        <div className="chiprow" style={{ marginBottom: 14 }}>
          <button type="button" className="chip" aria-pressed={price === 'free'}
            onClick={() => apply({ price: price === 'free' ? 'all' : 'free' })}>Gratis</button>
          <button type="button" className="chip" aria-pressed={price === 'paid'}
            onClick={() => apply({ price: price === 'paid' ? 'all' : 'paid' })}>Berbayar</button>
        </div>

        {pins.length === 0 ? (
          <div className="empty">
            <h3>Kosong di peta</h3>
            <p>Coba ganti tanggal atau kategori.</p>
          </div>
        ) : null}

        {pins.map((p) => (
          <div key={p.id} className="mapresult" role="button" tabIndex={0}
            onClick={() => setFocusId(p.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocusId(p.id); } }}>
            <div className="mr-sq">
              <PosterVisual slug={p.slug} title={p.title} kicker="" main="" ghostSize="30px"
                posterUrl={p.poster_url} />
            </div>
            <div>
              <h4>{p.title}</h4>
              <p>
                {p.kind === 'event' && p.start_date
                  ? `${relLabel(p.start_date)}${p.start_time ? ` · ${fmtTime(p.start_time)}` : ''} · `
                  : ''}
                {p.venue_name ?? ''}
              </p>
              <p style={{ color: p.category_color, fontWeight: 800 }}>
                {p.category_name} · {p.kind === 'event' ? fmtPrice(p.price_type, p.price_amount)
                  : p.price_type === 'free' ? 'Gratis' : fmtPrice('paid', p.price_amount)}
                {p.kind === 'event' && p.start_date ? ` · ${fmtShort(p.start_date)}` : ''}
              </p>
            </div>
          </div>
        ))}
      </aside>
      <div style={{ minHeight: '62vh' }}>
        <MapView pins={pins} focusId={focusId} />
      </div>
    </div>
  );
}
