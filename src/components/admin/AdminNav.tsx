'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '../Icon';
import { signOutAction } from '@/server/admin-actions';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/submissions', label: 'Kiriman' },
  { href: '/admin/place-submissions', label: 'Rekomendasi Tempat' },
  { href: '/admin/events', label: 'Event' },
  { href: '/admin/places', label: 'Tempat' },
  { href: '/admin/organizers', label: 'Penyelenggara' },
  { href: '/admin/categories', label: 'Kategori' },
];

export default function AdminNav({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div style={{ background: 'var(--paper-2)', borderBottom: 'var(--line)' }}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 18,
        padding: '10px 20px', flexWrap: 'wrap' }}>
        <span className="eyebrow" style={{ color: 'var(--ink-soft)', margin: 0 }}>Tim FOMO</span>
        <nav style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              style={{ fontWeight: 800, fontSize: 14,
                borderBottom: active(l.href) ? '3px solid var(--orange)' : '3px solid transparent',
                paddingBottom: 2 }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="sec-note">{name} · {role}</span>
          <form action={signOutAction}>
            <button className="btn btn-sm" type="submit"><Icon name="logout" size={14} /> Keluar</button>
          </form>
        </div>
      </div>
    </div>
  );
}
