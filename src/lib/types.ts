/* Hand-maintained types for the FOMO Padang schema.
   Regenerate with:  supabase gen types typescript --local > src/lib/database.types.ts
   and swap the import if you prefer generated types. */

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'archived';
export type PlaceStatus = 'draft' | 'published' | 'temporarily_closed' | 'archived';
export type SubmissionStatus = 'pending' | 'needs_revision' | 'approved' | 'rejected';
export type PriceType = 'free' | 'paid';
export type StaffRole = 'admin' | 'editor';

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  type: 'event' | 'place';
  color: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
}

export interface OrganizerRow {
  id: string;
  name: string;
  slug: string;
  instagram_url: string | null;
  website_url: string | null;
  contact_url: string | null;
  logo_url: string | null;
}

export interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  organizer_id: string | null;
  start_date: string;
  end_date: string | null;
  /** generated column: coalesce(end_date, start_date) */
  effective_end_date: string;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  price_type: PriceType;
  price_amount: number | null;
  ticket_url: string | null;
  source_url: string | null;
  instagram_url: string | null;
  poster_url: string | null;
  registration_required: boolean;
  audience: string | null;
  status: EventStatus;
  featured: boolean;
  submitted_from: string | null;
  /** V1.2 §16 — public credit copied from the approved submission.
   *  Denormalised because `event_submissions` is staff-only under RLS. */
  contributor_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tips: string | null;
  category_id: string | null;
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: OpeningHours;
  admission_type: PriceType;
  admission_price: number | null;
  instagram_url: string | null;
  website_url: string | null;
  cover_image_url: string | null;
  /** V1.2 §14 — attribution for the cover photo. URL or free text. */
  source_photo: string | null;
  status: PlaceStatus;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

/** Kept as jsonb so it can grow into per-day hours without a migration. */
export interface OpeningHours {
  label?: string;
  note?: string;
  [day: string]: string | undefined;
}

export interface SubmissionRow {
  id: string;
  submission_code: string;
  event_name: string;
  source_url: string;
  organizer_name: string | null;
  category_id: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  price_type: PriceType | null;
  price_amount: number | null;
  ticket_url: string | null;
  description: string | null;
  instagram_url: string | null;
  poster_url: string | null;
  registration_required: boolean | null;
  audience: string | null;
  contributor_name: string | null;
  contributor_contact: string | null;
  status: SubmissionStatus;
  admin_notes: string | null;
  reject_reason: string | null;
  approved_event_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** V1.3 §11 — contributor place recommendations. */
export interface PlaceSubmissionRow {
  id: string;
  submission_code: string;
  place_name: string;
  category_id: string | null;
  source_url: string;
  description: string | null;
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours_label: string | null;
  admission_type: PriceType | null;
  admission_price: number | null;
  instagram_url: string | null;
  website_url: string | null;
  source_photo: string | null;
  contributor_name: string | null;
  contributor_contact: string | null;
  status: SubmissionStatus;
  admin_notes: string | null;
  reject_reason: string | null;
  approved_place_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  full_name: string | null;
  role: StaffRole;
  created_at: string;
}

/* ---------------------------------------------------------------- *
 * View models used by the UI. These keep the component props close  *
 * to what the old prototype used, so the markup did not change.     *
 * ---------------------------------------------------------------- */

export interface EventCategoryLite {
  id: string;
  name: string;
  slug: string;
  color: string;
  is_primary: boolean;
}

export interface EventView extends EventRow {
  organizer: Pick<OrganizerRow, 'id' | 'name' | 'slug' | 'instagram_url' | 'website_url'> | null;
  categories: EventCategoryLite[];
}

export interface PlaceView extends PlaceRow {
  category: Pick<CategoryRow, 'id' | 'name' | 'color'> | null;
}

export interface MapPin {
  kind: 'event' | 'place';
  id: string;
  slug: string;
  title: string;
  latitude: number;
  longitude: number;
  start_date: string | null;
  start_time: string | null;
  venue_name: string | null;
  poster_url: string | null;
  price_type: PriceType | null;
  price_amount: number | null;
  category_name: string | null;
  category_color: string;
}

export interface SearchHit {
  kind: 'event' | 'place';
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  start_date: string | null;
  start_time: string | null;
  district: string | null;
  price_type: PriceType | null;
  price_amount: number | null;
  poster_url: string | null;
  category_name: string | null;
  category_color: string | null;
}

export interface PublicFilters {
  q?: string;
  date?: string;      // 'semua' | 'hari-ini' | 'besok' | 'weekend' | 'minggu-ini' | 'tgl:YYYY-MM-DD'
  cat?: string;       // category slug
  price?: 'all' | 'free' | 'paid';
  area?: string;      // district
  audience?: string;
}
