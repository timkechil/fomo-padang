'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Icon from './Icon';
import LocationPicker from './LocationPicker';
import type { CategoryRow } from '@/lib/types';

/**
 * V1.3 §11 — "Kasih Info Tempat". Same philosophy as Kasih Info Event:
 * no login, few required fields, mobile-first.
 *
 * Carries the same submit-intent gate as the event form so the mobile
 * keyboard's Go/Next key can never submit it (V1.2 §9).
 */
export default function SubmitPlaceForm({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [priceType, setPriceType] = useState('');
  const submitIntent = useRef(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const intentional = submitIntent.current;
    submitIntent.current = false;
    if (!intentional) return;
    if (busy) return;

    setBusy(true);
    setErrors({});
    setFormError(null);

    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};
    fd.forEach((v, k) => { if (typeof v === 'string') payload[k] = v; });

    try {
      const res = await fetch('/api/place-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErrors(json.errors ?? {});
        setFormError(json.message ?? 'Yah, infonya belum berhasil dikirim. Coba lagi sebentar ya.');
        setBusy(false);
        return;
      }

      try {
        sessionStorage.setItem('fomo.last-place-submission', JSON.stringify({
          code: json.submission_code, title: json.place_name,
        }));
      } catch { /* storage blocked */ }

      router.push('/submit-place/done');
    } catch {
      setFormError('Yah, infonya belum berhasil dikirim. Data yang kamu isi jangan sampai hilang — coba lagi sebentar ya.');
      setBusy(false);
    }
  }

  const err = (n: string) => (errors[n] ? <span className="err">{errors[n]}</span> : null);
  const invalid = (n: string) => (errors[n] ? true : undefined);

  return (
    <form className="formcard" onSubmit={onSubmit} noValidate
      onKeyDown={(e) => {
        const t = e.target as HTMLElement;
        if (e.key === 'Enter' && t.tagName !== 'TEXTAREA') e.preventDefault();
      }}>
      {formError ? <div className="formnote" role="alert">{formError}</div> : null}

      <h3 className="blockhead">Yang wajib diisi</h3>

      <div className="field">
        <label htmlFor="p-name">Nama tempat <span className="req">*</span></label>
        <input id="p-name" name="place_name" placeholder="Misal: Kopi Kenangan Taplau"
          aria-invalid={invalid('place_name')} required />
        {err('place_name')}
      </div>

      <div className="field">
        <label htmlFor="p-cat">Kategori <span className="req">*</span></label>
        <select id="p-cat" name="category_id" defaultValue="" aria-invalid={invalid('category_id')} required>
          <option value="">Pilih kategori</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {err('category_id')}
      </div>

      <div className="field">
        <label htmlFor="p-source">Link sumber / referensi <span className="req">*</span></label>
        <p className="hint">
          Link Instagram, Google Maps, atau website tempatnya. Dipakai tim FOMO buat verifikasi.
        </p>
        <input id="p-source" name="source_url" type="url" placeholder="https://..."
          aria-invalid={invalid('source_url')} required />
        {err('source_url')}
      </div>

      {/* honeypot */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <label htmlFor="p-website">Website</label>
        <input id="p-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <h3 className="blockhead" style={{ marginTop: 8 }}>Lokasi</h3>
      <LocationPicker
        showVenue={false}
        names={{ venue: 'venue_name', address: 'address', latitude: 'latitude', longitude: 'longitude' }} />
      {err('latitude')}{err('longitude')}

      <div className="field">
        <label htmlFor="p-district">Kecamatan</label>
        <select id="p-district" name="district" defaultValue="">
          <option value="">Belum tahu</option>
          {['Padang Barat', 'Padang Timur', 'Padang Utara', 'Padang Selatan', 'Koto Tangah',
            'Pauh', 'Kuranji', 'Nanggalo', 'Lubuk Begalung', 'Lubuk Kilangan', 'Bungus Teluk Kabung']
            .map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <details className="accordion" style={{ marginTop: 22 }}>
        <summary>Detail tambahan (opsional) <Icon name="down" size={16} /></summary>
        <div className="acc-body">
          <div className="field">
            <label htmlFor="p-desc">Deskripsi singkat</label>
            <textarea id="p-desc" name="description"
              placeholder="Tempatnya seperti apa? Apa yang bikin layak didatangi?" />
          </div>
          <div className="formgrid">
            <div className="field">
              <label htmlFor="p-hours">Jam operasional</label>
              <input id="p-hours" name="opening_hours_label" placeholder="Setiap hari 08.00–22.00" />
            </div>
            <div className="field">
              <label htmlFor="p-atype">Tiket masuk</label>
              <select id="p-atype" name="admission_type" value={priceType}
                onChange={(e) => setPriceType(e.target.value)}>
                <option value="">Belum tahu</option>
                <option value="free">Gratis</option>
                <option value="paid">Berbayar</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="p-aprice">Perkiraan harga masuk</label>
              <input id="p-aprice" name="admission_price" inputMode="numeric" placeholder="10000"
                disabled={priceType !== 'paid'} aria-invalid={invalid('admission_price')} />
              {err('admission_price')}
            </div>
            <div className="field">
              <label htmlFor="p-ig">Instagram tempat</label>
              <input id="p-ig" name="instagram_url" type="url" placeholder="https://instagram.com/..." />
            </div>
            <div className="field">
              <label htmlFor="p-web">Website</label>
              <input id="p-web" name="website_url" type="url" placeholder="https://..." />
            </div>
            <div className="field">
              <label htmlFor="p-photo">Sumber foto</label>
              <input id="p-photo" name="source_photo" placeholder="Link foto, atau: Foto punya saya sendiri" />
            </div>
          </div>
          <p className="sec-note">
            Fotonya nggak perlu diunggah. Cukup kasih link sumbernya — tim FOMO yang urus posternya.
          </p>
        </div>
      </details>

      <h3 className="blockhead" style={{ marginTop: 8 }}>Kamu siapa? (opsional)</h3>
      <div className="formgrid">
        <div className="field">
          <label htmlFor="p-cname">Nama / nama komunitas</label>
          <input id="p-cname" name="contributor_name" placeholder="Biar kami bisa bilang makasih" />
        </div>
        <div className="field">
          <label htmlFor="p-ccontact">Email atau WhatsApp</label>
          <input id="p-ccontact" name="contributor_contact" placeholder="Kalau perlu kami tanya lagi" />
          <p className="hint">Kontak kamu cuma dilihat tim FOMO, nggak pernah tampil di halaman publik.</p>
        </div>
      </div>

      <div style={{ background: 'var(--paper-2)', border: 'var(--line)', borderRadius: 'var(--r)',
        padding: 14, margin: '8px 0 18px', fontWeight: 700, fontSize: 14 }}>
        Nggak tahu semuanya? Nggak apa-apa. Kirim yang kamu tahu, tim FOMO akan cek sisanya.
      </div>

      <button className="btn btn-primary btn-block" type="submit" style={{ padding: 15 }}
        disabled={busy} onClick={() => { submitIntent.current = true; }}>
        <Icon name="send" size={16} /> {busy ? 'Mengirim…' : 'Kirim ke Tim FOMO'}
      </button>
      <p className="sec-note" style={{ marginTop: 12, textAlign: 'center' }}>
        Setiap kiriman dicek manual sebelum tayang: <strong>Dikirim → Ditinjau → Disetujui → Tayang</strong>
      </p>
    </form>
  );
}
