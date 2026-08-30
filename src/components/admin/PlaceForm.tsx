'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import PosterUploader from './PosterUploader';
import LocationPicker from '../LocationPicker';
import { DISTRICTS } from '@/lib/constants';
import { savePlaceAction, type ActionState } from '@/server/admin-actions';
import type { CategoryRow, PlaceRow } from '@/lib/types';

function SaveButton() {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary" type="submit" disabled={pending}>
    {pending ? 'Menyimpan…' : 'Simpan'}
  </button>;
}

export default function PlaceForm({
  place, categories, saved,
}: { place?: PlaceRow; categories: CategoryRow[]; saved?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(savePlaceAction, {});
  const [cover, setCover] = useState(place?.cover_image_url ?? '');
  const err = (n: string) => (state.errors?.[n] ? <span className="err">{state.errors[n]}</span> : null);

  return (
    <form action={action} className="formcard">
      {place ? <input type="hidden" name="place_id" value={place.id} /> : null}
      {saved && !state.message ? <div className="formnote ok">Perubahan tersimpan.</div> : null}
      {state.message ? <div className="formnote" role="alert">{state.message}</div> : null}

      <div className="field">
        <label htmlFor="p-name">Nama tempat *</label>
        <input id="p-name" name="name" defaultValue={place?.name ?? ''} required />
        {err('name')}
      </div>
      <div className="field">
        <label htmlFor="p-desc">Deskripsi</label>
        <textarea id="p-desc" name="description" defaultValue={place?.description ?? ''} />
      </div>
      <div className="field">
        <label htmlFor="p-tips">Tips</label>
        <input id="p-tips" name="tips" defaultValue={place?.tips ?? ''}
          placeholder="Misal: paling enak jelang sunset" />
      </div>

      <div className="formgrid">
        <div className="field">
          <label htmlFor="p-cat">Kategori</label>
          <select id="p-cat" name="category_id" defaultValue={place?.category_id ?? ''}>
            <option value="">— belum ditentukan —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="p-district">Kecamatan</label>
          <select id="p-district" name="district" defaultValue={place?.district ?? ''}>
            <option value="">— belum ditentukan —</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="p-hours">Jam buka (teks)</label>
          <input id="p-hours" name="opening_hours_label"
            defaultValue={place?.opening_hours?.label ?? ''} placeholder="Setiap hari 08.00–18.00" />
        </div>

        <div className="field">
          <label htmlFor="p-atype">Tiket masuk</label>
          <select id="p-atype" name="admission_type" defaultValue={place?.admission_type ?? 'free'}>
            <option value="free">Gratis</option>
            <option value="paid">Berbayar</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="p-aprice">Harga masuk</label>
          <input id="p-aprice" name="admission_price" inputMode="numeric"
            defaultValue={place?.admission_price ?? ''} />
          {err('admission_price')}
        </div>
        <div className="field">
          <label htmlFor="p-ig">Instagram</label>
          <input id="p-ig" name="instagram_url" type="url" defaultValue={place?.instagram_url ?? ''} />
        </div>
        <div className="field">
          <label htmlFor="p-web">Website</label>
          <input id="p-web" name="website_url" type="url" defaultValue={place?.website_url ?? ''} />
        </div>
      </div>

      <LocationPicker
        showVenue={false}
        names={{ venue: 'venue_name', address: 'address', latitude: 'latitude', longitude: 'longitude' }}
        defaults={{
          address: place?.address ?? '',
          latitude: place?.latitude != null ? String(place.latitude) : '',
          longitude: place?.longitude != null ? String(place.longitude) : '',
        }} />
      {err('latitude')}{err('longitude')}

      <div className="field">
        <label>Foto sampul</label>
        <PosterUploader bucket="place-images" value={cover} onChange={setCover} />
        <input type="hidden" name="cover_image_url" value={cover} />
      </div>

      <div className="field">
        <label htmlFor="p-source">Source photo</label>
        <input id="p-source" name="source_photo" defaultValue={place?.source_photo ?? ''}
          placeholder="https://instagram.com/... atau: Photo by Tim FOMO" />
        <p className="hint">
          Dari mana fotonya berasal. Boleh link, boleh teks biasa. Ditampilkan kecil
          di halaman tempat sebagai kredit.
        </p>
        {err('source_photo')}
      </div>

      <div className="formgrid">
        <div className="field">
          <label htmlFor="p-status">Status</label>
          <select id="p-status" name="status" defaultValue={place?.status ?? 'draft'}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="temporarily_closed">Tutup sementara</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="field">
          <label className="chip" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" name="featured" value="on" defaultChecked={place?.featured} />
            Tampilkan lebih dulu
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <SaveButton />
        {place ? <Link className="btn" href={`/place/${place.slug}`} target="_blank">Pratinjau</Link> : null}
        <Link className="btn" href="/admin/places">Kembali</Link>
      </div>
    </form>
  );
}
