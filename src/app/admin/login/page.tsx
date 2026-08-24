import type { Metadata } from 'next';
import LoginForm from '@/components/admin/LoginForm';

export const metadata: Metadata = { title: 'Masuk — Tim FOMO', robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = (Array.isArray(sp.next) ? sp.next[0] : sp.next) ?? '/admin';

  return (
    <section className="section" style={{ paddingTop: 60 }}>
      <div className="wrap" style={{ maxWidth: 440 }}>
        <LoginForm next={next} />
      </div>
    </section>
  );
}
