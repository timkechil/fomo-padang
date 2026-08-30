import { createClient } from './supabase/server';
import { todayWIB, addDays } from './format';
import type { EventRow, PlaceRow, SubmissionRow, PlaceSubmissionRow, CategoryRow, OrganizerRow } from './types';

/** Admin reads. Every one of these runs as the signed-in staff member, so
 *  RLS is what actually grants access — the UI is only the convenience layer. */

export async function getAdminStats() {
  const supabase = await createClient();
  const today = todayWIB();
  const weekEnd = addDays(today, 7);

  const [active, thisWeek, pending, places, drafts, pendingPlaces] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true })
      .eq('status', 'published').gte('effective_end_date', today),
    supabase.from('events').select('id', { count: 'exact', head: true })
      .eq('status', 'published').gte('effective_end_date', today).lte('start_date', weekEnd),
    supabase.from('event_submissions').select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('places').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('place_submissions').select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ]);

  return {
    activeEvents: active.count ?? 0,
    weekEvents: thisWeek.count ?? 0,
    pendingSubmissions: pending.count ?? 0,
    publishedPlaces: places.count ?? 0,
    draftEvents: drafts.count ?? 0,
    pendingPlaceSubmissions: pendingPlaces.count ?? 0,
  };
}

export async function listSubmissions(status?: string): Promise<SubmissionRow[]> {
  const supabase = await createClient();
  let q = supabase.from('event_submissions').select('*').order('created_at', { ascending: false }).limit(100);
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SubmissionRow[];
}

export async function getSubmission(id: string): Promise<SubmissionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('event_submissions').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as SubmissionRow) ?? null;
}

/** V1.3 §12 — contributor place recommendations queue. */
export async function listPlaceSubmissions(status?: string): Promise<PlaceSubmissionRow[]> {
  const supabase = await createClient();
  let q = supabase.from('place_submissions').select('*')
    .order('created_at', { ascending: false }).limit(100);
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PlaceSubmissionRow[];
}

export async function getPlaceSubmission(id: string): Promise<PlaceSubmissionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('place_submissions').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as PlaceSubmissionRow) ?? null;
}

export type AdminEventFilter =
  | 'all' | 'published' | 'draft' | 'upcoming' | 'past' | 'cancelled' | 'archived' | 'featured';

export async function listAdminEvents(filter: AdminEventFilter = 'upcoming'): Promise<EventRow[]> {
  const supabase = await createClient();
  const today = todayWIB();
  let q = supabase.from('events').select('*').limit(200);

  switch (filter) {
    case 'published': q = q.eq('status', 'published'); break;
    case 'draft': q = q.eq('status', 'draft'); break;
    case 'cancelled': q = q.eq('status', 'cancelled'); break;
    case 'archived': q = q.eq('status', 'archived'); break;
    case 'featured': q = q.eq('featured', true); break;
    case 'past': q = q.lt('effective_end_date', today); break;
    case 'upcoming': q = q.gte('effective_end_date', today).neq('status', 'archived'); break;
    default: break;
  }

  const { data, error } = await q.order('start_date', { ascending: filter !== 'past' });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function getAdminEvent(id: string) {
  const supabase = await createClient();
  const [{ data: event, error }, { data: cats }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).maybeSingle(),
    supabase.from('event_categories').select('category_id, is_primary').eq('event_id', id),
  ]);
  if (error) throw error;
  if (!event) return null;
  return {
    event: event as EventRow,
    categoryIds: (cats ?? [])
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
      .map((c) => (c as { category_id: string }).category_id),
  };
}

export async function listAdminPlaces(): Promise<PlaceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('places').select('*').order('name').limit(200);
  if (error) throw error;
  return (data ?? []) as PlaceRow[];
}

export async function getAdminPlace(id: string): Promise<PlaceRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('places').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as PlaceRow) ?? null;
}

export async function getAdminReference(): Promise<{ categories: CategoryRow[]; organizers: OrganizerRow[] }> {
  const supabase = await createClient();
  const [{ data: categories }, { data: organizers }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('organizers').select('*').order('name'),
  ]);
  return {
    categories: (categories ?? []) as CategoryRow[],
    organizers: (organizers ?? []) as OrganizerRow[],
  };
}

export async function listActivityLog(limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('admin_activity_logs')
    .select('id, action, entity_type, entity_id, metadata, created_at, admin:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as {
    id: string; action: string; entity_type: string; entity_id: string | null;
    metadata: Record<string, unknown>; created_at: string;
    admin: { full_name: string | null } | null;
  }[];
}

/** V1.2 §7 — how many events use each category, so the UI can warn before
 *  deactivating one and can justify never offering a hard delete. */
export async function countCategoryUsage() {
  const supabase = await createClient();
  const { data } = await supabase.from('event_categories').select('category_id');
  const counts = new Map<string, number>();
  (data ?? []).forEach((r) => {
    const id = (r as { category_id: string }).category_id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });
  return counts;
}

export async function countOrganizerEvents() {
  const supabase = await createClient();
  const { data } = await supabase.from('events').select('organizer_id');
  const counts = new Map<string, number>();
  (data ?? []).forEach((r) => {
    const id = (r as { organizer_id: string | null }).organizer_id;
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  });
  return counts;
}
