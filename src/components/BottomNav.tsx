'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import KasihInfoTrigger from './KasihInfoTrigger';
import { getPlan, PLAN_EVENT } from '@/lib/plan';

const ITEMS = [
  { href: '/', label: 'Explore', icon: 'compass' },
  { href: '/map', label: 'Peta', icon: 'pin' },
  { href: '/places', label: 'Tempat', icon: 'store' },
  { href: '/calendar', label: 'Kalender', icon: 'calendar' },
  { href: '/plan', label: 'Rencana', icon: 'list' },
];

/** Places live at /places but a single place is /place/[slug], so the Tempat
 *  tab has to match both. Everything else is a plain prefix match. */
const EXTRA_MATCH: Record<string, (path: string) => boolean> = {
  '/places': (path) => path.startsWith('/places') || path.startsWith('/place/'),
};

export default function BottomNav() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(getPlan().length);
    sync();
    window.addEventListener(PLAN_EVENT, sync);
    return () => window.removeEventListener(PLAN_EVENT, sync);
  }, []);

  if (pathname.startsWith('/admin')) return null;
  const active = (href: string) => {
    if (href === '/') return pathname === '/';
    const extra = EXTRA_MATCH[href];
    return extra ? extra(pathname) : pathname.startsWith(href);
  };

  return (
    <>
      <nav className="bottomnav" aria-label="Navigasi bawah">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className={active(i.href) ? 'active' : ''}>
            <Icon name={i.icon} size={21} />
            <span>{i.label}</span>
            {i.href === '/plan' && count > 0 ? <span className="sr">{count} tersimpan</span> : null}
          </Link>
        ))}
      </nav>
      {/* V1.4 §2 — the sticky global CTA now opens the Event/Tempat chooser
          instead of jumping straight into the event form. */}
      <KasihInfoTrigger variant="fab" />
    </>
  );
}
