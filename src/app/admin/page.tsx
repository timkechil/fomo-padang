import Link from 'next/link';
import { requireStaff } from '@/lib/supabase/auth';
import { getAdminStats, listActivityLog, listSubmissions } from '@/lib/admin-queries';
import PageHead from '@/components/PageHead';
import EmptyState from '@/components/EmptyState';
import { SUBMISSION_STATUS_LABEL } from '@/lib/constants';
import { fmtShort } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireStaff();
  const [stats, pending, log] = await Promise.all([
    getAdminStats(),
    listSubmissions('pending'),
    listActivityLog(8),
  ]);

  return (
    <>
      <PageHead title="Dashboard Tim FOMO" eyebrow="Moderasi & kurasi" />
      <section className="section">
        <div className="wrap">
          <div className="statgrid">
            <div className="stat"><div className="s-num">{stats.activeEvents}</div>
              <div className="s-lab">Event aktif</div></div>
            <div className="stat"><div className="s-num">{stats.weekEvents}</div>
              <div className="s-lab">Event minggu ini</div></div>
            <div className="stat">
              <div className="s-num" style={{ color: stats.pendingSubmissions ? 'var(--orange)' : undefined }}>
                {stats.pendingSubmissions}
              </div>
              <div className="s-lab">Perlu ditinjau</div>
            </div>
            <div className="stat"><div className="s-num">{stats.publishedPlaces}</div>
              <div className="s-lab">Local Spot</div></div>
          </div>

          <div className="sec-head">
            <h2 className="sec-title">Antrean kiriman</h2>
            <Link className="linkmore" href="/admin/submissions">Semua kiriman →</Link>
          </div>

          {pending.length === 0 ? (
            <EmptyState title="Inbox aman 👀">
              Nggak ada submission yang nunggu dicek.
            </EmptyState>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr><th>Kode</th><th>Event</th><th>Usulan jadwal</th><th>Kontributor</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {pending.slice(0, 8).map((s) => (
                    <tr key={s.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong>{s.submission_code}</strong><br />
                        <span className="sec-note">{fmtShort(s.created_at.slice(0, 10))}</span>
                      </td>
                      <td><strong>{s.event_name}</strong><br />
                        <span className="sec-note">{s.organizer_name ?? 'Penyelenggara belum diisi'}</span></td>
                      <td className="sec-note">
                        {s.start_date ? fmtShort(s.start_date) : 'Tanggal ?'} {s.start_time?.slice(0, 5) ?? ''}<br />
                        {s.venue_name ?? 'Tempat ?'}
                      </td>
                      <td className="sec-note">{s.contributor_name ?? 'Anonim'}</td>
                      <td><span className="status st-pending">{SUBMISSION_STATUS_LABEL[s.status]}</span></td>
                      <td>
                        <Link className="btn btn-sm btn-primary" href={`/admin/submissions/${s.id}`}>Review</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="sec-head" style={{ marginTop: 38 }}>
            <h2 className="sec-title">Aktivitas terakhir</h2>
          </div>
          {log.length === 0 ? (
            <p className="sec-note">Belum ada aktivitas tercatat.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Waktu</th><th>Admin</th><th>Aksi</th><th>Objek</th></tr></thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id}>
                    <td className="sec-note">{new Date(l.created_at).toLocaleString('id-ID')}</td>
                    <td className="sec-note">{l.admin?.full_name ?? '—'}</td>
                    <td><strong>{l.action}</strong></td>
                    <td className="sec-note">{l.entity_type}
                      {(l.metadata as { slug?: string }).slug ? ` · ${(l.metadata as { slug?: string }).slug}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
