import { z } from 'zod';
import { DISTRICTS, AUDIENCES } from './constants';

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

const httpUrl = z
  .string()
  .trim()
  .max(600, 'Link terlalu panjang')
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Link harus diawali http:// atau https://');

const optionalUrl = z
  .union([httpUrl, z.literal('')])
  .optional()
  .transform((v) => (v ? v : null));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length ? v : null));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');
const optionalDate = z
  .union([isoDate, z.literal('')])
  .optional()
  .transform((v) => (v ? v : null));

const optionalTime = z
  .union([z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format jam harus HH:MM'), z.literal('')])
  .optional()
  .transform((v) => (v ? v.slice(0, 5) : null));

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);

const optionalLat = z
  .union([latitude, z.literal('')])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : Number(v)));
const optionalLng = z
  .union([longitude, z.literal('')])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : Number(v)));

const optionalPrice = z
  .union([z.coerce.number().min(0, 'Harga tidak boleh negatif').max(1_000_000_000), z.literal('')])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : Number(v)));

const optionalUuid = z
  .union([z.string().uuid(), z.literal('')])
  .optional()
  .transform((v) => (v ? v : null));

const priceType = z.enum(['free', 'paid']);
const districtEnum = z
  .union([z.enum(DISTRICTS as unknown as [string, ...string[]]), z.literal('')])
  .optional()
  .transform((v) => (v ? v : null));
const audienceEnum = z
  .union([z.enum(AUDIENCES as unknown as [string, ...string[]]), z.literal('')])
  .optional()
  .transform((v) => (v ? v : null));

const checkbox = z
  .union([z.boolean(), z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')])
  .optional()
  .transform((v) => v === true || v === 'on' || v === 'true');

/* ------------------------------------------------------------------ *
 * Public community submission
 *
 * Note what is NOT here: status, submission_code, reviewed_by, featured,
 * published_at, created_by. Those are server- and database-controlled.
 * Anything the browser sends beyond this schema is dropped.
 * ------------------------------------------------------------------ */

export const submissionSchema = z
  .object({
    event_name: z.string().trim().min(3, 'Nama event minimal 3 karakter').max(180),
    source_url: httpUrl,

    organizer_name: optionalText(160),
    category_id: optionalUuid,

    start_date: optionalDate,
    end_date: optionalDate,
    start_time: optionalTime,
    end_time: optionalTime,

    venue_name: optionalText(180),
    address: optionalText(300),
    district: districtEnum,
    latitude: optionalLat,
    longitude: optionalLng,

    price_type: z
      .union([priceType, z.literal('')])
      .optional()
      .transform((v) => (v ? v : null)),
    price_amount: optionalPrice,
    ticket_url: optionalUrl,

    description: optionalText(4000),
    instagram_url: optionalUrl,

    registration_required: z
      .union([z.literal('ya'), z.literal('tidak'), z.literal('')])
      .optional()
      .transform((v) => (v === 'ya' ? true : v === 'tidak' ? false : null)),
    audience: audienceEnum,

    contributor_name: optionalText(120),
    contributor_contact: optionalText(160),

    /** Honeypot. Real people never see this field, bots fill everything. */
    website: z.string().max(0, 'spam').optional(),
    turnstile_token: z.string().optional(),
  })
  .refine((v) => !v.end_date || !v.start_date || v.end_date >= v.start_date, {
    message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
    path: ['end_date'],
  })
  .refine((v) => v.price_type !== 'paid' || v.price_amount !== null, {
    message: 'Isi nominal harga kalau acaranya berbayar',
    path: ['price_amount'],
  });

export type SubmissionInput = z.infer<typeof submissionSchema>;

/* ------------------------------------------------------------------ *
 * Admin: event create / edit / approve
 * ------------------------------------------------------------------ */

export const eventSchema = z
  .object({
    title: z.string().trim().min(3, 'Judul minimal 3 karakter').max(180),
    slug: optionalText(120),
    description: optionalText(8000),

    organizer_id: optionalUuid,
    category_ids: z.array(z.string().uuid()).max(6).default([]),

    start_date: isoDate,
    end_date: optionalDate,
    start_time: optionalTime,
    end_time: optionalTime,

    venue_name: optionalText(180),
    address: optionalText(300),
    district: districtEnum,
    latitude: optionalLat,
    longitude: optionalLng,

    price_type: priceType.default('free'),
    price_amount: optionalPrice,
    ticket_url: optionalUrl,
    source_url: optionalUrl,
    instagram_url: optionalUrl,
    poster_url: optionalUrl,

    registration_required: checkbox,
    audience: audienceEnum,
    featured: checkbox,

    status: z.enum(['draft', 'published', 'cancelled', 'archived']).default('draft'),
  })
  .refine((v) => !v.end_date || v.end_date >= v.start_date, {
    message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
    path: ['end_date'],
  })
  .refine((v) => v.price_type !== 'paid' || v.price_amount !== null, {
    message: 'Event berbayar wajib punya nominal harga',
    path: ['price_amount'],
  });

export type EventInput = z.infer<typeof eventSchema>;

/* ------------------------------------------------------------------ *
 * Admin: place create / edit
 * ------------------------------------------------------------------ */

export const placeSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: optionalText(120),
  description: optionalText(8000),
  tips: optionalText(600),
  category_id: optionalUuid,

  address: optionalText(300),
  district: districtEnum,
  latitude: optionalLat,
  longitude: optionalLng,

  opening_hours_label: optionalText(180),
  admission_type: priceType.default('free'),
  admission_price: optionalPrice,

  instagram_url: optionalUrl,
  website_url: optionalUrl,
  cover_image_url: optionalUrl,
  /** V1.2 §14 — free text so "Photo by Tim FOMO" is as valid as a URL. */
  source_photo: optionalText(300),

  status: z.enum(['draft', 'published', 'temporarily_closed', 'archived']).default('draft'),
  featured: checkbox,
});

export type PlaceInput = z.infer<typeof placeSchema>;

/* ------------------------------------------------------------------ *
 * Public place submission (V1.3 §11)
 *
 * As with event submissions, note what is absent: status, submission_code,
 * reviewed_by, reviewed_at, approved_place_id. Those are owned by the server
 * and the database trigger, so a crafted request cannot self-approve.
 * ------------------------------------------------------------------ */

export const placeSubmissionSchema = z
  .object({
    place_name: z.string().trim().min(2, 'Nama tempat minimal 2 karakter').max(180),
    category_id: z.string().uuid('Pilih kategori tempatnya'),
    source_url: httpUrl,

    address: optionalText(300),
    district: districtEnum,
    latitude: optionalLat,
    longitude: optionalLng,

    description: optionalText(4000),
    opening_hours_label: optionalText(180),
    admission_type: z
      .union([priceType, z.literal('')])
      .optional()
      .transform((v) => (v ? v : null)),
    admission_price: optionalPrice,

    instagram_url: optionalUrl,
    website_url: optionalUrl,
    source_photo: optionalText(300),

    contributor_name: optionalText(120),
    contributor_contact: optionalText(160),

    /** Honeypot, same as the event form. */
    website: z.string().max(0, 'spam').optional(),
    turnstile_token: z.string().optional(),
  })
  .refine((v) => v.admission_type !== 'paid' || v.admission_price !== null, {
    message: 'Isi perkiraan harga masuk kalau tempatnya berbayar',
    path: ['admission_price'],
  })
  .refine((v) => (v.latitude === null) === (v.longitude === null), {
    message: 'Latitude dan longitude harus diisi berpasangan',
    path: ['longitude'],
  });

export type PlaceSubmissionInput = z.infer<typeof placeSubmissionSchema>;

/** Admin approval payload for a place submission. */
export const approvePlaceSchema = z.object({
  submission_id: z.string().uuid(),
  name: z.string().trim().min(2).max(180),
  category_id: optionalUuid,
  description: optionalText(8000),
  tips: optionalText(600),
  address: optionalText(300),
  district: districtEnum,
  latitude: optionalLat,
  longitude: optionalLng,
  opening_hours_label: optionalText(180),
  admission_type: priceType.default('free'),
  admission_price: optionalPrice,
  instagram_url: optionalUrl,
  website_url: optionalUrl,
  cover_image_url: optionalUrl,
  source_photo: optionalText(300),
  featured: checkbox,
});

/* ------------------------------------------------------------------ *
 * Admin: moderation
 * ------------------------------------------------------------------ */

export const reviewSchema = z.object({
  submission_id: z.string().uuid(),
  status: z.enum(['pending', 'needs_revision', 'rejected']),
  reason: optionalText(240),
  notes: optionalText(1000),
});

/** Same shape, used for place submissions. */
export const reviewPlaceSchema = reviewSchema;

export const organizerSchema = z.object({
  id: optionalUuid,
  name: z.string().trim().min(2).max(160),
  instagram_url: optionalUrl,
  website_url: optionalUrl,
  contact_url: optionalUrl,
  logo_url: optionalUrl,
});

/** V1.2 §7 — admin category management. */
export const categorySchema = z.object({
  id: optionalUuid,
  name: z.string().trim().min(2, 'Nama kategori minimal 2 karakter').max(60),
  slug: optionalText(60),
  type: z.enum(['event', 'place']).default('event'),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Warna harus format hex, misal #FD7318'),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  active: checkbox,
});

/* ------------------------------------------------------------------ *
 * Shared plans
 * ------------------------------------------------------------------ */

export const sharePlanSchema = z.object({
  title: optionalText(120),
  items: z
    .array(
      z.object({
        kind: z.enum(['event', 'place']),
        slug: z.string().trim().max(140),
        day_date: optionalDate,
        time_label: optionalText(12),
        note: optionalText(240),
      }),
    )
    .min(1, 'Rencana kamu masih kosong')
    .max(40, 'Maksimal 40 aktivitas per rencana'),
});

/** Turns a FormData into a plain object Zod can read. */
export function formDataToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (value instanceof File) continue;
    if (key.endsWith('[]')) {
      const k = key.slice(0, -2);
      (out[k] as string[]) = [...((out[k] as string[]) ?? []), value];
    } else if (key in out) {
      const prev = out[key];
      out[key] = Array.isArray(prev) ? [...prev, value] : [prev as string, value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** First error message per field, ready for rendering next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
