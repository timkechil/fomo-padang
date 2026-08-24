import Link from 'next/link';
import { requireStaff } from '@/lib/supabase/auth';
import { listSubmissions } from '@/lib/admin-queries';
import PageHead from '@/components/PageHead';
import EmptyState from '@/components/EmptyState';
import { SUBMISSION_STATUS_LABEL } from '@/lib/constants';
import { fmtShort } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TABS = ['pending', 'needs_revision', 'approved', 'rejected', 'all'] as const;
const STATUS_CLASS: Record<string, string> = {
  pending: 'st-pending', approved: 'st-published',
  rejected: 'st-rejected', needs_revision: 'st-revision',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SubmissionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff();
  const sp = await searchParams;
  const status = ((Array.isArray(sp.status) ? sp.status[0] : sp.status) ?? 'pending');
  const published = (Array.isArray(sp.published) ? sp.published[0] : sp.published) ?? null;

  const submissions = await listSubmissions(status);

  return (
    <>
      <PageHead title="Kiriman komunitas" eyebrow="Dikirim → Ditinjau → Disetujui → Tayang" />
      <section className="section">
        <div className="wrap">
          {published ? (
            <div className="formnote ok">
              Event dipublikasikan.{' '}
              <Link href={`/event/${published}`} style={{ textDecoration: 'underline' }}>
                Lihat halaman publiknya
              </Link>
            </div>
          ) : null}

          <div className="chiprow" style={{ marginBottom: 18 }}>
            {TABS.map((t) => (
              <Link key={t} href={`/admin/submissions?status=${t}`} className="chip"
                aria-pressed={status === t}
                style={status === t ? { background: 'var(--ink)', color: '#fff' } : undefined}>
                {t === 'all' ? 'Semua' : SUBMISSION_STATUS_LABEL[t]}
              </Link>
            ))}
          </div>

          {submissions.length === 0 ? (
            <EmptyState title="Inbox aman 👀">Nggak ada submission yang nunggu dicek.</EmptyState>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Kode</th><th>Event</th><th>Usulan</th><th>Sumber</th>
                    <th>Kontributor</th><th>Status</th><th />
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong>{s.submission_code}</strong><br />
                        <span className="sec-note">{fmtShort(s.created_at.slice(0, 10))}</span>
                      </td>
                      <td>
                        <strong>{s.event_name}</strong><br />
                        <span className="sec-note">{s.organizer_name ?? 'Penyelenggara belum diisi'}</span>
                        {s.admin_notes ? <><br /><span className="sec-note">Catatan: {s.admin_notes}</span></> : null}
                      </td>
                      <td className="sec-note">
                        {s.start_date ? fmtShort(s.start_date) : 'Tanggal ?'} {s.start_time?.slice(0, 5) ?? ''}<br />
                        {s.venue_name ?? 'Tempat ?'}<br />{s.district ?? 'Kecamatan ?'}
                      </td>
                      <td>
                        <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                          style={{ borderBottom: '2px solid var(--orange)', wordBreak: 'break-all' }}>
                          Cek sumber
                        </a>
                      </td>
                      <td className="sec-note">
                        {s.contributor_name ?? 'Anonim'}<br />{s.contributor_contact ?? ''}
                      </td>
                      <td>
                        <span className={`status ${STATUS_CLASS[s.status]}`}>
                          {SUBMISSION_STATUS_LABEL[s.status]}
                        </span>
                      </td>
                      <td>
                        {s.status === 'approved' && s.approved_event_id ? (
                          <Link className="btn btn-sm" href={`/admin/events/${s.approved_event_id}`}>
                            Lihat event
                          </Link>
                        ) : (
                          <Link className="btn btn-sm btn-primary" href={`/admin/submissions/${s.id}`}>
                            Review
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
