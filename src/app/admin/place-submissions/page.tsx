import Link from 'next/link';
import { requireStaff } from '@/lib/supabase/auth';
import { listPlaceSubmissions } from '@/lib/admin-queries';
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

export default async function PlaceSubmissionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff();
  const sp = await searchParams;
  const status = (Array.isArray(sp.status) ? sp.status[0] : sp.status) ?? 'pending';
  const published = (Array.isArray(sp.published) ? sp.published[0] : sp.published) ?? null;

  const submissions = await listPlaceSubmissions(status);

  return (
    <>
      <PageHead title="Rekomendasi Tempat" eyebrow="Dikirim → Ditinjau → Disetujui → Tayang" />
      <section className="section">
        <div className="wrap">
          {published ? (
            <div className="formnote ok">
              Tempat dipublikasikan.{' '}
              <Link href={`/place/${published}`} style={{ textDecoration: 'underline' }}>
                Lihat halaman publiknya
              </Link>
            </div>
          ) : null}

          <div className="chiprow" style={{ marginBottom: 18 }}>
            {TABS.map((t) => (
              <Link key={t} href={`/admin/place-submissions?status=${t}`} className="chip"
                aria-pressed={status === t}
                style={status === t ? { background: 'var(--ink)', color: '#fff' } : undefined}>
                {t === 'all' ? 'Semua' : SUBMISSION_STATUS_LABEL[t]}
              </Link>
            ))}
          </div>

          {submissions.length === 0 ? (
            <EmptyState title="Inbox aman 👀">
              Nggak ada rekomendasi tempat yang nunggu dicek.
            </EmptyState>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Kode</th><th>Tempat</th><th>Lokasi</th><th>Sumber</th>
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
                        <strong>{s.place_name}</strong>
                        {s.admin_notes ? <><br /><span className="sec-note">Catatan: {s.admin_notes}</span></> : null}
                      </td>
                      <td className="sec-note">
                        {s.address ?? 'Alamat ?'}<br />{s.district ?? 'Kecamatan ?'}<br />
                        {s.latitude != null ? `${s.latitude}, ${s.longitude}` : 'Titik peta ?'}
                      </td>
                      <td>
                        <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                          style={{ borderBottom: '2px solid var(--orange)' }}>Cek sumber</a>
                      </td>
                      <td className="sec-note">{s.contributor_name ?? 'Anonim'}</td>
                      <td>
                        <span className={`status ${STATUS_CLASS[s.status]}`}>
                          {SUBMISSION_STATUS_LABEL[s.status]}
                        </span>
                      </td>
                      <td>
                        {s.status === 'approved' && s.approved_place_id ? (
                          <Link className="btn btn-sm" href={`/admin/places/${s.approved_place_id}`}>
                            Lihat tempat
                          </Link>
                        ) : (
                          <Link className="btn btn-sm btn-primary" href={`/admin/place-submissions/${s.id}`}>
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
