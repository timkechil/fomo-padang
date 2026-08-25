/**
 * Hari Libur Nasional Indonesia — V1.2 §10.
 *
 * A separate calendar layer, deliberately NOT rows in `events`: holidays are
 * not FOMO events, must not appear in discovery sections, search, the map or
 * My Plan, and must never be moderated.
 *
 * Data is a maintained per-year table rather than an API call. That keeps the
 * calendar working offline and adds no runtime dependency or cost, at the price
 * of needing one edit per year — see `addYear` below.
 *
 * Dates follow the Indonesian government's annual SKB 3 Menteri (hari libur
 * nasional + cuti bersama). Only *hari libur nasional* are listed here; cuti
 * bersama is marked separately so the calendar can distinguish them.
 *
 * Islamic-calendar holidays (Idul Fitri, Idul Adha, Tahun Baru Hijriah, Maulid,
 * Isra Mikraj) are set by government decree each year and shift by roughly 11
 * days annually. Never compute them — only copy them from the published SKB.
 */

export interface Holiday {
  /** YYYY-MM-DD, Padang local date. */
  date: string;
  name: string;
  /** true = cuti bersama (collective leave) rather than a national holiday. */
  cutiBersama?: boolean;
}

/**
 * Years present in this dataset. When a new SKB is published, add the year
 * here and the calendar picks it up with no other code change.
 */
const HOLIDAYS: Record<number, Holiday[]> = {
  2026: [
    { date: '2026-01-01', name: 'Tahun Baru Masehi' },
    { date: '2026-01-17', name: 'Isra Mikraj Nabi Muhammad SAW' },
    { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili' },
    { date: '2026-03-19', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)' },
    { date: '2026-03-20', name: 'Idul Fitri 1447 Hijriah' },
    { date: '2026-03-21', name: 'Idul Fitri 1447 Hijriah' },
    { date: '2026-04-03', name: 'Wafat Isa Almasih' },
    { date: '2026-05-01', name: 'Hari Buruh Internasional' },
    { date: '2026-05-14', name: 'Kenaikan Isa Almasih' },
    { date: '2026-05-27', name: 'Idul Adha 1447 Hijriah' },
    { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE' },
    { date: '2026-06-01', name: 'Hari Lahir Pancasila' },
    { date: '2026-06-16', name: 'Tahun Baru Islam 1448 Hijriah' },
    { date: '2026-08-17', name: 'Hari Kemerdekaan Republik Indonesia' },
    { date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW' },
    { date: '2026-12-25', name: 'Hari Raya Natal' },
  ],
  2027: [
    { date: '2027-01-01', name: 'Tahun Baru Masehi' },
    { date: '2027-02-06', name: 'Tahun Baru Imlek 2578 Kongzili' },
    { date: '2027-03-09', name: 'Idul Fitri 1448 Hijriah' },
    { date: '2027-03-10', name: 'Idul Fitri 1448 Hijriah' },
    { date: '2027-03-26', name: 'Wafat Isa Almasih' },
    { date: '2027-04-08', name: 'Hari Suci Nyepi (Tahun Baru Saka 1949)' },
    { date: '2027-05-01', name: 'Hari Buruh Internasional' },
    { date: '2027-05-06', name: 'Kenaikan Isa Almasih' },
    { date: '2027-05-16', name: 'Idul Adha 1448 Hijriah' },
    { date: '2027-05-20', name: 'Hari Raya Waisak 2571 BE' },
    { date: '2027-06-01', name: 'Hari Lahir Pancasila' },
    { date: '2027-06-06', name: 'Tahun Baru Islam 1449 Hijriah' },
    { date: '2027-08-15', name: 'Maulid Nabi Muhammad SAW' },
    { date: '2027-08-17', name: 'Hari Kemerdekaan Republik Indonesia' },
    { date: '2027-12-25', name: 'Hari Raya Natal' },
  ],
};

/** Years this dataset covers, for the "data belum tersedia" notice. */
export const COVERED_YEARS = Object.keys(HOLIDAYS).map(Number).sort();

export function hasHolidayData(year: number): boolean {
  return year in HOLIDAYS;
}

/** All holidays in a given year. Empty array for years not yet added. */
export function holidaysForYear(year: number): Holiday[] {
  return HOLIDAYS[year] ?? [];
}

/**
 * Holidays intersecting a `YYYY-MM` month, keyed by date for O(1) lookup
 * from a calendar cell.
 */
export function holidayMapForMonth(month: string): Record<string, Holiday> {
  const year = Number(month.slice(0, 4));
  const out: Record<string, Holiday> = {};
  for (const h of holidaysForYear(year)) {
    if (h.date.startsWith(month)) out[h.date] = h;
  }
  return out;
}

/** The holiday on a specific date, if any. */
export function holidayOn(iso: string): Holiday | null {
  const year = Number(iso.slice(0, 4));
  return holidaysForYear(year).find((h) => h.date === iso) ?? null;
}
