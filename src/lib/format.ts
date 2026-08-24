import { TIMEZONE } from './constants';
import type { EventRow, PriceType } from './types';

export const DOW = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
export const DOWL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
export const MONL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/**
 * "Today" in Padang, as YYYY-MM-DD.
 * Everything date-related in this app goes through here: the server may run in
 * UTC, but an event on 22 August must never render as 21 August.
 */
export function todayWIB(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/** Parse a YYYY-MM-DD into a *local-noon* Date so no timezone can shift the day. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function dayDiff(iso: string, from = todayWIB()): number {
  return Math.round((parseISODate(iso).getTime() - parseISODate(from).getTime()) / 86400000);
}

/** Offsets (from today) of the coming Saturday and Sunday, Padang time. */
export function weekendOffsets(from = todayWIB()): [number, number] {
  const dow = parseISODate(from).getDay();
  const sat = (6 - dow + 7) % 7;
  return [sat, sat + 1];
}

export function weekendRange(from = todayWIB()): { sat: string; sun: string } {
  const [a, b] = weekendOffsets(from);
  return { sat: addDays(from, a), sun: addDays(from, b) };
}

export function fmtShort(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

export function fmtLong(iso: string): string {
  const d = parseISODate(iso);
  return `${DOWL[d.getDay()]}, ${d.getDate()} ${MONL[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtTime(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5);
}

export function fmtRange(e: Pick<EventRow, 'start_date' | 'end_date'>): string {
  const end = e.end_date ?? e.start_date;
  if (end === e.start_date) return fmtLong(e.start_date);
  const a = parseISODate(e.start_date);
  const b = parseISODate(end);
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  return `${a.getDate()}${sameMonth ? '' : ' ' + MONL[a.getMonth()]} – ${b.getDate()} ${MONL[b.getMonth()]} ${b.getFullYear()}`;
}

export function relLabel(iso: string, today = todayWIB()): string {
  const n = dayDiff(iso, today);
  if (n === 0) return 'Hari ini';
  if (n === 1) return 'Besok';
  if (n < 0) return 'Sedang berlangsung';
  if (n < 7) return DOWL[parseISODate(iso).getDay()];
  return fmtShort(iso);
}

export function fmtPrice(type: PriceType | null | undefined, amount: number | null | undefined): string {
  if (!type || type === 'free') return 'GRATIS';
  if (amount == null) return 'BERBAYAR';
  return 'Rp' + Number(amount).toLocaleString('id-ID');
}

export const isFree = (type: PriceType | null | undefined) => !type || type === 'free';

/** Every date an event spans, inclusive. Multi-day events show on each day. */
export function eventDates(e: Pick<EventRow, 'start_date' | 'end_date'>): string[] {
  const out: string[] = [];
  const end = e.end_date ?? e.start_date;
  let cur = e.start_date;
  let guard = 0;
  while (cur <= end && guard < 400) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

export function isPast(e: Pick<EventRow, 'start_date' | 'end_date'>, today = todayWIB()): boolean {
  return (e.end_date ?? e.start_date) < today;
}

export function monthBounds(month: string): { first: string; last: string } {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1, 12);
  const last = new Date(y, m, 0, 12);
  return { first: toISODate(first), last: toISODate(last) };
}
