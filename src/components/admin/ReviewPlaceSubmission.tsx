'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Icon from '../Icon';
import PosterUploader from './PosterUploader';
import LocationPicker from '../LocationPicker';
import { REJECT_REASONS, SUBMISSION_STATUS_LABEL, DISTRICTS } from '@/lib/constants';
import { fmtLong } from '@/lib/format';
import {
  approvePlaceSubmissionAction, reviewPlaceSubmissionAction, type ActionState,
} from '@/server/admin-actions';
import type { CategoryRow, PlaceSubmissionRow } from '@/lib/types';

function Submit({ label, busyLabel, className = 'btn btn-primary' }:
{ label: string; busyLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? busyLabel : label}
    </button>
  );
}

/** V1.3 §12 — mirrors ReviewSubmission for events: what the contributor sent
 *  on one side, an editable place on the other. */
export default function ReviewPlaceSubmission({
  submission: s, categories,
}: { submission: PlaceSubmissionRow; categories: CategoryRow[] }) {
  const [approveState, approve] = useActionState<ActionState, FormData>(approvePlaceSubmissionAction, {});
  const [reviewState, review] = useActionState<ActionState, FormData>(reviewPlaceSubmissionAction, {});
  const [cover, setCover] = useState('');
  const [admission, setAdmission] = useState(s.admission_type ?? 'free');

  const submitted: [string, string | null][] = [
    ['Nama tempat', s.place_name],
    ['Alamat', s.address],
    ['Kecamatan', s.district],
    ['Titik peta', s.latitude != null && s.longitude != null ? `${s.latitude}, ${s.longitude}` : null],
    ['Jam operasional', s.opening_hours_label],
    ['Tiket masuk', s.admission_type === 'paid'
      ? `Rp${Number(s.admission_price ?? 0).toLocaleString('id-ID')}`
      : s.admission_type === 'free' ? 'Gratis' : null],
    ['Instagram', s.instagram_url],
    ['Website', s.website_url],
    ['Sumber foto', s.source_photo],
    ['Deskripsi', s.description],
    ['Kontributor', s.contributor_name],
    ['Kontak kontributor', s.contributor_contact],
  ];

  const alreadyApproved = s.status === 'approved';
  const err = (n: string) =>
    approveState.errors?.[n] ? <span className="err">{approveState.errors[n]}</span> : null;

  return (
    <section className="section">
      <div className="wrap">
        {approveState.message ? <div className="formnote" role="alert">{approveState.message}</div> : null}
        {reviewState.message ? (
          <div className={`formnote${reviewState.ok ? ' ok' : ''}`} role="status">{reviewState.message}</div>
        ) : null}

        <div className="detail-body" style={{ paddingTop: 0 }}>
          <div>
            <h2 className="blockhead">Editor tempat</h2>

            {alreadyApproved ? (
              <div className="formnote ok">
                Rekomendasi ini sudah disetujui dan tempatnya sudah dibuat.
                Edit lewat halaman tempat.
              </div>
            ) : (
              <form action={approve} className="formcard">
                <input type="hidden" name="submission_id" value={s.id} />

                <div className="field">
                  <label htmlFor="ap-name">Nama tempat *</label>
                  <input id="ap-name" name="name" defaultValue={s.place_name} required />
                  {err('name')}
                </div>

                <div className="field">
                  <label htmlFor="ap-cat">Kategori</label>
                  <select id="ap-cat" name="category_id" defaultValue={s.category_id ?? ''}>
                    <option value="">— belum ditentukan —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="ap-desc">Deskripsi</label>
                  <textarea id="ap-desc" name="description" defaultValue={s.description ?? ''} />
                </div>

                <div className="field">
                  <label htmlFor="ap-tips">Tips</label>
                  <input id="ap-tips" name="tips" placeholder="Misal: paling enak jelang sunset" />
                </div>

                <LocationPicker
                  showVenue={false}
                  names={{ venue: 'venue_name', address: 'address',
                    latitude: 'latitude', longitude: 'longitude' }}
                  defaults={{
                    address: s.address ?? '',
                    latitude: s.latitude != null ? String(s.latitude) : '',
                    longitude: s.longitude != null ? String(s.longitude) : '',
                  }} />
                {err('latitude')}{err('longitude')}

                <div className="formgrid">
                  <div className="field">
                    <label htmlFor="ap-district">Kecamatan</label>
                    <select id="ap-district" name="district" defaultValue={s.district ?? ''}>
                      <option value="">— belum ditentukan —</option>
                      {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="ap-hours">Jam operasional</label>
                    <input id="ap-hours" name="opening_hours_label"
                      defaultValue={s.opening_hours_label ?? ''} />
                  </div>
                  <div className="field">
                    <label htmlFor="ap-atype">Tiket masuk</label>
                    <select id="ap-atype" name="admission_type" value={admission}
                      onChange={(e) => setAdmission(e.target.value as 'free' | 'paid')}>
                      <option value="free">Gratis</option>
                      <option value="paid">Berbayar</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="ap-aprice">Harga masuk</label>
                    <input id="ap-aprice" name="admission_price" inputMode="numeric"
                      defaultValue={s.admission_price ?? ''} disabled={admission === 'free'} />
                    {err('admission_price')}
                  </div>
                  <div className="field">
                    <label htmlFor="ap-ig">Instagram</label>
                    <input id="ap-ig" name="instagram_url" type="url"
                      defaultValue={s.instagram_url ?? ''} />
                  </div>
                  <div className="field">
                    <label htmlFor="ap-web">Website</label>
                    <input id="ap-web" name="website_url" type="url"
                      defaultValue={s.website_url ?? ''} />
                  </div>
                </div>

                <div className="field">
                  <label>Foto sampul</label>
                  <PosterUploader bucket="place-images" value={cover} onChange={setCover} />
                  <input type="hidden" name="cover_image_url" value={cover} />
                </div>

                <div className="field">
                  <label htmlFor="ap-photo">Source photo</label>
                  <input id="ap-photo" name="source_photo" defaultValue={s.source_photo ?? ''}
                    placeholder="https://instagram.com/... atau: Photo by Tim FOMO" />
                </div>

                <div className="field">
                  <label className="chip" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" name="featured" value="on" />
                    Tampilkan lebih dulu
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                  <Submit label="Approve & Publish" busyLabel="Menerbitkan…" />
                  <a className="btn" href={s.source_url} target="_blank" rel="noopener noreferrer">
                    <Icon name="external" size={15} /> Buka Sumber Asli
                  </a>
                </div>
                <p className="sec-note" style={{ marginTop: 10 }}>
                  Menyetujui membuat satu tempat baru berstatus <strong>published</strong> dan
                  menandai rekomendasi ini <strong>approved</strong>. Klik dobel tidak membuat tempat ganda.
                </p>
              </form>
            )}
          </div>

          <aside>
            <div className="sidebox">
              <h3 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Info dari kontributor
              </h3>
              <p className="sec-note" style={{ marginBottom: 10 }}>
                {s.submission_code} · masuk {fmtLong(s.created_at.slice(0, 10))} ·{' '}
                <span className="status st-pending">{SUBMISSION_STATUS_LABEL[s.status]}</span>
              </p>
              <a className="btn btn-sm btn-block" href={s.source_url}
                target="_blank" rel="noopener noreferrer">
                <Icon name="external" size={15} /> Buka Sumber Asli
              </a>
              <dl style={{ marginTop: 14 }}>
                {submitted.filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <dt style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em',
                      textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{label}</dt>
                    <dd style={{ margin: 0, fontWeight: 600, fontSize: 14, wordBreak: 'break-word' }}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="sec-note">
                Kontak kontributor hanya terlihat di sini, tidak pernah tampil di halaman publik.
              </p>
            </div>

            {!alreadyApproved ? (
              <div className="sidebox">
                <h3 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Tolak / minta revisi
                </h3>
                <form action={review}>
                  <input type="hidden" name="submission_id" value={s.id} />
                  <div className="field">
                    <label htmlFor="rp-status">Status baru</label>
                    <select id="rp-status" name="status" defaultValue="rejected">
                      <option value="rejected">Ditolak</option>
                      <option value="needs_revision">Perlu revisi</option>
                      <option value="pending">Kembalikan ke antrean</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="rp-reason">Alasan</label>
                    <select id="rp-reason" name="reason" defaultValue={REJECT_REASONS[0]}>
                      {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="rp-notes">Catatan internal</label>
                    <textarea id="rp-notes" name="notes" defaultValue={s.admin_notes ?? ''}
                      style={{ minHeight: 80 }} />
                  </div>
                  <Submit label="Simpan status" busyLabel="Menyimpan…" className="btn btn-block" />
                  <p className="sec-note" style={{ marginTop: 10 }}>
                    Rekomendasi yang ditolak tetap tersimpan sebagai riwayat moderasi.
                  </p>
                </form>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
