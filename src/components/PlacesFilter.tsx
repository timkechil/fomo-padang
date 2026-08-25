'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import type { CategoryRow } from '@/lib/types';

/**
 * V1.2 §13 — place category tabs. Same pattern as the event FilterBar: the URL
 * stays the source of truth so links are shareable, while an optimistic local
 * value paints the active state on the same frame as the tap.
 */
export default function PlacesFilter({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const urlCat = params.get('cat') ?? 'semua';
  const [optimistic, setOptimistic] = useState(urlCat);
  useEffect(() => { setOptimistic(urlCat); }, [urlCat]);
  const active = pending ? optimistic : urlCat;

  function pick(slug: string) {
    setOptimistic(slug);
    const sp = new URLSearchParams(params.toString());
    if (slug === 'semua') sp.delete('cat');
    else sp.set('cat', slug);
    startTransition(() => {
      router.replace(sp.toString() ? `/places?${sp}` : '/places', { scroll: false });
    });
  }

  return (
    <div className="chiprow placesfilter" data-pending={pending ? 'true' : undefined}
      role="tablist" aria-label="Kategori tempat">
      <button type="button" role="tab" className="chip" aria-selected={active === 'semua'}
        aria-pressed={active === 'semua'} onClick={() => pick('semua')}>Semua</button>
      {categories.map((c) => (
        <button key={c.id} type="button" role="tab" className="chip"
          aria-selected={active === c.slug} aria-pressed={active === c.slug}
          style={active === c.slug ? { background: c.color, color: '#fff', borderColor: 'var(--ink)' } : undefined}
          onClick={() => pick(c.slug)}>{c.name}</button>
      ))}
    </div>
  );
}
