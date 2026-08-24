import type { Metadata } from 'next';
import PageHead from '@/components/PageHead';
import PlanClient from '@/components/PlanClient';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Rencana Kamu',
  description: 'Susun rencana jalan-jalan kamu di Padang.',
  robots: { index: false },
};

export default function PlanPage() {
  return (
    <>
      <PageHead title="Rencana Kamu" eyebrow="Simpan, urutkan, bagikan" />
      <section className="section">
        <div className="wrap"><PlanClient /></div>
      </section>
      <SiteFooter />
    </>
  );
}
