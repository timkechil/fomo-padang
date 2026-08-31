import { MONL, addDays, fmtLong, fmtShort, parseISODate, todayWIB } from './format';
import type { EventRow, ScheduleType } from './types';

/**
 * One place that knows how the three schedule types behave.
 *
 * Every page previously assumed `start_date <= day <= end_date`, which is
 * exactly the bug that made a 10-session workshop look like a 30-day event.
 * Pages now call these helpers instead of re-deriving the rule.
 *
 *   single   — one day: start_date
 *   range    — every day from start_date to end_date, inclusive
 *   multiple — only the days listed in `dates` (from the event_dates table)
 *
 * All dates are plain calendar dates in Padang local time. Nothing here builds
 * a Date from a raw ISO string without the noon-anchored parse in format.ts,
 * so no timezone can shift 2026-08-01 to 2026-07-31.
 */

export interface Schedulable {
  start_date: string;
  end_date?: string | null;
  schedule_type?: ScheduleType | null;
  /** Occurrence dates, ascending. Only meaningful for schedule_type 'multiple'. */
  dates?: string[] | null;
}

export function scheduleTypeOf(e: Schedulable): ScheduleType {
  if (e.schedule_type === 'multiple' && (e.dates?.length ?? 0) > 0) return 'multiple';
  if (e.schedule_type === 'range') return 'range';
  if (e.schedule_type === 'single') return 'single';
  // Legacy rows written before schedule_type existed.
  return e.end_date && e.end_date !== e.start_date ? 'range' : 'single';
}

/** Every day this event actually happens, ascending. */
export function occurrenceDates(e: Schedulable): string[] {
  const type = scheduleTypeOf(e);

  if (type === 'multiple') {
    return [...new Set(e.dates ?? [])].sort();
  }

  if (type === 'range' && e.end_date) {
    const out: string[] = [];
    let cur = e.start_date;
    let guard = 0;
    while (cur <= e.end_date && guard < 400) {
      out.push(cur);
      cur = addDays(cur, 1);
      guard++;
    }
    return out;
  }

  return [e.start_date];
}

/** Does the event happen on this exact day? */
export function occursOn(e: Schedulable, iso: string): boolean {
  const type = scheduleTypeOf(e);

  if (type === 'multiple') return (e.dates ?? []).includes(iso);
  if (type === 'range' && e.end_date) return iso >= e.start_date && iso <= e.end_date;
  return iso === e.start_date;
}

/** Does it happen on any day in [from, to] inclusive? `to` omitted = open ended. */
export function occursInRange(e: Schedulable, from: string, to?: string | null): boolean {
  const type = scheduleTypeOf(e);

  if (type === 'multiple') {
    return (e.dates ?? []).some((d) => d >= from && (!to || d <= to));
  }

  const last = e.end_date ?? e.start_date;
  if (last < from) return false;
  return !to || e.start_date <= to;
}

/** First occurrence on or after `from`; null once they have all passed. */
export function nextOccurrence(e: Schedulable, from: string = todayWIB()): string | null {
  const type = scheduleTypeOf(e);

  if (type === 'multiple') {
    return (e.dates ?? []).find((d) => d >= from) ?? null;
  }

  const last = e.end_date ?? e.start_date;
  if (last < from) return null;
  return e.start_date >= from ? e.start_date : from;   // mid-range: today counts
}

export function lastOccurrence(e: Schedulable): string {
  const type = scheduleTypeOf(e);
  if (type === 'multiple') {
    const d = e.dates ?? [];
    return d.length ? d[d.length - 1] : e.start_date;
  }
  return e.end_date ?? e.start_date;
}

/** The date a card or list should lead with: the next one, else the last. */
export function displayDate(e: Schedulable, from: string = todayWIB()): string {
  return nextOccurrence(e, from) ?? lastOccurrence(e);
}

/** Finished only after every occurrence has passed. */
export function isFinished(e: Schedulable, today: string = todayWIB()): boolean {
  return lastOccurrence(e) < today;
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

/**
 * Full human schedule, e.g.
 *   single   "Senin, 31 Agustus 2026"
 *   range    "28 – 30 Agustus 2026"
 *   multiple "1, 2, 8, 9, 15, 16, 22, 23, 29 & 30 Agustus 2026"
 *            "30 Agustus, 6 & 13 September 2026" when months differ
 */
export function formatSchedule(e: Schedulable): string {
  const type = scheduleTypeOf(e);

  if (type === 'single') return fmtLong(e.start_date);

  if (type === 'range' && e.end_date) {
    const a = parseISODate(e.start_date);
    const b = parseISODate(e.end_date);
    const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    return sameMonth
      ? `${a.getDate()} – ${b.getDate()} ${MONL[b.getMonth()]} ${b.getFullYear()}`
      : `${a.getDate()} ${MONL[a.getMonth()]} – ${b.getDate()} ${MONL[b.getMonth()]} ${b.getFullYear()}`;
  }

  const dates = occurrenceDates(e);
  if (!dates.length) return fmtLong(e.start_date);
  if (dates.length === 1) return fmtLong(dates[0]);

  // Group consecutive-by-month so the month name is written once per month.
  const groups: { month: number; year: number; days: number[] }[] = [];
  for (const iso of dates) {
    const d = parseISODate(iso);
    const last = groups[groups.length - 1];
    if (last && last.month === d.getMonth() && last.year === d.getFullYear()) {
      last.days.push(d.getDate());
    } else {
      groups.push({ month: d.getMonth(), year: d.getFullYear(), days: [d.getDate()] });
    }
  }

  const years = new Set(groups.map((g) => g.year));
  const parts = groups.map((g, i) => {
    const isLastGroup = i === groups.length - 1;
    const days = joinDays(g.days, isLastGroup);
    const year = years.size > 1 || isLastGroup ? ` ${g.year}` : '';
    return `${days} ${MONL[g.month]}${year}`;
  });

  return parts.join(', ');
}

/** "1, 2, 8, 9 & 15" — the ampersand only on the final group. */
function joinDays(days: number[], useAmpersand: boolean): string {
  if (days.length === 1) return String(days[0]);
  if (!useAmpersand) return days.join(', ');
  return `${days.slice(0, -1).join(', ')} & ${days[days.length - 1]}`;
}

/**
 * Compact form for a card, where space is tight.
 *   ≤ 4 dates   "1, 2, 8 & 9 Agu"
 *   more        "10 tanggal · Agustus"
 */
export function formatScheduleCompact(e: Schedulable): string {
  const type = scheduleTypeOf(e);
  if (type !== 'multiple') return fmtShort(e.start_date);

  const dates = occurrenceDates(e);
  if (dates.length <= 4) {
    const sameMonth = new Set(dates.map((d) => d.slice(0, 7))).size === 1;
    if (sameMonth) {
      const days = dates.map((d) => parseISODate(d).getDate());
      return `${joinDays(days, true)} ${fmtShort(dates[0]).split(' ')[1]}`;
    }
    return dates.map((d) => fmtShort(d)).join(', ');
  }

  const months = [...new Set(dates.map((d) => parseISODate(d).getMonth()))];
  const monthLabel = months.length === 1
    ? MONL[months[0]]
    : months.map((m) => MONL[m]).join(' & ');
  return `${dates.length} tanggal · ${monthLabel}`;
}

/** Badge text for the "next session" of a multiple-date event. */
export function nextOccurrenceLabel(e: Schedulable, from: string = todayWIB()): string | null {
  if (scheduleTypeOf(e) !== 'multiple') return null;
  const next = nextOccurrence(e, from);
  return next ? `Berikutnya: ${fmtShort(next)}` : null;
}

/** Occurrences intersecting a YYYY-MM month — used by the calendar grid. */
export function occurrencesInMonth(e: Schedulable, month: string): string[] {
  return occurrenceDates(e).filter((d) => d.startsWith(month));
}

/** Occurrences a plan should offer, upcoming first. */
export function selectableOccurrences(e: Schedulable, from: string = todayWIB()): string[] {
  const upcoming = occurrenceDates(e).filter((d) => d >= from);
  return upcoming.length ? upcoming : occurrenceDates(e);
}
