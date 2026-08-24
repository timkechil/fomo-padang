'use client';

import { useState } from 'react';
import Icon from '../Icon';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';

/** Uploads through /api/admin/upload, which checks the staff session and
 *  the file's magic bytes before it ever reaches Storage. */
export default function PosterUploader({
  bucket, value, onChange,
}: { bucket: string; value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Ukuran file maksimal 5 MB.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('bucket', bucket);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message ?? 'Upload gagal');
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload gagal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {value ? (
        <div style={{ width: 96, height: 120, border: 'var(--line)', overflow: 'hidden', flex: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : null}

      <div style={{ flex: 1, minWidth: 220 }}>
        <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
          <Icon name="upload" size={15} /> {busy ? 'Mengunggah…' : value ? 'Ganti poster' : 'Unggah poster'}
          <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
            disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
        </label>
        {value ? (
          <button type="button" className="btn btn-sm" style={{ marginLeft: 8 }}
            onClick={() => onChange('')}>Hapus</button>
        ) : null}
        <p className="hint" style={{ marginTop: 8 }}>
          JPG, PNG, atau WEBP. Maks 5 MB. Kalau kosong, kartu memakai poster tipografi otomatis.
        </p>
        {error ? <span className="err">{error}</span> : null}
      </div>
    </div>
  );
}
