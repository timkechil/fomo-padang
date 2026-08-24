'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from './Logo';
import Icon from './Icon';

const NAV = [
  { href: '/', label: 'Explore' },
  { href: '/calendar', label: 'Kalender' },
  { href: '/map', label: 'Peta' },
  { href: '/places', label: 'Tempat' },
  { href: '/plan', label: 'Rencana' },
  { href: '/submit', label: 'Kasih Info Event' },
];

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const active = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  function focusSearch() {
    const input = document.getElementById('q') as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else {
      router.push('/search');
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" aria-label="FOMO Padang — beranda"><Logo /></Link>
        <nav className="mainnav" aria-label="Navigasi utama">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={active(n.href) ? 'active' : ''}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={focusSearch} aria-label="Cari" type="button">
            <Icon name="search" />
          </button>
          <Link className="icon-btn desk" href="/admin" aria-label="Dashboard admin">
            <Icon name="dashboard" />
          </Link>
        </div>
      </div>
    </header>
  );
}
