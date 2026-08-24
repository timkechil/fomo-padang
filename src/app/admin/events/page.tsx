import Link from 'next/link';
import { requireStaff } from '@/lib/supabase/auth';
import { listAdminEvents, type AdminEventFilter } from '@/lib/admin-queries';
import { setEventStatusAction } from '@/server/admin-actions';
import PageHead from '@/components/PageHead';
import EmptyState from '@/components/EmptyState';
import { EVENT_STATUS_LABEL } from '@/lib/constants';
import { fmtRange, isPast, todayWIB } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FILTERS: { k: AdminEventFilter; l: string }[] = [
  { k: 'upcoming', l: 'Upcoming' },
  { k: 'published', l: 'Published' },
  { k: 'draft', l: 'Draft' },
  { k: 'featured', l: 'Featured' },
  { k: 'past', l: 'Past' },
  { k: 'cancelled', l: 'Cancelled' },
  { k: 'archived', l: 'Archived' },
  { k: 'all', l: 'Semua' },
];

const STATUS_CLASS: Record<string, string> = {
  published: 'st-published', draft: 'st-pending',
  cancelled: 'st-rejected', archived: 'st-revision',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminEventsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff();
  const sp = await searchParams;
  const filter = (((Array.isArray(sp.filter) ? sp.filter[0] : sp.filter) ?? 'upcoming') as AdminEventFilter);
  const events = await listAdminEvents(filter);
  const today = todayWIB();

  return (
    <>
      <PageHead title="Event" eyebrow="Kurasi & publikasi" />
      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <div className="chiprow">
              {FILTERS.map((f) => (
                <Link key={f.k} href={`/admin/events?filter=${f.k}`} className="chip"
                  aria-pressed={filter === f.k}
                  style={filter === f.k ? { background: 'var(--ink)', color: '#fff' } : undefined}>
                  {f.l}
                </Link>
              ))}
            </div>
            <Link className="btn btn-primary btn-sm" href="/admin/events/new">+ Event baru</Link>
          </div>

          {events.length === 0 ? (
            <EmptyState title="Belum ada event di filter ini"
              action={{ href: '/admin/events/new', label: 'Buat event manual' }}>
              Coba filter lain, atau buat event tanpa menunggu kiriman komunitas.
            </EmptyState>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr><th>Event</th><th>Jadwal</th><th>Lokasi</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.title}</strong><br />
                        <span className="sec-note">/event/{e.slug}</span>
                        {e.featured ? <><br /><span className="status st-published">Lagi Ramai</span></> : null}
                        {e.submitted_from ? <><br /><span className="sec-note">dari kiriman komunitas</span></> : null}
                      </td>
                      <td className="sec-note">
                        {fmtRange(e)}<br />
                        {isPast(e, today) ? 'Sudah lewat' : 'Akan datang'}
                      </td>
                      <td className="sec-note">{e.venue_name ?? '—'}<br />{e.district ?? '—'}</td>
                      <td>
                        <span className={`status ${STATUS_CLASS[e.status]}`}>
                          {EVENT_STATUS_LABEL[e.status]}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <Link className="btn btn-sm" href={`/admin/events/${e.id}`}>Edit</Link>
                          <Link className="btn btn-sm" href={`/event/${e.slug}`} target="_blank">Pratinjau</Link>
                          <form action={setEventStatusAction}>
                            <input type="hidden" name="event_id" value={e.id} />
                            <input type="hidden" name="status"
                              value={e.status === 'published' ? 'draft' : 'published'} />
                            <button className="btn btn-sm" type="submit">
                              {e.status === 'published' ? 'Unpublish' : 'Publish'}
                            </button>
                          </form>
                          <form action={setEventStatusAction}>
                            <input type="hidden" name="event_id" value={e.id} />
                            <input type="hidden" name="featured" value={(!e.featured).toString()} />
                            <button className="btn btn-sm" type="submit">
                              {e.featured ? 'Unfeature' : 'Feature'}
                            </button>
                          </form>
                          {e.status !== 'cancelled' ? (
                            <form action={setEventStatusAction}>
                              <input type="hidden" name="event_id" value={e.id} />
                              <input type="hidden" name="status" value="cancelled" />
                              <button className="btn btn-sm" type="submit">Batalkan</button>
                            </form>
                          ) : null}
                          {e.status !== 'archived' ? (
                            <form action={setEventStatusAction}>
                              <input type="hidden" name="event_id" value={e.id} />
                              <input type="hidden" name="status" value="archived" />
                              <button className="btn btn-sm" type="submit">Arsipkan</button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="sec-note" style={{ marginTop: 16 }}>
            Tidak ada tombol hapus permanen: arsip menjaga URL lama tetap hidup dan riwayat tetap utuh.
          </p>
        </div>
      </section>
    </>
  );
}
