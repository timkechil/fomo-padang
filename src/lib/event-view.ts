import type { EventView } from './types';

/** Pure helpers safe to import from client components. */
export function primaryCategory(e: EventView) {
  return e.categories[0] ?? null;
}

export function categoryColor(e: EventView) {
  return primaryCategory(e)?.color ?? '#FD7318';
}
