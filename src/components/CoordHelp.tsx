'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * V1.3 §1 — coordinate help, shared by the admin forms and the public
 * "Kasih Info Event" / "Kasih Info Tempat" forms.
 *
 * type="button" so it can never submit the form it lives in. Tap/click driven,
 * never hover, and dismissible by button, Escape, or an outside click.
 */
export default function CoordHelp() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <span className="coordhelp" ref={wrapRef}>
      <button type="button" className="coordhelp-btn" aria-expanded={open}
        aria-label="Petunjuk Latitude dan Longitude"
        onClick={() => setOpen((v) => !v)}>?</button>

      {open ? (
        <div className="coordhelp-pop" role="dialog"
          aria-label="Petunjuk Latitude dan Longitude">
          <strong>Apa itu Latitude &amp; Longitude?</strong>
          <p className="hint" style={{ margin: '6px 0 10px' }}>
            Dua angka yang menunjuk titik lokasi persis di peta. Latitude itu posisi
            utara–selatan, longitude posisi timur–barat. Dipakai supaya pin di peta
            FOMO Padang jatuh tepat di lokasi acaranya.
          </p>

          <strong>Cara ambil dari Google Maps</strong>
          <ol>
            <li>Buka Google Maps</li>
            <li>Cari lokasi event</li>
            <li>Tekan lama / klik kanan titik lokasinya</li>
            <li>Copy koordinat yang muncul</li>
            <li>Angka pertama = <strong>Latitude</strong></li>
            <li>Angka kedua = <strong>Longitude</strong></li>
            <li>Paste ke form FOMO Padang</li>
          </ol>

          <p className="hint" style={{ margin: '10px 0 0' }}>
            Contoh: <code>-0.9471, 100.4172</code>
          </p>
          <button type="button" className="btn btn-sm" style={{ marginTop: 10 }}
            onClick={() => setOpen(false)}>Tutup</button>
        </div>
      ) : null}
    </span>
  );
}
