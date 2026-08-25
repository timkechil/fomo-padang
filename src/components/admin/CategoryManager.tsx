'use client';

import { useActionState, useState } from 'react';
import Icon from '../Icon';
import { saveCategoryAction, type ActionState } from '@/server/admin-actions';
import type { CategoryRow } from '@/lib/types';

/**
 * V1.2 §7 — manage categories on top of the existing `categories` table.
 * No delete: a category in use is referenced by event_categories and by filter
 * URLs, so it is deactivated instead.
 */
export default function CategoryManager({
  categories, usage,
}: { categories: CategoryRow[]; usage: Record<string, number> }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveCategoryAction, {});
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [creating, setCreating] = useState(false);

  const current = editing;
  const showForm = creating || Boolean(editing);

  return (
    <>
      {state.message ? (
        <div className={`formnote${state.ok ? ' ok' : ''}`} role="status">{state.message}</div>
      ) : null}

      <div className="sec-head">
        <h2 className="sec-title">{categories.length} kategori</h2>
        <button className="btn btn-sm btn-primary" type="button"
          onClick={() => { setCreating(true); setEditing(null); }}>
          <Icon name="plus" size={15} /> Tambah Kategori
        </button>
      </div>

      {showForm ? (
        <form action={formAction} className="formcard" key={current?.id ?? 'new'}>
          {current ? <input type="hidden" name="id" value={current.id} /> : null}
          <h3 className="blockhead">{current ? `Edit ${current.name}` : 'Kategori baru'}</h3>

          <div className="formgrid">
            <div className="field">
              <label htmlFor="c-name">Nama kategori *</label>
              <input id="c-name" name="name" defaultValue={current?.name ?? ''} required />
            </div>
            <div className="field">
              <label htmlFor="c-type">Dipakai untuk</label>
              <select id="c-type" name="type" defaultValue={current?.type ?? 'event'}
                disabled={Boolean(current)}>
                <option value="event">Event</option>
                <option value="place">Tempat</option>
              </select>
              {current ? <p className="hint">Tipe tidak bisa diubah setelah dibuat.</p> : null}
            </div>
            <div className="field">
              <label htmlFor="c-color">Warna (hex)</label>
              <input id="c-color" name="color" defaultValue={current?.color ?? '#FD7318'}
                placeholder="#FD7318" />
              {state.errors?.color ? <span className="err">{state.errors.color}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="c-sort">Urutan tampil</label>
              <input id="c-sort" name="sort_order" inputMode="numeric"
                defaultValue={current?.sort_order ?? categories.length + 1} />
            </div>
          </div>

          <div className="field">
            <label className="chip" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" name="active" value="on"
                defaultChecked={current ? current.active : true} />
              Aktif (tampil di filter publik)
            </label>
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
          <thead><tr><th>Kategori</th><th>Tipe</th><th>Dipakai</th><th>Status</th><th /></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong style={{ color: c.color }}>{c.name}</strong><br />
                  <span className="sec-note">{c.slug}</span>
                </td>
                <td className="sec-note">{c.type === 'place' ? 'Tempat' : 'Event'}</td>
                <td className="sec-note">{usage[c.id] ?? 0} event</td>
                <td>
                  <span className={`status ${c.active ? 'st-published' : 'st-revision'}`}>
                    {c.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm" type="button"
                    onClick={() => { setEditing(c); setCreating(false); }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sec-note" style={{ marginTop: 14 }}>
        Kategori tidak dihapus permanen. Nonaktifkan saja — event yang sudah memakainya
        tetap utuh dan tautan filter lama tidak rusak.
      </p>
    </>
  );
}
