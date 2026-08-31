'use client';

import { useState } from 'react';
import PosterUploader from './PosterUploader';
import OrganizerPicker from './OrganizerPicker';
import LocationPicker from '../LocationPicker';
import ScheduleFields from '../ScheduleFields';
import { AUDIENCES, DISTRICTS } from '@/lib/constants';
import type { CategoryRow, OrganizerRow } from '@/lib/types';

export interface EventDefaults {
  title?: string;
  schedule_type?: 'single' | 'range' | 'multiple' | null;
  dates?: string[];
  slug?: string | null;
  description?: string | null;
  organizer_id?: string | null;
  category_ids?: string[];
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue_name?: string | null;
  address?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price_type?: 'free' | 'paid';
  price_amount?: number | null;
  ticket_url?: string | null;
  source_url?: string | null;
  instagram_url?: string | null;
  poster_url?: string | null;
  registration_required?: boolean | null;
  audience?: string | null;
  featured?: boolean;
  status?: string;
}

/** One field set, used both by the moderation editor and by
 *  /admin/events/new so the two can never drift apart. */
export default function EventFields({
  defaults, categories, organizers, errors = {}, showStatus = true,
}: {
  defaults: EventDefaults;
  categories: CategoryRow[];
  organizers: OrganizerRow[];
  errors?: Record<string, string>;
  showStatus?: boolean;
}) {
  const [posterUrl, setPosterUrl] = useState(defaults.poster_url ?? '');
  const [priceType, setPriceType] = useState(defaults.price_type ?? 'free');
  const time = (t?: string | null) => (t ? t.slice(0, 5) : '');
  const err = (name: string) => (errors[name] ? <span className="err">{errors[name]}</span> : null);
  const invalid = (name: string) => (errors[name] ? true : undefined);

  return (
    <>
      <div className="field">
        <label htmlFor="f-title">Judul event *</label>
        <input id="f-title" name="title" defaultValue={defaults.title ?? ''}
          aria-invalid={invalid('title')} required />
        {err('title')}
      </div>

      <div className="field">
        <label htmlFor="f-desc">Deskripsi</label>
        <textarea id="f-desc" name="description" defaultValue={defaults.description ?? ''} />
        <p className="hint">Teks biasa. Tidak ada HTML yang dirender, jadi aman dari script.</p>
      </div>

      {/* Jenis Jadwal — the one shared schedule control, also used by the
          submission review editor and the public contributor form. It renders
          its own .field / .formgrid blocks, so it sits outside the details
          grid below rather than nested inside it. */}
      <ScheduleFields idPrefix="f" errors={errors}
        defaults={{
          schedule_type: defaults.schedule_type,
          start_date: defaults.start_date,
          end_date: defaults.end_date,
          dates: defaults.dates,
        }} />

      <div className="formgrid">
        <OrganizerPicker organizers={organizers} defaultValue={defaults.organizer_id} />

        <div className="field">
          <label htmlFor="f-slug">Slug URL</label>
          <input id="f-slug" name="slug" defaultValue={defaults.slug ?? ''}
            placeholder="dibuat otomatis dari judul" />
          <p className="hint">Kosongkan untuk otomatis. Kalau bentrok, database menambah -2.</p>
        </div>


        <div className="field">
          <label htmlFor="f-st">Jam mulai</label>
          <input id="f-st" name="start_time" type="time" defaultValue={time(defaults.start_time)} />
        </div>
        <div className="field">
          <label htmlFor="f-et">Jam selesai</label>
          <input id="f-et" name="end_time" type="time" defaultValue={time(defaults.end_time)} />
        </div>


        <div className="field">
          <label htmlFor="f-district">Kecamatan</label>
          <select id="f-district" name="district" defaultValue={defaults.district ?? ''}>
            <option value="">— belum ditentukan —</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>


        <div className="field">
          <label htmlFor="f-audience">Untuk siapa</label>
          <select id="f-audience" name="audience" defaultValue={defaults.audience ?? ''}>
            <option value="">— semua —</option>
            {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>



        <div className="field">
          <label htmlFor="f-ptype">Tiket</label>
          <select id="f-ptype" name="price_type" value={priceType}
            onChange={(e) => setPriceType(e.target.value as 'free' | 'paid')}>
            <option value="free">Gratis</option>
            <option value="paid">Berbayar</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-price">Harga (angka)</label>
          <input id="f-price" name="price_amount" inputMode="numeric"
            defaultValue={defaults.price_amount ?? ''} disabled={priceType === 'free'}
            aria-invalid={invalid('price_amount')} />
          {err('price_amount')}
        </div>

        <div className="field">
          <label htmlFor="f-ticket">Link tiket</label>
          <input id="f-ticket" name="ticket_url" type="url" defaultValue={defaults.ticket_url ?? ''} />
        </div>
        <div className="field">
          <label htmlFor="f-source">Link Sumber Asli Event</label>
          <input id="f-source" name="source_url" type="url" defaultValue={defaults.source_url ?? ''}
            placeholder="https://instagram.com/p/... atau link resmi event"
            aria-invalid={invalid('source_url')} />
          <p className="hint">
            Link ke postingan/halaman asli event ini — bukan profil penyelenggara.
            Tombol “Lihat Info Asli” di halaman publik membuka link ini.
          </p>
          {err('source_url')}
        </div>
      </div>

      {/* V1.3 §13/§14 — one shared location component: Google Places when
          configured, manual venue/address/lat/lng with ? help always. */}
      <LocationPicker
        venueLabel="Nama tempat"
        names={{ venue: 'venue_name', address: 'address', latitude: 'latitude', longitude: 'longitude' }}
        defaults={{
          venue: defaults.venue_name ?? '',
          address: defaults.address ?? '',
          latitude: defaults.latitude != null ? String(defaults.latitude) : '',
          longitude: defaults.longitude != null ? String(defaults.longitude) : '',
        }} />
      {err('latitude')}{err('longitude')}

      <div className="field">
        <label>Kategori</label>
        <p className="hint">Yang pertama dipilih jadi kategori utama (warna kartu dan pin peta).</p>
        <div className="chiprow" style={{ flexWrap: 'wrap' }}>
          {categories.filter((c) => c.type === 'event').map((c) => (
            <label key={c.id} className="chip" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" name="category_ids" value={c.id}
                defaultChecked={defaults.category_ids?.includes(c.id)} />
              <span style={{ color: c.color, fontWeight: 800 }}>{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Poster</label>
        <PosterUploader bucket="event-posters" value={posterUrl} onChange={setPosterUrl} />
        <input type="hidden" name="poster_url" value={posterUrl} />
      </div>

      <div className="formgrid">
        <div className="field">
          <label className="chip" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" name="registration_required" value="on"
              defaultChecked={Boolean(defaults.registration_required)} />
            Perlu daftar dulu
          </label>
        </div>
        <div className="field">
          <label className="chip" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" name="featured" value="on" defaultChecked={Boolean(defaults.featured)} />
            Tandai “Lagi Ramai”
          </label>
        </div>
      </div>

      {showStatus ? (
        <div className="field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" name="status" defaultValue={defaults.status ?? 'draft'}>
            <option value="draft">Draft — belum tayang</option>
            <option value="published">Published — tayang publik</option>
            <option value="cancelled">Cancelled — dibatalkan</option>
            <option value="archived">Archived — disimpan, hilang dari discovery</option>
          </select>
        </div>
      ) : null}
    </>
  );
}
