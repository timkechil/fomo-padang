'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SubmitPlaceDone() {
  const [info, setInfo] = useState<{ code: string; title?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('fomo.last-place-submission');
      if (raw) setInfo(JSON.parse(raw));
    } catch { /* storage blocked */ }
  }, []);

  return (
    <div className="formcard" style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--ff-display)', fontSize: 54, lineHeight: 1, textTransform: 'uppercase' }}>
        Makasih! 👀
      </div>
      <p style={{ margin: '14px 0 18px', fontWeight: 600 }}>
        Rekomendasi tempat kamu sudah masuk ke tim FOMO. Kami cek dulu sebelum ditampilkan.
      </p>

      {info ? (
        <div style={{ border: 'var(--line)', borderRadius: 'var(--r)', padding: 14,
          background: 'var(--paper-2)', marginBottom: 18 }}>
          <p className="sec-note" style={{ margin: '0 0 4px' }}>Nomor submission kamu</p>
          <p style={{ fontFamily: 'var(--ff-display)', fontSize: 32, margin: 0 }}>{info.code}</p>
          {info.title ? <p className="sec-note" style={{ margin: '6px 0 0' }}>{info.title}</p> : null}
        </div>
      ) : null}

      <p className="sec-note" style={{ marginBottom: 18 }}>
        Status sekarang: <span className="status st-pending">Ditinjau</span> — biasanya dicek dalam 1×24 jam.
      </p>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link className="btn btn-primary" href="/places">Balik ke Tempat</Link>
        <Link className="btn" href="/submit-place">Kirim tempat lain</Link>
      </div>
    </div>
  );
}
