'use client';

/** My Plan stays on the device: no account required (spec §41).
 *  The shape mirrors plan_items so a cloud plan can reuse it verbatim. */

export interface PlanItem {
  id: string;            // event or place id
  kind: 'event' | 'place';
  slug: string;
  title: string;
  venue: string | null;
  district: string | null;
  date: string;          // YYYY-MM-DD
  time: string | null;   // HH:MM
  note: string;
}

const KEY = 'fomo.plan.v2';
export const PLAN_EVENT = 'fomo:plan-changed';

function read(): PlanItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlanItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: PlanItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* private mode or blocked storage: the plan just lives for this session */
  }
  window.dispatchEvent(new CustomEvent(PLAN_EVENT));
}

export const getPlan = read;
export const isInPlan = (id: string) => read().some((p) => p.id === id);

export function togglePlan(item: PlanItem): 'added' | 'removed' {
  const items = read();
  const i = items.findIndex((p) => p.id === item.id);
  if (i >= 0) {
    items.splice(i, 1);
    write(items);
    return 'removed';
  }
  items.push(item);
  write(items);
  return 'added';
}

export function removeFromPlan(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function updateNote(id: string, note: string) {
  const items = read();
  const item = items.find((p) => p.id === id);
  if (item) {
    item.note = note.slice(0, 240);
    write(items);
  }
}

export function movePlanItem(id: string, dir: -1 | 1) {
  const items = read();
  const item = items.find((p) => p.id === id);
  if (!item) return;
  const sameDay = items.filter((p) => p.date === item.date);
  const i = sameDay.indexOf(item);
  const j = i + dir;
  if (j < 0 || j >= sameDay.length) return;
  const other = sameDay[j];
  const ia = items.indexOf(item);
  const ib = items.indexOf(other);
  items[ia] = other;
  items[ib] = item;
  write(items);
}

export function clearPlan() {
  write([]);
}

export function groupPlan(items: PlanItem[]): Record<string, PlanItem[]> {
  return items.reduce<Record<string, PlanItem[]>>((acc, p) => {
    (acc[p.date] ??= []).push(p);
    return acc;
  }, {});
}
