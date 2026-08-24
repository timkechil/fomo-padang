'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
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

  const date = params.get('date') ?? 'semua';
  const cat = params.get('cat') ?? 'semua';
  const price = params.get('price') ?? 'all';
  const area = params.get('area') ?? 'all';
  const audience = params.get('audience') ?? 'all';
  const q = params.get('q') ?? '';

  const custom = date.startsWith('tgl:');
  const active = Boolean(q) || date !== 'semua' || cat !== 'semua'
    || price !== 'all' || area !== 'all' || audience !== 'all';

  function apply(next: Record<string, string | null>) {
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
            <button key={c.k} type="button" className="chip date" aria-pressed={date === c.k}
              onClick={() => apply({ date: c.k })}>{c.l}</button>
          ))}
          <label className="chip date" style={{ display: 'inline-flex', gap: 8, alignItems: 'center',
            ...(custom ? { background: 'var(--orange)', color: '#fff' } : {}) }}>
            <Icon name="calendar" size={15} />
            {custom ? fmtShort(date.slice(4)) : 'Pilih Tanggal'}
            <input type="date" aria-label="Pilih tanggal"
              value={custom ? date.slice(4) : ''}
              onChange={(e) => apply({ date: e.target.value ? `tgl:${e.target.value}` : 'semua' })}
              style={{ width: 0, height: 0, opacity: 0, border: 0, padding: 0, position: 'absolute' }} />
          </label>
          <button type="button" className="chip filter-toggle" aria-expanded={open}
            style={open ? { background: 'var(--ink)', color: '#fff' } : undefined}
            onClick={() => setOpen((v) => !v)}>
            Filter {open ? '▴' : '▾'}{active ? ' •' : ''}
          </button>
        </div>

        <div className={`filter-more${open ? ' open' : ''}`}>
          <p className="filter-label">Kategori</p>
          <div className="chiprow">
            <button type="button" className="chip" aria-pressed={cat === 'semua'}
              onClick={() => apply({ cat: 'semua' })}>Semua</button>
            {categories.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={cat === c.slug}
                style={cat === c.slug ? { background: c.color, color: '#fff', borderColor: 'var(--ink)' } : undefined}
                onClick={() => apply({ cat: c.slug })}>{c.name}</button>
            ))}
            <a className="chip" href="/places">Local Spot ↗</a>
          </div>

          <p className="filter-label">Saring lagi</p>
          <div className="chiprow" style={{ paddingBottom: 10 }}>
            <button type="button" className="chip" aria-pressed={price === 'free'}
              onClick={() => apply({ price: price === 'free' ? 'all' : 'free' })}>Gratis</button>
            <button type="button" className="chip" aria-pressed={price === 'paid'}
              onClick={() => apply({ price: price === 'paid' ? 'all' : 'paid' })}>Berbayar</button>
            <select className="chip" aria-label="Pilih kecamatan" style={{ paddingRight: 26 }}
              value={area} onChange={(e) => apply({ area: e.target.value })}>
              <option value="all">Semua Kecamatan</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="chip" aria-label="Pilih audiens" style={{ paddingRight: 26 }}
              value={audience} onChange={(e) => apply({ audience: e.target.value })}>
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
