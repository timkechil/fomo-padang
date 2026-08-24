import Link from 'next/link';
import Logo from './Logo';

export default function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="f-grid">
          <div>
            <Link href="/"><Logo /></Link>
            <p style={{ marginTop: 14, maxWidth: '34ch' }}>
              Semua yang lagi terjadi di Padang, dikumpulin di satu tempat.
              Dikelola komunitas, diisi bareng-bareng.
            </p>
          </div>
          <div>
            <h4>Jelajahi</h4>
            <Link href="/">Explore</Link>
            <Link href="/calendar">Kalender</Link>
            <Link href="/map">Peta</Link>
            <Link href="/places">Tempat</Link>
          </div>
          <div>
            <h4>Ikut Bantu</h4>
            <Link href="/submit">Kasih Info Event</Link>
            <Link href="/plan">Rencana Kamu</Link>
            <Link href="/admin">Tim FOMO (Admin)</Link>
          </div>
          <div>
            <h4>Kontak</h4>
            <a href="mailto:halo@fomopadang.id">halo@fomopadang.id</a>
            <a href="https://instagram.com/fomopadang" target="_blank" rel="noopener noreferrer">
              Instagram @fomopadang
            </a>
            <p style={{ marginTop: 12, fontSize: 12, opacity: .7 }}>
              Info acara dikirim komunitas dan dicek tim FOMO sebelum tayang.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
