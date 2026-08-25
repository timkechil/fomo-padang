'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Icon from './Icon';
import { AUDIENCES, DISTRICTS } from '@/lib/constants';
import type { CategoryRow } from '@/lib/types';

/**
 * Same form the prototype had. Two required fields, everything else optional.
 * On failure the entered values stay exactly where they are (spec §38).
 */
export default function SubmitForm({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * V1.2 bug #9 — the form submitted while people were still filling it in.
   *
   * Root cause: a single-visible-input HTML form submits implicitly when Enter
   * is pressed in any text field, and mobile keyboards map their Go/Next/Done
   * key to exactly that. Nothing in the code called submit — the browser did.
   *
   * Fix: the submit path is gated on an explicit press of the send button.
   * `submitIntent` is only ever set by that button's own pointer/click handler,
   * and is cleared immediately after being read, so an implicit submission —
   * from Enter, a keyboard Go key, a dropdown, or a date picker — is ignored.
   */
  const submitIntent = useRef(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const intentional = submitIntent.current;
    submitIntent.current = false;
    if (!intentional) return;              // implicit submit: ignore entirely

    if (busy) return;                      // guards double submits
    setBusy(true);
    setErrors({});
    setFormError(null);

    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};
    fd.forEach((value, key) => {
      if (typeof value === 'string') payload[key] = value;
    });

    try {
      const res = await fetch('/api/submissions', {
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
        sessionStorage.setItem('fomo.last-submission', JSON.stringify({
          code: json.submission_code, title: json.event_name,
        }));
      } catch { /* storage blocked: the done page falls back to a generic thanks */ }

      router.push('/submit/done');
    } catch {
      setFormError('Yah, infonya belum berhasil dikirim. Data yang kamu isi jangan sampai hilang — coba lagi sebentar ya.');
      setBusy(false);
    }
  }

  const err = (name: string) =>
    errors[name] ? <span className="err">{errors[name]}</span> : null;
  const invalid = (name: string) => (errors[name] ? true : undefined);

  return (
    <form
      className="formcard"
      onSubmit={onSubmit}
      noValidate
      onKeyDown={(e) => {
        // Enter inside a textarea is a newline; anywhere else in this form it
        // would trigger an implicit submit, so stop it before it starts.
        const target = e.target as HTMLElement;
        if (e.key === 'Enter' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      {formError ? <div className="formnote" role="alert">{formError}</div> : null}

      <h3 className="blockhead">Yang wajib diisi</h3>

      <div className="field">
        <label htmlFor="s-url">Link sumber event <span className="req">*</span></label>
        <p className="hint">Instagram, TikTok, website, atau tautan publik lain. Ini yang kami pakai buat verifikasi.</p>
        <input id="s-url" name="source_url" type="url" placeholder="https://instagram.com/p/..."
          aria-invalid={invalid('source_url')} required />
        {err('source_url')}
      </div>

      <div className="field">
        <label htmlFor="s-title">Nama event <span className="req">*</span></label>
        <input id="s-title" name="event_name" type="text" placeholder="Misal: Pasar Kreatif Padang"
          aria-invalid={invalid('event_name')} required />
        {err('event_name')}
      </div>

      {/* honeypot: hidden from people, irresistible to bots */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <label htmlFor="s-website">Website</label>
        <input id="s-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <details className="accordion" style={{ marginTop: 22 }}>
        <summary>Detail tambahan (opsional) <Icon name="down" size={16} /></summary>
        <div className="acc-body">
          <div className="formgrid">
            <div className="field">
              <label htmlFor="s-org">Penyelenggara</label>
              <input id="s-org" name="organizer_name" placeholder="Nama komunitas / brand" />
            </div>
            <div className="field">
              <label htmlFor="s-cat">Kategori</label>
              <select id="s-cat" name="category_id" defaultValue="">
                <option value="">Belum tahu</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-start">Tanggal mulai</label>
              <input id="s-start" name="start_date" type="date" aria-invalid={invalid('start_date')} />
              {err('start_date')}
            </div>
            <div className="field">
              <label htmlFor="s-end">Tanggal selesai</label>
              <input id="s-end" name="end_date" type="date" aria-invalid={invalid('end_date')} />
              {err('end_date')}
            </div>
            <div className="field">
              <label htmlFor="s-st">Jam mulai</label>
              <input id="s-st" name="start_time" type="time" />
            </div>
            <div className="field">
              <label htmlFor="s-et">Jam selesai</label>
              <input id="s-et" name="end_time" type="time" />
            </div>
            <div className="field">
              <label htmlFor="s-venue">Nama tempat</label>
              <input id="s-venue" name="venue_name" placeholder="Misal: Youth Center Padang" />
            </div>
            <div className="field">
              <label htmlFor="s-area">Kecamatan</label>
              <select id="s-area" name="district" defaultValue="">
                <option value="">Belum tahu</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-addr">Alamat</label>
              <input id="s-addr" name="address" placeholder="Jalan, kelurahan" />
            </div>
            <div className="field">
              <label htmlFor="s-lat">Titik peta — latitude</label>
              <input id="s-lat" name="latitude" placeholder="-0.9438" aria-invalid={invalid('latitude')} />
              {err('latitude')}
            </div>
            <div className="field">
              <label htmlFor="s-lng">Titik peta — longitude</label>
              <input id="s-lng" name="longitude" placeholder="100.3595" aria-invalid={invalid('longitude')} />
              {err('longitude')}
            </div>
            <div className="field">
              <label htmlFor="s-ptype">Tiket</label>
              <select id="s-ptype" name="price_type" defaultValue="">
                <option value="">Belum tahu</option>
                <option value="free">Gratis</option>
                <option value="paid">Berbayar</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-price">Harga tiket (angka)</label>
              <input id="s-price" name="price_amount" inputMode="numeric" placeholder="35000"
                aria-invalid={invalid('price_amount')} />
              {err('price_amount')}
            </div>
            <div className="field">
              <label htmlFor="s-ticket">Link tiket</label>
              <input id="s-ticket" name="ticket_url" type="url" placeholder="https://..." />
            </div>
            <div className="field">
              <label htmlFor="s-ig">Link postingan Instagram</label>
              <input id="s-ig" name="instagram_url" type="url" placeholder="https://instagram.com/p/..." />
            </div>
            <div className="field">
              <label htmlFor="s-aud">Untuk siapa</label>
              <select id="s-aud" name="audience" defaultValue="">
                <option value="">Belum tahu</option>
                {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-reg">Perlu daftar dulu?</label>
              <select id="s-reg" name="registration_required" defaultValue="">
                <option value="">Belum tahu</option>
                <option value="ya">Ya, perlu daftar</option>
                <option value="tidak">Tidak, datang aja</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="s-desc">Deskripsi singkat</label>
            <textarea id="s-desc" name="description" placeholder="Apa yang terjadi di acara ini? Tulis sebisanya." />
          </div>
          <p className="sec-note">
            Poster nggak perlu diunggah. Kirim link sumbernya aja — tim FOMO yang ambil posternya saat pengecekan.
          </p>
        </div>
      </details>

      <h3 className="blockhead" style={{ marginTop: 8 }}>Kamu siapa? (opsional)</h3>
      <div className="formgrid">
        <div className="field">
          <label htmlFor="s-name">Nama / nama komunitas</label>
          <input id="s-name" name="contributor_name" placeholder="Biar kami bisa bilang makasih" />
        </div>
        <div className="field">
          <label htmlFor="s-contact">Email atau WhatsApp</label>
          <input id="s-contact" name="contributor_contact" placeholder="Kalau perlu kami tanya lagi" />
        </div>
      </div>

      <div style={{ background: 'var(--paper-2)', border: 'var(--line)', borderRadius: 'var(--r)',
        padding: 14, margin: '8px 0 18px', fontWeight: 700, fontSize: 14 }}>
        Nggak tahu semuanya? Nggak apa-apa. Kirim yang kamu tahu, tim FOMO akan cek sisanya.
      </div>

      <button
        className="btn btn-primary btn-block"
        type="submit"
        style={{ padding: 15 }}
        disabled={busy}
        onClick={() => { submitIntent.current = true; }}
      >
        <Icon name="send" size={16} /> {busy ? 'Mengirim…' : 'Kirim ke Tim FOMO'}
      </button>
      <p className="sec-note" style={{ marginTop: 12, textAlign: 'center' }}>
        Setiap kiriman dicek manual sebelum tayang: <strong>Dikirim → Ditinjau → Disetujui → Tayang</strong>
      </p>
    </form>
  );
}
