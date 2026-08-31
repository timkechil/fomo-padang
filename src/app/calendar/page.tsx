import type { Metadata } from 'next';
import CalendarView from '@/components/CalendarView';
import EventCard from '@/components/EventCard';
import EmptyState from '@/components/EmptyState';
import SiteFooter from '@/components/SiteFooter';
import PageHead from '@/components/PageHead';
import { getCategories, getMonthEvents } from '@/lib/queries';
import { fmtLong, todayWIB } from '@/lib/format';
import { holidayOn } from '@/lib/holidays';
import { occursOn } from '@/lib/schedule';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Kalender acara Padang',
  description: 'Semua acara di Padang, disusun per tanggal.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;

  const today = todayWIB();
  const month = one('month') ?? today.slice(0, 7);
  const view = (one('view') === 'agenda' ? 'agenda' : 'calendar') as 'calendar' | 'agenda';
  const cat = one('cat') ?? 'semua';
  const selected = one('d') ?? null;

  const [events, categories] = await Promise.all([
    getMonthEvents(month, cat),
    getCategories('event'),
  ]);

  const selectedList = selected ? events.filter((e) => occursOn(e, selected)) : [];
  const selectedHoliday = selected ? holidayOn(selected) : null;

  return (
    <>
      <PageHead title="Kalender Padang" eyebrow="Rencanakan dari jauh hari" />
      <CalendarView events={events} month={month} view={view} selected={selected}
        today={today} categories={categories} activeCat={cat} />

      {view === 'calendar' && selected ? (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <h3 className="blockhead">{fmtLong(selected)} · {selectedList.length} acara</h3>

            {selectedHoliday ? (
              <div className="holiday-row" style={{ marginBottom: 16 }}>
                <span className="holiday-badge">Libur Nasional</span>
                <span>{selectedHoliday.name}</span>
              </div>
            ) : null}
            {selectedList.length ? (
              <div className="grid">{selectedList.map((e) => <EventCard key={e.id} event={e} />)}</div>
            ) : (
              <EmptyState title="Belum ketemu acaranya 👀">
                {selectedHoliday
                  ? 'Tanggal ini libur nasional, tapi belum ada acara terdaftar. Kasih tahu kami kalau kamu tahu satu.'
                  : 'Coba tanggal lain, atau kasih tahu kami acara yang kamu tahu.'}
              </EmptyState>
            )}
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </>
  );
}
