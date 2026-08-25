'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Icon from '../Icon';
import { deleteEventPermanentlyAction, type ActionState } from '@/server/admin-actions';

function DeleteButton({ armed }: { armed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger" disabled={!armed || pending}>
      <Icon name="trash" size={15} /> {pending ? 'Menghapus…' : 'Hapus Permanen'}
    </button>
  );
}

/**
 * V1.2 §15 — permanent delete. Admin only, and rendered only for admins; the
 * server action independently calls requireStaff('admin'), and the RLS delete
 * policy is the final gate. Deliberately placed in its own block at the very
 * bottom, away from Simpan, so it cannot be hit by a mis-tap on mobile.
 */
export default function DangerZone({
  eventId, eventTitle,
}: { eventId: string; eventTitle: string }) {
  const [state, action] = useActionState<ActionState, FormData>(deleteEventPermanentlyAction, {});
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');

  return (
    <div className="dangerzone">
      <h3 className="blockhead" style={{ borderColor: 'var(--danger)' }}>Zona berbahaya</h3>

      {state.message ? <div className="formnote" role="alert">{state.message}</div> : null}

      {!open ? (
        <>
          <p className="sec-note" style={{ marginBottom: 12 }}>
            Arsipkan event kalau masih punya nilai historis. Hapus permanen hanya untuk
            data yang benar-benar tidak perlu disimpan.
          </p>
          <button type="button" className="btn btn-danger-outline" onClick={() => setOpen(true)}>
            <Icon name="trash" size={15} /> Hapus Permanen…
          </button>
        </>
      ) : (
        <form action={action}>
          <input type="hidden" name="event_id" value={eventId} />
          <div className="formnote" role="alert" style={{ marginBottom: 14 }}>
            <strong>{eventTitle}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
            Poster yang diunggah ikut terhapus. Riwayat moderasi tetap tersimpan.
          </div>
          <div className="field">
            <label htmlFor="dz-confirm">Ketik <strong>HAPUS</strong> untuk mengonfirmasi</label>
            <input id="dz-confirm" name="confirm" autoComplete="off"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="HAPUS" />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => { setOpen(false); setConfirm(''); }}>
              Batal
            </button>
            <DeleteButton armed={confirm.trim().toUpperCase() === 'HAPUS'} />
          </div>
        </form>
      )}
    </div>
  );
}
