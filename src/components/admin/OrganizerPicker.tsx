'use client';

import { useActionState, useEffect, useState } from 'react';
import Icon from '../Icon';
import { saveOrganizerAction, type OrganizerActionState } from '@/server/admin-actions';
import type { OrganizerRow } from '@/lib/types';

/**
 * V1.2 §5 — pick an existing organizer or create one without leaving the
 * event form. The created organizer is selected immediately.
 */
export default function OrganizerPicker({
  organizers, defaultValue,
}: { organizers: OrganizerRow[]; defaultValue?: string | null }) {
  const [list, setList] = useState(organizers);
  const [selected, setSelected] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<OrganizerActionState, FormData>(saveOrganizerAction, {});

  const [name, setName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (state.ok && state.organizerId) {
      setList((prev) =>
        prev.some((o) => o.id === state.organizerId)
          ? prev
          : [...prev, {
              id: state.organizerId!, name: state.organizerName ?? name, slug: '',
              instagram_url: instagram || null, website_url: website || null,
              contact_url: null, logo_url: null,
            }].sort((a, b) => a.name.localeCompare(b.name)));
      setSelected(state.organizerId);
      setOpen(false);
      setName(''); setInstagram(''); setWebsite('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, state.organizerId]);

  return (
    <div className="field">
      <label htmlFor="f-org">Penyelenggara</label>
      <select id="f-org" name="organizer_id" value={selected}
        onChange={(e) => setSelected(e.target.value)}>
        <option value="">— belum ditentukan —</option>
        {list.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>

      <button type="button" className="btn btn-sm" style={{ marginTop: 10 }}
        aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon name={open ? 'x' : 'plus'} size={15} />
        {open ? 'Batal' : 'Tambah Penyelenggara Baru'}
      </button>

      {open ? (
        <div className="orgpanel">
          {state.message ? (
            <div className={`formnote${state.ok ? ' ok' : ''}`} role="status">{state.message}</div>
          ) : null}

          <div className="field">
            <label htmlFor="org-name">Nama penyelenggara *</label>
            <input id="org-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Padang Coffee Community" />
          </div>
          <div className="field">
            <label htmlFor="org-ig">Instagram penyelenggara</label>
            <input id="org-ig" type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/namakomunitas" />
            <p className="hint">Dipakai agar nama penyelenggara bisa diklik di halaman event.</p>
          </div>
          <div className="field">
            <label htmlFor="org-web">Website</label>
            <input id="org-web" type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..." />
          </div>

          <button type="button" className="btn btn-sm btn-primary"
            onClick={() => {
              const fd = new FormData();
              fd.set('name', name);
              fd.set('instagram_url', instagram);
              fd.set('website_url', website);
              formAction(fd);
            }}>
            <Icon name="check" size={15} /> Simpan Penyelenggara
          </button>
        </div>
      ) : null}
    </div>
  );
}
