'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { getPlan, PLAN_EVENT } from '@/lib/plan';

const ITEMS = [
  { href: '/', label: 'Explore', icon: 'compass' },
  { href: '/map', label: 'Peta', icon: 'pin' },
  { href: '/calendar', label: 'Kalender', icon: 'calendar' },
  { href: '/plan', label: 'Rencana', icon: 'list' },
];

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
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

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
      <Link className="fab" href="/submit"><Icon name="plus" size={18} /> Kasih Info</Link>
    </>
  );
}
