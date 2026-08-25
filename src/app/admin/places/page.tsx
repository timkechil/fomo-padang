import Link from 'next/link';
import { requireStaff } from '@/lib/supabase/auth';
import { listAdminPlaces } from '@/lib/admin-queries';
import { setPlaceStatusAction } from '@/server/admin-actions';
import PageHead from '@/components/PageHead';
import EmptyState from '@/components/EmptyState';

export const dynamic = 'force-dynamic';

const LABEL: Record<string, string> = {
  draft: 'Draft', published: 'Tayang',
  temporarily_closed: 'Tutup sementara', archived: 'Diarsipkan',
};

export default async function AdminPlacesPage() {
  await requireStaff();
  const places = await listAdminPlaces();

  return (
    <>
      <PageHead title="Tempat" eyebrow="Spot Lokal & tempat lainnya" />
      <section className="section">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="sec-title">{places.length} tempat</h2>
            <Link className="btn btn-primary btn-sm" href="/admin/places/new">+ Tempat baru</Link>
          </div>

          {places.length === 0 ? (
            <EmptyState title="Belum ada tempat"
              action={{ href: '/admin/places/new', label: 'Tambah tempat' }}>
              Tempat tidak lewat antrean moderasi — tim FOMO yang menulis langsung.
            </EmptyState>
          ) : (
            <table className="table">
              <thead><tr><th>Nama</th><th>Kecamatan</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {places.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong><br /><span className="sec-note">/place/{p.slug}</span></td>
                    <td className="sec-note">{p.district ?? '—'}</td>
                    <td><span className={`status ${p.status === 'published' ? 'st-published' : 'st-pending'}`}>
                      {LABEL[p.status]}
                    </span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Link className="btn btn-sm" href={`/admin/places/${p.id}`}>Edit</Link>
                        <form action={setPlaceStatusAction}>
                          <input type="hidden" name="place_id" value={p.id} />
                          <input type="hidden" name="status"
                            value={p.status === 'published' ? 'draft' : 'published'} />
                          <button className="btn btn-sm" type="submit">
                            {p.status === 'published' ? 'Unpublish' : 'Publish'}
                          </button>
                        </form>
                        <form action={setPlaceStatusAction}>
                          <input type="hidden" name="place_id" value={p.id} />
                          <input type="hidden" name="status" value="temporarily_closed" />
                          <button className="btn btn-sm" type="submit">Tutup sementara</button>
                        </form>
                        <form action={setPlaceStatusAction}>
                          <input type="hidden" name="place_id" value={p.id} />
                          <input type="hidden" name="status" value="archived" />
                          <button className="btn btn-sm" type="submit">Arsipkan</button>
                        </form>
                      </div>
                    </td>
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
