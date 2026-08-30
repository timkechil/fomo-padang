import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { placeSubmissionSchema, fieldErrors } from '@/lib/validation';
import { clientIp, hashIp, takeToken, verifyTurnstile } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const HOURLY_LIMIT = 5;
const DAILY_LIMIT = 20;

/**
 * V1.3 §11/§12 — public, unauthenticated place recommendations.
 *
 * Same posture as /api/submissions: the browser never touches the database.
 * This route validates, drops everything outside the schema, and inserts with
 * the service role — which is why `place_submissions` has no anon RLS policy.
 *
 * Server/database-owned, never read from the body:
 *   submission_code, status, reviewed_by, reviewed_at, approved_place_id.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Format datanya nggak kebaca.' }, { status: 400 });
  }

  const parsed = placeSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    // Honeypot filled = bot. Look successful, store nothing.
    if (errors.website) return NextResponse.json({ ok: true, submission_code: 'TEMPAT-000000' });
    return NextResponse.json(
      { ok: false, message: 'Ada isian yang belum pas.', errors },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const ip = clientIp(request.headers);
  const ipHash = hashIp(ip);

  if (!takeToken(`place:${ipHash}`, HOURLY_LIMIT, 60 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: 'Kebanyakan kiriman dari perangkat ini. Coba lagi satu jam lagi ya.' },
      { status: 429 },
    );
  }

  if (!(await verifyTurnstile(data.turnstile_token, ip))) {
    return NextResponse.json(
      { ok: false, message: 'Verifikasi anti-spam gagal. Muat ulang halaman lalu coba lagi.' },
      { status: 400 },
    );
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Yah, infonya belum berhasil dikirim. Coba lagi sebentar ya.' },
      { status: 500 },
    );
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('place_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('submitted_ip_hash', ipHash)
    .gte('created_at', dayAgo);

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { ok: false, message: 'Kiriman hari ini sudah cukup banyak. Lanjut besok ya — atau DM kami.' },
      { status: 429 },
    );
  }

  const { data: inserted, error } = await supabase
    .from('place_submissions')
    .insert({
      place_name: data.place_name,
      category_id: data.category_id,
      source_url: data.source_url,
      description: data.description,
      address: data.address,
      district: data.district,
      latitude: data.latitude,
      longitude: data.longitude,
      opening_hours_label: data.opening_hours_label,
      admission_type: data.admission_type,
      admission_price: data.admission_price,
      instagram_url: data.instagram_url,
      website_url: data.website_url,
      source_photo: data.source_photo,
      contributor_name: data.contributor_name,
      contributor_contact: data.contributor_contact,
      submitted_ip_hash: ipHash,
      user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
      // overwritten by the database trigger; sent only to satisfy NOT NULL
      submission_code: 'pending',
      status: 'pending',
    })
    .select('submission_code, place_name')
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { ok: false, message: 'Yah, infonya belum berhasil dikirim. Coba lagi sebentar ya.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    submission_code: inserted.submission_code,
    place_name: inserted.place_name,
  });
}
