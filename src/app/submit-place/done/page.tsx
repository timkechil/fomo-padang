import type { Metadata } from 'next';
import SubmitPlaceDone from '@/components/SubmitPlaceDone';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = { title: 'Makasih!', robots: { index: false } };

export default function SubmitPlaceDonePage() {
  return (
    <>
      <section className="section" style={{ paddingTop: 60 }}>
        <div className="wrap" style={{ maxWidth: 640 }}><SubmitPlaceDone /></div>
      </section>
      <SiteFooter />
    </>
  );
}
