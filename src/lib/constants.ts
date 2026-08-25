/** Values that are part of the product definition, not user data. */

export const SITE_NAME = 'FOMO Padang';
export const SITE_TAGLINE = 'Semua yang lagi terjadi di Padang, ada di sini.';
export const SITE_DESCRIPTION =
  'Cari event, tempat, dan aktivitas yang bisa kamu lakukan di Padang hari ini. Dikurasi dari komunitas, buat semua orang.';

export const TIMEZONE = 'Asia/Jakarta';

export const MAP_CENTER: [number, number] = [-0.935, 100.38];
export const PADANG_CENTER: [number, number] = [-0.9471, 100.4172];

export const DISTRICTS = [
  'Padang Barat', 'Padang Timur', 'Padang Utara', 'Padang Selatan', 'Koto Tangah',
  'Pauh', 'Kuranji', 'Nanggalo', 'Lubuk Begalung', 'Lubuk Kilangan', 'Bungus Teluk Kabung',
] as const;

export const AUDIENCES = [
  'Semua Umur', 'Anak', 'Keluarga', 'Pelajar', 'Mahasiswa', 'Dewasa',
] as const;

/** Public place categories (V1.2 §12). Slugs match the `categories` rows
 *  created in migration 0005 — display labels live here, slugs never change. */
export const PLACE_CATEGORIES = [
  { slug: 'spot', name: 'Spot Lokal' },
  { slug: 'tempat-makan', name: 'Tempat Makan' },
  { slug: 'tempat-nongkrong', name: 'Tempat Nongkrong' },
  { slug: 'toko-oleh-oleh', name: 'Toko Oleh-Oleh' },
] as const;

/** V1.2 §11: "Local Spot" is retired from user-facing copy. The category slug
 *  stays `spot` so existing rows, URLs and relations are untouched. */
export const SPOT_LABEL = 'Spot Lokal';

export const DISTRICT_CENTER: Record<string, [number, number]> = {
  'Padang Barat': [-0.9481, 100.3616],
  'Padang Timur': [-0.9425, 100.3861],
  'Padang Utara': [-0.9195, 100.3532],
  'Padang Selatan': [-0.97, 100.361],
  'Koto Tangah': [-0.8867, 100.3833],
  Pauh: [-0.9151, 100.4618],
  Kuranji: [-0.9, 100.4],
  Nanggalo: [-0.9095, 100.3612],
  'Lubuk Begalung': [-0.97, 100.4],
  'Lubuk Kilangan': [-0.9787, 100.4356],
  'Bungus Teluk Kabung': [-1.045, 100.393],
};

export const DATE_CHIPS = [
  { k: 'semua', l: 'Semua' },
  { k: 'hari-ini', l: 'Hari Ini' },
  { k: 'besok', l: 'Besok' },
  { k: 'weekend', l: 'Weekend Ini' },
  { k: 'minggu-ini', l: 'Minggu Ini' },
] as const;

export const EVENT_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  published: 'Tayang',
  cancelled: 'Dibatalkan',
  archived: 'Diarsipkan',
};

export const SUBMISSION_STATUS_LABEL: Record<string, string> = {
  pending: 'Ditinjau',
  needs_revision: 'Perlu revisi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

export const REJECT_REASONS = [
  'Duplikat event',
  'Sumber tidak bisa dibuka',
  'Informasi tidak bisa diverifikasi',
  'Bukan aktivitas publik',
  'Spam',
] as const;

export const POSTER_BUCKET = 'event-posters';
export const PLACE_BUCKET = 'place-images';
export const ORGANIZER_BUCKET = 'organizer-assets';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
