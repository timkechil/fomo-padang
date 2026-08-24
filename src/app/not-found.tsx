import EmptyState from '@/components/EmptyState';
import SiteFooter from '@/components/SiteFooter';

export default function NotFound() {
  return (
    <>
      <div className="wrap" style={{ padding: '70px 20px' }}>
        <EmptyState title="Halaman nggak ketemu 👀" action={{ href: '/', label: 'Balik ke Explore' }}>
          Acaranya mungkin sudah diarsipkan atau tautannya salah ketik.
        </EmptyState>
      </div>
      <SiteFooter />
    </>
  );
}
