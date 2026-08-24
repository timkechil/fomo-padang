import type { Metadata } from 'next';
import SubmitDone from '@/components/SubmitDone';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = { title: 'Makasih!', robots: { index: false } };

export default function SubmitDonePage() {
  return (
    <>
      <section className="section" style={{ paddingTop: 60 }}>
        <div className="wrap" style={{ maxWidth: 640 }}><SubmitDone /></div>
      </section>
      <SiteFooter />
    </>
  );
}
