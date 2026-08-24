/**
 * Development seed.  npm run db:seed
 *
 * Idempotent: every table is upserted on its unique slug, so running it twice
 * updates rows instead of creating duplicates.
 *
 * Uses the service role, which is exactly why this file lives in /supabase
 * and not in /src — it must never be bundled into the app.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { SAMPLE_EVENTS, SAMPLE_PLACES } from './data';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local first.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

/* ---------------------------------------------------------------- */

const CATEGORIES = [
  { slug: 'musik', name: 'Musik', color: '#FD7318', type: 'event', sort_order: 1 },
  { slug: 'kuliner', name: 'Kuliner', color: '#019736', type: 'event', sort_order: 2 },
  { slug: 'komunitas', name: 'Komunitas', color: '#6096C9', type: 'event', sort_order: 3 },
  { slug: 'olahraga', name: 'Olahraga', color: '#14376E', type: 'event', sort_order: 4 },
  { slug: 'seni', name: 'Seni & Budaya', color: '#FAB02F', type: 'event', sort_order: 5 },
  { slug: 'workshop', name: 'Workshop', color: '#FAB02F', type: 'event', sort_order: 6 },
  { slug: 'kampus', name: 'Kampus', color: '#6096C9', type: 'event', sort_order: 7 },
  { slug: 'keluarga', name: 'Keluarga', color: '#019736', type: 'event', sort_order: 8 },
  { slug: 'pemerintahan', name: 'Pemerintahan', color: '#14376E', type: 'event', sort_order: 9 },
  { slug: 'market', name: 'Market', color: '#FD7318', type: 'event', sort_order: 10 },
  { slug: 'spot', name: 'Local Spot', color: '#161616', type: 'place', sort_order: 11 },
];

function todayWIB(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function iso(offset: number): string {
  const [y, m, d] = todayWIB().split('-').map(Number);
  const base = new Date(y, m - 1, d, 12);
  const dow = base.getDay();
  const satOffset = (6 - dow + 7) % 7;

  // 1000 = this Saturday, 1001 = Sunday, 1003 = Saturday + 3, etc.
  const real = offset >= 1000 ? satOffset + (offset - 1000) : offset;
  base.setDate(base.getDate() + real);

  const yy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, '0');
  const dd = String(base.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

async function main() {
  console.log('→ categories');
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .upsert(CATEGORIES, { onConflict: 'slug' })
    .select('id, slug');
  if (catError) throw catError;
  const catBySlug = new Map(categories!.map((c) => [c.slug, c.id]));

  console.log('→ organizers');
  const organizerNames = [...new Set(
    SAMPLE_EVENTS.map((e) => e.organizer?.name).filter(Boolean) as string[],
  )];
  const organizerRows = organizerNames.map((name) => {
    const source = SAMPLE_EVENTS.find((e) => e.organizer?.name === name);
    const url = source?.organizer?.url ?? null;
    return {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      instagram_url: url && url.includes('instagram.com') ? url : null,
      website_url: url && !url.includes('instagram.com') ? url : null,
    };
  });
  const { data: organizers, error: orgError } = await supabase
    .from('organizers')
    .upsert(organizerRows, { onConflict: 'slug' })
    .select('id, name');
  if (orgError) throw orgError;
  const orgByName = new Map(organizers!.map((o) => [o.name, o.id]));

  console.log('→ places');
  const placeRows = SAMPLE_PLACES.map((p) => ({
    slug: p.slug,
    name: p.name,
    description: `[Data contoh] ${p.description}`,
    tips: p.tips,
    category_id: catBySlug.get('spot') ?? null,
    address: p.address,
    district: p.district,
    latitude: p.latitude,
    longitude: p.longitude,
    opening_hours: p.openingHours ? { label: p.openingHours } : {},
    admission_type: p.admissionType,
    admission_price: p.admissionType === 'paid' ? 10000 : null,
    instagram_url: p.instagramUrl || null,
    website_url: p.websiteUrl || null,
    status: 'published',
  }));
  const { error: placeError } = await supabase
    .from('places')
    .upsert(placeRows, { onConflict: 'slug' });
  if (placeError) throw placeError;

  console.log('→ events');
  const eventRows = SAMPLE_EVENTS.map((e) => ({
    slug: e.slug,
    title: e.title,
    description: `[Data contoh] ${e.description}`,
    organizer_id: e.organizer ? orgByName.get(e.organizer.name) ?? null : null,
    start_date: iso(e.startOffset),
    end_date: e.endOffset === e.startOffset ? null : iso(e.endOffset),
    start_time: e.startTime,
    end_time: e.endTime,
    venue_name: e.venueName,
    address: e.address,
    district: e.district,
    latitude: e.latitude,
    longitude: e.longitude,
    price_type: e.priceType,
    price_amount: e.priceAmount,
    ticket_url: e.ticketUrl,
    source_url: e.sourceUrl,
    instagram_url: e.instagramUrl,
    registration_required: e.registrationRequired,
    audience: e.audience,
    status: 'published',
    featured: e.featured,
    published_at: new Date().toISOString(),
  }));

  const { data: events, error: eventError } = await supabase
    .from('events')
    .upsert(eventRows, { onConflict: 'slug' })
    .select('id, slug');
  if (eventError) throw eventError;
  const eventBySlug = new Map(events!.map((e) => [e.slug, e.id]));

  console.log('→ event categories');
  const links = SAMPLE_EVENTS.flatMap((e) => {
    const eventId = eventBySlug.get(e.slug);
    const categoryId = catBySlug.get(e.category);
    if (!eventId || !categoryId) return [];
    return [{ event_id: eventId, category_id: categoryId, is_primary: true }];
  });
  const { error: linkError } = await supabase
    .from('event_categories')
    .upsert(links, { onConflict: 'event_id,category_id' });
  if (linkError) throw linkError;

  console.log('→ sources');
  const sources = SAMPLE_EVENTS.flatMap((e) => {
    const eventId = eventBySlug.get(e.slug);
    if (!eventId || !e.sourceUrl) return [];
    return [{ event_id: eventId, url: e.sourceUrl, platform: 'instagram', is_primary: true }];
  });
  await supabase.from('event_sources').delete().in('event_id', [...eventBySlug.values()]);
  if (sources.length) await supabase.from('event_sources').insert(sources);

  console.log(`\nDone. ${eventRows.length} events, ${placeRows.length} places, ${CATEGORIES.length} categories, ${organizerRows.length} organizers.`);
  console.log('All seeded rows are prefixed "[Data contoh]" so real entries stay easy to tell apart.');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
