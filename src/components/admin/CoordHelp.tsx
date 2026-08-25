'use client';

import { useState } from 'react';

/**
 * V1.2 §3 fallback — a tap-friendly explainer for Latitude/Longitude.
 * Deliberately click/tap driven, never hover, so it works on a phone.
 */
export default function CoordHelp() {
  const [open, setOpen] = useState(false);

  return (
    <span className="coordhelp">
      <button type="button" className="coordhelp-btn" aria-expanded={open}
        aria-label="Cara mendapatkan Latitude dan Longitude"
        onClick={() => setOpen((v) => !v)}>?</button>

      {open ? (
        <div className="coordhelp-pop" role="dialog"
          aria-label="Cara mendapatkan Latitude & Longitude">
          <strong>Cara mendapatkan Latitude &amp; Longitude</strong>
          <ol>
            <li>Buka Google Maps</li>
            <li>Cari lokasi event</li>
            <li>Tekan lama titik lokasinya</li>
            <li>Copy angka koordinat yang muncul</li>
            <li>Angka pertama = <strong>Latitude</strong></li>
            <li>Angka kedua = <strong>Longitude</strong></li>
            <li>Paste ke form FOMO Padang</li>
          </ol>
          <p className="hint" style={{ margin: '8px 0 0' }}>
            Contoh: <code>-0.9438, 100.3595</code>
          </p>
          <button type="button" className="btn btn-sm" style={{ marginTop: 10 }}
            onClick={() => setOpen(false)}>Tutup</button>
        </div>
      ) : null}
    </span>
  );
}
