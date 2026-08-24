import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageHead from '@/components/PageHead';
import SiteFooter from '@/components/SiteFooter';
import { getSharedPlan } from '@/lib/queries';
import { fmtLong } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rencana dibagikan', robots: { index: false } };

type Params = Promise<{ shareId: string }>;

export default async function SharedPlanPage({ params }: { params: Params }) {
  const { shareId } = await params;
  const plan = await getSharedPlan(shareId);
  if (!plan) notFound();

  const groups = plan.items.reduce<Record<string, typeof plan.items>>((acc, item) => {
    const key = item.day_date ?? 'tanpa-tanggal';
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <>
      <PageHead title={plan.title ?? 'Rencana di Padang'} eyebrow="Rencana dibagikan" />
      <section className="section">
        <div className="wrap">
          {Object.keys(groups).sort().map((day) => (
            <div className="planday" key={day}>
              <div className="planday-head">
                <span>{day === 'tanpa-tanggal' ? 'Kapan aja' : fmtLong(day)}</span>
                <span>{groups[day].length} aktivitas</span>
              </div>
              {groups[day].map((item, i) => (
                <div className="planitem" key={`${item.slug}-${i}`}>
                  <span className="pi-time">{item.time_label || '—'}</span>
                  <div className="pi-main">
                    <h4><Link href={`/${item.kind}/${item.slug}`}>{item.title}</Link></h4>
                    <p>{[item.venue, item.district].filter(Boolean).join(' · ')}</p>
                    {item.note ? <p style={{ fontStyle: 'italic' }}>{item.note}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <p className="sec-note">
            Rencana ini dibagikan lewat tautan dan tidak bisa diedit di sini.{' '}
            <Link href="/" style={{ borderBottom: '2px solid var(--orange)' }}>Bikin rencana kamu sendiri</Link>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
