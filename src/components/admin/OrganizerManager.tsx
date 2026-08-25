'use client';

import { useActionState, useState } from 'react';
import Icon from '../Icon';
import { saveOrganizerAction, type OrganizerActionState } from '@/server/admin-actions';
import type { OrganizerRow } from '@/lib/types';

/** V1.2 §5 — full organizer list with create and edit. */
export default function OrganizerManager({
  organizers, counts,
}: { organizers: OrganizerRow[]; counts: Record<string, number> }) {
  const [state, formAction] = useActionState<OrganizerActionState, FormData>(saveOrganizerAction, {});
  const [editing, setEditing] = useState<OrganizerRow | null>(null);
  const [creating, setCreating] = useState(false);

  const current = editing ?? null;
  const showForm = creating || Boolean(editing);

  return (
    <>
      {state.message ? (
        <div className={`formnote${state.ok ? ' ok' : ''}`} role="status">{state.message}</div>
      ) : null}

      <div className="sec-head">
        <h2 className="sec-title">{organizers.length} penyelenggara</h2>
        <button className="btn btn-sm btn-primary" type="button"
          onClick={() => { setCreating(true); setEditing(null); }}>
          <Icon name="plus" size={15} /> Tambah Penyelenggara
        </button>
      </div>

      {showForm ? (
        <form action={formAction} className="formcard" key={current?.id ?? 'new'}>
          {current ? <input type="hidden" name="id" value={current.id} /> : null}
          <h3 className="blockhead">
            {current ? `Edit ${current.name}` : 'Penyelenggara baru'}
          </h3>

          <div className="field">
            <label htmlFor="o-name">Nama penyelenggara *</label>
            <input id="o-name" name="name" defaultValue={current?.name ?? ''} required />
          </div>
          <div className="field">
            <label htmlFor="o-ig">Instagram penyelenggara</label>
            <input id="o-ig" name="instagram_url" type="url"
              defaultValue={current?.instagram_url ?? ''}
              placeholder="https://instagram.com/namakomunitas" />
            <p className="hint">Kalau diisi, nama penyelenggara jadi bisa diklik di halaman event.</p>
          </div>
          <div className="field">
            <label htmlFor="o-web">Website</label>
            <input id="o-web" name="website_url" type="url" defaultValue={current?.website_url ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="o-contact">Kontak (link)</label>
            <input id="o-contact" name="contact_url" type="url" defaultValue={current?.contact_url ?? ''} />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" type="submit">Simpan</button>
            <button className="btn" type="button"
              onClick={() => { setCreating(false); setEditing(null); }}>Batal</button>
          </div>
        </form>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Nama</th><th>Instagram</th><th>Event</th><th /></tr></thead>
          <tbody>
            {organizers.map((o) => (
              <tr key={o.id}>
                <td><strong>{o.name}</strong></td>
                <td className="sec-note" style={{ wordBreak: 'break-all' }}>
                  {o.instagram_url ? (
                    <a href={o.instagram_url} target="_blank" rel="noopener noreferrer"
                      style={{ borderBottom: '2px solid var(--orange)' }}>
                      {handleOf(o.instagram_url)}
                    </a>
                  ) : <span style={{ opacity: .6 }}>belum ada</span>}
                </td>
                <td className="sec-note">{counts[o.id] ?? 0}</td>
                <td>
                  <button className="btn btn-sm" type="button"
                    onClick={() => { setEditing(o); setCreating(false); }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sec-note" style={{ marginTop: 14 }}>
        Penyelenggara tidak bisa dihapus dari sini supaya event lama tidak kehilangan kreditnya.
      </p>
    </>
  );
}

export function handleOf(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\/+|\/+$/g, '');
    return path ? `@${path.split('/')[0]}` : url;
  } catch {
    return url;
  }
}
