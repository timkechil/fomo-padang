'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Icon from '../Icon';
import EventFields from './EventFields';
import { REJECT_REASONS, SUBMISSION_STATUS_LABEL } from '@/lib/constants';
import { fmtLong } from '@/lib/format';
import {
  approveSubmissionAction, reviewSubmissionAction, type ActionState,
} from '@/server/admin-actions';
import type { CategoryRow, OrganizerRow, SubmissionRow } from '@/lib/types';

function Submit({ label, busyLabel, className = 'btn btn-primary' }:
{ label: string; busyLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? busyLabel : label}
    </button>
  );
}

export default function ReviewSubmission({
  submission: s, categories, organizers,
}: { submission: SubmissionRow; categories: CategoryRow[]; organizers: OrganizerRow[] }) {
  const [approveState, approve] = useActionState<ActionState, FormData>(approveSubmissionAction, {});
  const [reviewState, review] = useActionState<ActionState, FormData>(reviewSubmissionAction, {});

  const submitted: [string, string | null][] = [
    ['Nama event', s.event_name],
    ['Penyelenggara', s.organizer_name],
    ['Tanggal', s.start_date ? `${s.start_date}${s.end_date && s.end_date !== s.start_date ? ` – ${s.end_date}` : ''}` : null],
    ['Jam', s.start_time ? `${s.start_time.slice(0, 5)}${s.end_time ? `–${s.end_time.slice(0, 5)}` : ''}` : null],
    ['Tempat', s.venue_name],
    ['Alamat', s.address],
    ['Kecamatan', s.district],
    ['Titik peta', s.latitude != null && s.longitude != null ? `${s.latitude}, ${s.longitude}` : null],
    ['Tiket', s.price_type === 'paid' ? `Rp${Number(s.price_amount ?? 0).toLocaleString('id-ID')}` : s.price_type === 'free' ? 'Gratis' : null],
    ['Link tiket', s.ticket_url],
    ['Instagram', s.instagram_url],
    ['Untuk', s.audience],
    ['Perlu daftar', s.registration_required === null ? null : s.registration_required ? 'Ya' : 'Tidak'],
    ['Deskripsi', s.description],
    ['Kontributor', s.contributor_name],
    ['Kontak kontributor', s.contributor_contact],
  ];

  const alreadyApproved = s.status === 'approved';

  return (
    <section className="section">
      <div className="wrap">
        {approveState.message ? <div className="formnote" role="alert">{approveState.message}</div> : null}
        {reviewState.message ? (
          <div className={`formnote${reviewState.ok ? ' ok' : ''}`} role="status">{reviewState.message}</div>
        ) : null}

        <div className="detail-body" style={{ paddingTop: 0 }}>
          <div>
            <h2 className="blockhead">Event editor</h2>
            {alreadyApproved ? (
              <div className="formnote ok">
                Kiriman ini sudah disetujui dan eventnya sudah dibuat. Edit lewat halaman event.
              </div>
            ) : (
              <form action={approve} className="formcard">
                <input type="hidden" name="submission_id" value={s.id} />
                <EventFields
                  categories={categories}
                  organizers={organizers}
                  errors={approveState.errors}
                  showStatus={false}
                  defaults={{
                    title: s.event_name,
                    description: s.description,
                    category_ids: s.category_id ? [s.category_id] : [],
                    start_date: s.start_date,
                    end_date: s.end_date,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    venue_name: s.venue_name,
                    address: s.address,
                    district: s.district,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    price_type: s.price_type ?? 'free',
                    price_amount: s.price_amount,
                    ticket_url: s.ticket_url,
                    source_url: s.source_url,
                    instagram_url: s.instagram_url,
                    poster_url: s.poster_url,
                    registration_required: s.registration_required,
                    audience: s.audience,
                  }} />
                {/* status is set to 'published' by approve_submission(), never by the form */}
                <input type="hidden" name="status" value="published" />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                  <Submit label="Approve & Publish" busyLabel="Menerbitkan…" />
                  <a className="btn" href={s.source_url} target="_blank" rel="noopener noreferrer">
                    <Icon name="external" size={15} /> Buka Sumber Asli
                  </a>
                </div>
                <p className="sec-note" style={{ marginTop: 10 }}>
                  Menyetujui membuat satu event baru berstatus <strong>published</strong> dan menandai
                  kiriman ini <strong>approved</strong>. Klik dobel tidak membuat event ganda.
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
              <a className="btn btn-sm btn-block" href={s.source_url} target="_blank" rel="noopener noreferrer">
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
            </div>

            {!alreadyApproved ? (
              <div className="sidebox">
                <h3 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Tolak / minta revisi
                </h3>
                <form action={review}>
                  <input type="hidden" name="submission_id" value={s.id} />
                  <div className="field">
                    <label htmlFor="r-status">Status baru</label>
                    <select id="r-status" name="status" defaultValue="rejected">
                      <option value="rejected">Ditolak</option>
                      <option value="needs_revision">Perlu revisi</option>
                      <option value="pending">Kembalikan ke antrean</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="r-reason">Alasan</label>
                    <select id="r-reason" name="reason" defaultValue={REJECT_REASONS[0]}>
                      {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="r-notes">Catatan internal</label>
                    <textarea id="r-notes" name="notes" defaultValue={s.admin_notes ?? ''}
                      style={{ minHeight: 80 }} />
                  </div>
                  <Submit label="Simpan status" busyLabel="Menyimpan…" className="btn btn-block" />
                  <p className="sec-note" style={{ marginTop: 10 }}>
                    Kiriman yang ditolak tetap tersimpan sebagai riwayat moderasi.
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
