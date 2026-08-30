'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import Icon from './Icon';
import { DATE_CHIPS, DISTRICTS, AUDIENCES } from '@/lib/constants';
import { fmtShort } from '@/lib/format';
import type { CategoryRow } from '@/lib/types';

/**
 * Same markup as the prototype filter bar; the state now lives in the URL so
 * the server can run the actual Supabase query and links stay shareable.
 */
export default function FilterBar({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  /**
   * V1.3 §3 — "Pilih Tanggal" did nothing on desktop.
   *
   * The native <input type="date"> was 0x0 and opacity:0. Mobile browsers open
   * their date UI when such an input receives focus, which is why phones
   * worked; desktop Chrome/Edge only open the picker when the calendar
   * indicator itself is clicked, and a 0x0 input has none to click.
   *
   * showPicker() is the supported way to open it from a user gesture
   * (Chrome 99+, Edge, Safari 16+, Firefox 101+). Focus alone remains the
   * fallback for anything older, so mobile behaviour is untouched.
   */
  function openDatePicker() {
    const el = dateInputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    try {
      el.showPicker?.();
    } catch {
      /* not supported, or no user activation: focus already opened it on mobile */
    }
  }

  const date = params.get('date') ?? 'semua';
  const cat = params.get('cat') ?? 'semua';
  const price = params.get('price') ?? 'all';
  const area = params.get('area') ?? 'all';
  const audience = params.get('audience') ?? 'all';
  const q = params.get('q') ?? '';

  /**
   * V1.2 #1 — chips used to stay visually unselected until the server round
   * trip finished, so a tap felt ignored on a slow connection. `optimistic`
   * paints the new selection on the same frame as the tap; the URL remains
   * the source of truth and overwrites it once the navigation lands.
   */
  const urlState = { date, cat, price, area, audience };
  const [optimistic, setOptimistic] = useState(urlState);
  useEffect(() => {
    setOptimistic({ date, cat, price, area, audience });
  }, [date, cat, price, area, audience]);

  const sel = pending ? optimistic : urlState;

  const custom = sel.date.startsWith('tgl:');
  const active = Boolean(q) || sel.date !== 'semua' || sel.cat !== 'semua'
    || sel.price !== 'all' || sel.area !== 'all' || sel.audience !== 'all';

  function apply(next: Record<string, string | null>) {
    setOptimistic((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(next).map(([k, v]) => [
          k,
          v ?? (k === 'date' || k === 'cat' ? 'semua' : 'all'),
        ]),
      ),
    }));

    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'semua' || v === 'all') sp.delete(k);
      else sp.set(k, v);
    }
    startTransition(() => {
      router.replace(sp.toString() ? `${pathname}?${sp}` : pathname, { scroll: false });
    });
  }

  return (
    <div className="filterbar" data-pending={pending ? 'true' : undefined}>
      <div className="wrap">
        <p className="filter-label">Kapan</p>
        <div className="chiprow">
          {DATE_CHIPS.map((c) => (
            <button key={c.k} type="button" className="chip date" aria-pressed={sel.date === c.k}
              onClick={() => apply({ date: c.k })}>{c.l}</button>
          ))}
          <span className="datepick">
            <button type="button" className="chip date"
              aria-haspopup="dialog"
              aria-label={custom ? `Tanggal dipilih ${fmtShort(sel.date.slice(4))}, ganti tanggal` : 'Pilih tanggal'}
              style={{ display: 'inline-flex', gap: 8, alignItems: 'center',
                ...(custom ? { background: 'var(--orange)', color: '#fff' } : {}) }}
              onClick={openDatePicker}>
              <Icon name="calendar" size={15} />
              {custom ? fmtShort(sel.date.slice(4)) : 'Pilih Tanggal'}
            </button>
            <input ref={dateInputRef} type="date" className="datepick-input" tabIndex={-1}
              aria-hidden="true"
              value={custom ? sel.date.slice(4) : ''}
              onChange={(e) => apply({ date: e.target.value ? `tgl:${e.target.value}` : 'semua' })} />
          </span>
          <button type="button" className="chip filter-toggle" aria-expanded={open}
            style={open ? { background: 'var(--ink)', color: '#fff' } : undefined}
            onClick={() => setOpen((v) => !v)}>
            Filter {open ? '▴' : '▾'}{active ? ' •' : ''}
          </button>
        </div>

        <div className={`filter-more${open ? ' open' : ''}`}>
          <p className="filter-label">Kategori</p>
          <div className="chiprow">
            <button type="button" className="chip" aria-pressed={sel.cat === 'semua'}
              onClick={() => apply({ cat: 'semua' })}>Semua</button>
            {categories.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={sel.cat === c.slug}
                style={sel.cat === c.slug ? { background: c.color, color: '#fff', borderColor: 'var(--ink)' } : undefined}
                onClick={() => apply({ cat: c.slug })}>{c.name}</button>
            ))}
            <Link className="chip" href="/places">Spot Lokal ↗</Link>
          </div>

          <p className="filter-label">Saring lagi</p>
          <div className="chiprow" style={{ paddingBottom: 10 }}>
            <button type="button" className="chip" aria-pressed={sel.price === 'free'}
              onClick={() => apply({ price: sel.price === 'free' ? 'all' : 'free' })}>Gratis</button>
            <button type="button" className="chip" aria-pressed={sel.price === 'paid'}
              onClick={() => apply({ price: sel.price === 'paid' ? 'all' : 'paid' })}>Berbayar</button>
            <select className="chip" aria-label="Pilih kecamatan" style={{ paddingRight: 26 }}
              value={sel.area} onChange={(e) => apply({ area: e.target.value })}>
              <option value="all">Semua Kecamatan</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="chip" aria-label="Pilih audiens" style={{ paddingRight: 26 }}
              value={sel.audience} onChange={(e) => apply({ audience: e.target.value })}>
              <option value="all">Semua Audiens</option>
              {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {active ? (
              <button type="button" className="chip" style={{ background: 'var(--ink)', color: '#fff' }}
                onClick={() => apply({ date: null, cat: null, price: null, area: null, audience: null, q: null })}>
                Reset ✕
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
