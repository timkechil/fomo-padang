'use client';

import { useState } from 'react';
import Icon from './Icon';
import { fmtLong } from '@/lib/format';
import type { ScheduleType } from '@/lib/types';

/**
 * Jenis Jadwal — shared by the admin event form, the submission review editor
 * and (in simplified form) the public contributor form.
 *
 * Emits plain form fields so the existing FormData/Zod pipeline is unchanged:
 *   schedule_type, start_date, end_date, dates[]
 */
export default function ScheduleFields({
  defaults, errors = {}, idPrefix = 'sch',
}: {
  defaults?: { schedule_type?: ScheduleType | null; start_date?: string | null;
    end_date?: string | null; dates?: string[] };
  errors?: Record<string, string>;
  idPrefix?: string;
}) {
  const initialType: ScheduleType =
    defaults?.schedule_type ??
    (defaults?.dates?.length ? 'multiple' : defaults?.end_date ? 'range' : 'single');

  const [type, setType] = useState<ScheduleType>(initialType);
  const [start, setStart] = useState(defaults?.start_date ?? '');
  const [end, setEnd] = useState(defaults?.end_date ?? '');
  const [dates, setDates] = useState<string[]>([...(defaults?.dates ?? [])].sort());
  const [draft, setDraft] = useState('');

  const err = (n: string) => (errors[n] ? <span className="err">{errors[n]}</span> : null);

  function addDate() {
    const v = draft.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    if (dates.includes(v)) { setDraft(''); return; }   // no duplicates
    setDates([...dates, v].sort());
    setDraft('');
  }

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-type`}>Jenis Jadwal</label>
        <select id={`${idPrefix}-type`} name="schedule_type" value={type}
          onChange={(e) => setType(e.target.value as ScheduleType)}>
          <option value="single">Satu Tanggal</option>
          <option value="range">Rentang Tanggal</option>
          <option value="multiple">Beberapa Tanggal</option>
        </select>
        <p className="hint">
          {type === 'single' && 'Acara berlangsung sehari saja.'}
          {type === 'range' && 'Acara berlangsung setiap hari dari tanggal mulai sampai selesai.'}
          {type === 'multiple' && 'Acara cuma berlangsung di tanggal-tanggal yang kamu pilih.'}
        </p>
      </div>

      {type === 'single' ? (
        <div className="field">
          <label htmlFor={`${idPrefix}-start`}>Tanggal *</label>
          <input id={`${idPrefix}-start`} name="start_date" type="date" required
            value={start} onChange={(e) => setStart(e.target.value)}
            aria-invalid={errors.start_date ? true : undefined} />
          {err('start_date')}
        </div>
      ) : null}

      {type === 'range' ? (
        <div className="formgrid">
          <div className="field">
            <label htmlFor={`${idPrefix}-start`}>Tanggal Mulai *</label>
            <input id={`${idPrefix}-start`} name="start_date" type="date" required
              value={start} onChange={(e) => setStart(e.target.value)} />
            {err('start_date')}
          </div>
          <div className="field">
            <label htmlFor={`${idPrefix}-end`}>Tanggal Selesai</label>
            <input id={`${idPrefix}-end`} name="end_date" type="date"
              value={end} onChange={(e) => setEnd(e.target.value)} min={start || undefined}
              aria-invalid={errors.end_date ? true : undefined} />
            {err('end_date')}
          </div>
        </div>
      ) : null}

      {type === 'multiple' ? (
        <div className="field">
          <label htmlFor={`${idPrefix}-add`}>Tanggal Event</label>
          <p className="hint">
            Tambahkan setiap tanggal acaranya berlangsung. Tanggal di antaranya tidak
            akan dianggap ada acara.
          </p>

          {dates.length ? (
            <ul className="datelist">
              {dates.map((d) => (
                <li key={d}>
                  <span>{fmtLong(d)}</span>
                  <button type="button" aria-label={`Hapus ${fmtLong(d)}`}
                    onClick={() => setDates(dates.filter((x) => x !== d))}>
                    <Icon name="x" size={14} />
                  </button>
                  <input type="hidden" name="dates" value={d} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint" style={{ fontWeight: 700 }}>Belum ada tanggal dipilih.</p>
          )}

          <div className="dateadd">
            <input id={`${idPrefix}-add`} type="date" value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDate(); } }} />
            <button type="button" className="btn btn-sm" onClick={addDate} disabled={!draft}>
              <Icon name="plus" size={15} /> Tambah Tanggal
            </button>
          </div>

          {/* start_date keeps the first occurrence so every existing
              envelope-based query and index still works. */}
          <input type="hidden" name="start_date" value={dates[0] ?? start} />
          <input type="hidden" name="end_date"
            value={dates.length > 1 ? dates[dates.length - 1] : ''} />
          {err('start_date')}{err('dates')}
          <p className="sec-note" style={{ marginTop: 10 }}>
            {dates.length} tanggal dipilih.
          </p>
        </div>
      ) : null}
    </>
  );
}
