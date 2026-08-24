import { createClient } from './supabase/server';
import {
  todayWIB, addDays, weekendRange, monthBounds,
} from './format';
export { primaryCategory } from './event-view';

import type {
  CategoryRow, EventView, MapPin, OrganizerRow, PlaceView, PublicFilters, SearchHit,
} from './types';

/* Selection shared by every public event query. */
const EVENT_SELECT = `
  id, slug, title, description, organizer_id,
  start_date, end_date, effective_end_date, start_time, end_time,
  venue_name, address, district, latitude, longitude,
  price_type, price_amount, ticket_url, source_url, instagram_url, poster_url,
  registration_required, audience, status, featured, submitted_from,
  published_at, created_at, updated_at,
  organizer:organizers ( id, name, slug, instagram_url, website_url ),
  event_categories ( is_primary, categories ( id, name, slug, color ) )
`;

type RawEvent = Record<string, unknown> & {
  organizer: OrganizerRow | OrganizerRow[] | null;
  event_categories: { is_primary: boolean; categories: CategoryRow | null }[] | null;
};

function shapeEvent(row: RawEvent): EventView {
  const organizer = Array.isArray(row.organizer) ? (row.organizer[0] ?? null) : row.organizer;
  const categories = (row.event_categories ?? [])
    .filter((ec) => ec.categories)
    .map((ec) => ({
      id: ec.categories!.id,
      name: ec.categories!.name,
      slug: ec.categories!.slug,
      color: ec.categories!.color,
      is_primary: ec.is_primary,
    }))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));

  const { event_categories: _drop, ...rest } = row;
  return { ...(rest as unknown as EventView), organizer, categories };
}

/* ------------------------------------------------------------------ *
 * Reference data
 * ------------------------------------------------------------------ */

export async function getCategories(type: 'event' | 'place' | 'all' = 'event'): Promise<CategoryRow[]> {
  const supabase = await createClient();
  let q = supabase.from('categories').select('*').eq('active', true).order('sort_order');
  if (type !== 'all') q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

export async function getOrganizers(): Promise<OrganizerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('organizers').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as OrganizerRow[];
}

/* ------------------------------------------------------------------ *
 * Event queries. Date windows are always Padang-local (see todayWIB).
 * `start_date <= windowEnd AND effective_end_date >= windowStart`
 * is the overlap test that makes multi-day events show on every day.
 * ------------------------------------------------------------------ */

interface RangeOpts { from?: string; to?: string; limit?: number; }

async function eventIdsForCategory(slug: string): Promise<string[]> {
  const supabase = await createClient();
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', slug).maybeSingle();
  if (!cat) return [];
  const { data } = await supabase
    .from('event_categories')
    .select('event_id')
    .eq('category_id', (cat as { id: string }).id);
  return (data ?? []).map((r) => (r as { event_id: string }).event_id);
}

export async function getEventsInRange(opts: RangeOpts = {}): Promise<EventView[]> {
  const supabase = await createClient();
  const from = opts.from ?? todayWIB();

  let q = supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'published')
    .gte('effective_end_date', from)
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true });

  if (opts.to) q = q.lte('start_date', opts.to);
  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as RawEvent[]).map(shapeEvent);
}

export async function getTodayEvents(limit = 12): Promise<EventView[]> {
  const today = todayWIB();
  return getEventsInRange({ from: today, to: today, limit });
}

export async function getWeekendEvents(limit = 8): Promise<EventView[]> {
  const { sat, sun } = weekendRange();
  return getEventsInRange({ from: sat, to: sun, limit });
}

export async function getFreeEvents(limit = 8): Promise<EventView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'published')
    .eq('price_type', 'free')
    .gte('effective_end_date', todayWIB())
    .order('start_date')
    .limit(limit);
  if (error) throw error;
  return (data as unknown as RawEvent[]).map(shapeEvent);
}

export async function getFeaturedEvents(limit = 8): Promise<EventView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'published')
    .eq('featured', true)
    .gte('effective_end_date', todayWIB())
    .order('start_date')
    .limit(limit);
  if (error) throw error;
  return (data as unknown as RawEvent[]).map(shapeEvent);
}

export async function getNearbyEvents(district: string, limit = 4): Promise<EventView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'published')
    .eq('district', district)
    .gte('effective_end_date', todayWIB())
    .order('start_date')
    .limit(limit);
  if (error) throw error;
  return (data as unknown as RawEvent[]).map(shapeEvent);
}

/** Resolves the Explore/Search filter state into one Supabase query. */
export async function getFilteredEvents(f: PublicFilters, limit = 60): Promise<EventView[]> {
  const supabase = await createClient();
  const today = todayWIB();

  let windowStart: string | null = null;
  let windowEnd: string | null = null;

  switch (f.date) {
    case 'hari-ini': windowStart = today; windowEnd = today; break;
    case 'besok': windowStart = addDays(today, 1); windowEnd = addDays(today, 1); break;
    case 'weekend': {
      const { sat, sun } = weekendRange();
      windowStart = sat; windowEnd = sun; break;
    }
    case 'minggu-ini': windowStart = today; windowEnd = addDays(today, 7); break;
    default:
      if (f.date?.startsWith('tgl:')) {
        const d = f.date.slice(4);
        windowStart = d; windowEnd = d;
      }
  }

  let q = supabase.from('events').select(EVENT_SELECT).eq('status', 'published');

  // Past events drop out of discovery but stay reachable by URL and search.
  q = q.gte('effective_end_date', windowStart ?? today);
  if (windowEnd) q = q.lte('start_date', windowEnd);

  if (f.price === 'free') q = q.eq('price_type', 'free');
  if (f.price === 'paid') q = q.eq('price_type', 'paid');
  if (f.area && f.area !== 'all') q = q.eq('district', f.area);
  if (f.audience && f.audience !== 'all') q = q.eq('audience', f.audience);
  if (f.q) {
    const term = f.q.replace(/[%,()]/g, ' ').trim();
    if (term) {
      q = q.or(`title.ilike.%${term}%,venue_name.ilike.%${term}%,district.ilike.%${term}%`);
    }
  }
  if (f.cat && f.cat !== 'semua') {
    const ids = await eventIdsForCategory(f.cat);
    if (ids.length === 0) return [];
    q = q.in('id', ids);
  }

  const { data, error } = await q
    .order('start_date')
    .order('start_time', { nullsFirst: true })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as RawEvent[]).map(shapeEvent);
}

export async function getEventBySlug(slug: string): Promise<EventView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('slug', slug)
    .in('status', ['published', 'cancelled'])   // cancelled stays visible, clearly labelled
    .maybeSingle();
  if (error) throw error;
  return data ? shapeEvent(data as unknown as RawEvent) : null;
}

export async function getRelatedEvents(e: EventView, limit = 3): Promise<EventView[]> {
  const supabase = await createClient();
  const catIds = e.categories.map((c) => c.id);
  let ids: string[] = [];
  if (catIds.length) {
    const { data } = await supabase
      .from('event_categories')
      .select('event_id')
      .in('category_id', catIds)
      .limit(60);
    ids = (data ?? []).map((r) => (r as { event_id: string }).event_id).filter((id) => id !== e.id);
  }

  let q = supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'published')
    .neq('id', e.id)
    .gte('effective_end_date', todayWIB())
    .order('start_date')
    .limit(limit);

  if (ids.length) q = q.in('id', ids);
  else if (e.district) q = q.eq('district', e.district);

  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as RawEvent[]).map(shapeEvent);
}

/* ------------------------------------------------------------------ *
 * Calendar — one month at a time, never the whole table
 * ------------------------------------------------------------------ */

export async function getMonthEvents(month: string, catSlug?: string): Promise<EventView[]> {
  const supabase = await createClient();
  const { first, last } = monthBounds(month);

  let q = supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'published')
    .lte('start_date', last)
    .gte('effective_end_date', first)
    .order('start_date')
    .order('start_time', { nullsFirst: true });

  if (catSlug && catSlug !== 'semua') {
    const ids = await eventIdsForCategory(catSlug);
    if (!ids.length) return [];
    q = q.in('id', ids);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as RawEvent[]).map(shapeEvent);
}

/* ------------------------------------------------------------------ *
 * Places
 * ------------------------------------------------------------------ */

const PLACE_SELECT = `
  id, slug, name, description, tips, category_id, address, district,
  latitude, longitude, opening_hours, admission_type, admission_price,
  instagram_url, website_url, cover_image_url, status, featured,
  created_at, updated_at,
  category:categories ( id, name, color )
`;

export async function getPlaces(limit = 40, q?: string): Promise<PlaceView[]> {
  const supabase = await createClient();
  let query = supabase
    .from('places')
    .select(PLACE_SELECT)
    .in('status', ['published', 'temporarily_closed'])
    .order('featured', { ascending: false })
    .order('name')
    .limit(limit);

  if (q) {
    const term = q.replace(/[%,()]/g, ' ').trim();
    if (term) query = query.or(`name.ilike.%${term}%,district.ilike.%${term}%,address.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as PlaceView[];
}

export async function getPlaceBySlug(slug: string): Promise<PlaceView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('places')
    .select(PLACE_SELECT)
    .eq('slug', slug)
    .in('status', ['published', 'temporarily_closed'])
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PlaceView) ?? null;
}

/* ------------------------------------------------------------------ *
 * Map — only the columns a marker needs
 * ------------------------------------------------------------------ */

export async function getMapPins(f: PublicFilters & { includePlaces?: boolean } = {}): Promise<MapPin[]> {
  const supabase = await createClient();
  const today = todayWIB();

  let windowStart = today;
  let windowEnd: string | null = null;
  if (f.date === 'hari-ini') windowEnd = today;
  else if (f.date === 'besok') { windowStart = addDays(today, 1); windowEnd = windowStart; }
  else if (f.date === 'weekend') { const w = weekendRange(); windowStart = w.sat; windowEnd = w.sun; }
  else if (f.date === 'minggu-ini') windowEnd = addDays(today, 7);
  else if (f.date?.startsWith('tgl:')) { windowStart = f.date.slice(4); windowEnd = windowStart; }

  let q = supabase
    .from('events')
    .select(`id, slug, title, latitude, longitude, start_date, start_time, venue_name,
             poster_url, price_type, price_amount,
             event_categories ( is_primary, categories ( name, color ) )`)
    .eq('status', 'published')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gte('effective_end_date', windowStart)
    .limit(300);

  if (windowEnd) q = q.lte('start_date', windowEnd);
  if (f.price === 'free') q = q.eq('price_type', 'free');
  if (f.price === 'paid') q = q.eq('price_type', 'paid');
  if (f.cat && f.cat !== 'semua' && f.cat !== 'spot') {
    const ids = await eventIdsForCategory(f.cat);
    if (!ids.length) return placePins(f);
    q = q.in('id', ids);
  }

  const { data, error } = await q;
  if (error) throw error;

  const eventPins: MapPin[] = (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string; slug: string; title: string; latitude: number; longitude: number;
      start_date: string; start_time: string | null; venue_name: string | null;
      poster_url: string | null; price_type: 'free' | 'paid'; price_amount: number | null;
      event_categories: { is_primary: boolean; categories: { name: string; color: string } | null }[] | null;
    };
    const cat = (r.event_categories ?? []).find((c) => c.is_primary)?.categories
      ?? (r.event_categories ?? [])[0]?.categories
      ?? null;
    return {
      kind: 'event', id: r.id, slug: r.slug, title: r.title,
      latitude: r.latitude, longitude: r.longitude,
      start_date: r.start_date, start_time: r.start_time, venue_name: r.venue_name,
      poster_url: r.poster_url, price_type: r.price_type, price_amount: r.price_amount,
      category_name: cat?.name ?? null, category_color: cat?.color ?? '#FD7318',
    };
  });

  const places = f.cat && f.cat !== 'semua' && f.cat !== 'spot' ? [] : await placePins(f);
  return [...eventPins, ...places];
}

async function placePins(f: PublicFilters & { includePlaces?: boolean }): Promise<MapPin[]> {
  if (f.includePlaces === false) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('places')
    .select('id, slug, name, latitude, longitude, address, cover_image_url, admission_type, admission_price')
    .in('status', ['published', 'temporarily_closed'])
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(120);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string; slug: string; name: string; latitude: number; longitude: number;
      address: string | null; cover_image_url: string | null;
      admission_type: 'free' | 'paid'; admission_price: number | null;
    };
    return {
      kind: 'place', id: r.id, slug: r.slug, title: r.name,
      latitude: r.latitude, longitude: r.longitude,
      start_date: null, start_time: null, venue_name: r.address,
      poster_url: r.cover_image_url,
      price_type: r.admission_type, price_amount: r.admission_price,
      category_name: 'Local Spot', category_color: '#161616',
    };
  });
}

/* ------------------------------------------------------------------ *
 * Search — one RPC, events and places, published only
 * ------------------------------------------------------------------ */

export async function searchPublic(q: string): Promise<SearchHit[]> {
  const term = q.trim();
  if (!term) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('search_public', { q: term, max_results: 40 });
  if (error) throw error;
  return (data ?? []) as SearchHit[];
}

/* ------------------------------------------------------------------ *
 * Shared plans
 * ------------------------------------------------------------------ */

export async function getSharedPlan(shareId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_shared_plan', { p_share_id: shareId });
  if (error) throw error;
  return data as null | {
    share_id: string; title: string | null; created_at: string;
    items: { kind: 'event' | 'place'; slug: string; title: string; venue: string | null;
             district: string | null; day_date: string | null; time_label: string | null;
             note: string | null; position: number }[];
  };
}
