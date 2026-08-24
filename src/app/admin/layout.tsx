import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import { getStaffSession } from '@/lib/supabase/auth';

export const metadata: Metadata = {
  title: 'Tim FOMO',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();

  return (
    <>
      {session ? <AdminNav name={session.profile.full_name ?? session.email ?? 'Tim FOMO'}
        role={session.profile.role} /> : null}
      {children}
      <footer className="site" style={{ paddingBottom: 40 }}>
        <div className="wrap">
          <p style={{ fontSize: 12, opacity: .7 }}>
            Area internal FOMO Padang. Semua aksi tercatat di admin_activity_logs.{' '}
            <Link href="/">Lihat situs publik</Link>
          </p>
        </div>
      </footer>
    </>
  );
}
