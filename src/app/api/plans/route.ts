import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sharePlanSchema } from '@/lib/validation';
import { clientIp, hashIp, takeToken } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** Turns a local My Plan into a read-only public plan at /plan/[shareId].
 *  Only slugs are accepted: the server resolves them to real published rows,
 *  so a shared plan can never contain a draft or an invented event. */
export async function POST(request: NextRequest) {
  const ipHash = hashIp(clientIp(request.headers));
  if (!takeToken(`plan:${ipHash}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, message: 'Terlalu banyak percobaan.' }, { status: 429 });
  }

  const parsed = sharePlanSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Rencananya belum bisa dibagikan.' }, { status: 422 });
  }

  const supabase = createAdminClient();
  const eventSlugs = parsed.data.items.filter((i) => i.kind === 'event').map((i) => i.slug);
  const placeSlugs = parsed.data.items.filter((i) => i.kind === 'place').map((i) => i.slug);

  const [{ data: events }, { data: places }] = await Promise.all([
    eventSlugs.length
      ? supabase.from('events').select('id, slug').in('slug', eventSlugs).eq('status', 'published')
      : Promise.resolve({ data: [] as { id: string; slug: string }[] }),
    placeSlugs.length
      ? supabase.from('places').select('id, slug').in('slug', placeSlugs)
        .in('status', ['published', 'temporarily_closed'])
      : Promise.resolve({ data: [] as { id: string; slug: string }[] }),
  ]);

  const eventBySlug = new Map((events ?? []).map((e) => [e.slug, e.id]));
  const placeBySlug = new Map((places ?? []).map((p) => [p.slug, p.id]));

  const shareId = randomBytes(6).toString('base64url');
  const { data: plan, error } = await supabase
    .from('plans')
    .insert({ share_id: shareId, title: parsed.data.title })
    .select('id, share_id')
    .single();

  if (error || !plan) {
    return NextResponse.json({ ok: false, message: 'Tautannya belum bisa dibuat.' }, { status: 500 });
  }

  const rows = parsed.data.items
    .flatMap((item, index) => {
      const eventId = item.kind === 'event' ? eventBySlug.get(item.slug) : undefined;
      const placeId = item.kind === 'place' ? placeBySlug.get(item.slug) : undefined;
      if (!eventId && !placeId) return [];
      return [{
        plan_id: plan.id,
        kind: item.kind,
        event_id: eventId ?? null,
        place_id: placeId ?? null,
        day_date: item.day_date,
        time_label: item.time_label,
        note: item.note,
        position: index,
      }];
    });

  if (rows.length) await supabase.from('plan_items').insert(rows);

  return NextResponse.json({ ok: true, share_id: plan.share_id });
}
