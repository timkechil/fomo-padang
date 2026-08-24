import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { submissionSchema, fieldErrors } from '@/lib/validation';
import { clientIp, hashIp, takeToken, verifyTurnstile } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const HOURLY_LIMIT = 5;
const DAILY_LIMIT = 20;

/**
 * Public, unauthenticated submission endpoint.
 *
 * The browser never talks to the database here. This route validates,
 * strips everything that is not in the schema, and inserts with the service
 * role — which is why `event_submissions` needs no anon RLS policy at all.
 *
 * Server-controlled, never read from the request body:
 *   submission_code, status, reviewed_by, reviewed_at, approved_event_id.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Format datanya nggak kebaca.' }, { status: 400 });
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    // Honeypot: a filled "website" field is a bot. Look like a success, store nothing.
    const errors = fieldErrors(parsed.error);
    if (errors.website) return NextResponse.json({ ok: true, submission_code: 'FOMO-000000' });
    return NextResponse.json(
      { ok: false, message: 'Ada isian yang belum pas.', errors },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const ip = clientIp(request.headers);
  const ipHash = hashIp(ip);

  if (!takeToken(ipHash, HOURLY_LIMIT, 60 * 60 * 1000)) {
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

  // Durable limit: survives cold starts, unlike the in-memory bucket above.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('event_submissions')
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
    .from('event_submissions')
    .insert({
      event_name: data.event_name,
      source_url: data.source_url,
      organizer_name: data.organizer_name,
      category_id: data.category_id,
      start_date: data.start_date,
      end_date: data.end_date,
      start_time: data.start_time,
      end_time: data.end_time,
      venue_name: data.venue_name,
      address: data.address,
      district: data.district,
      latitude: data.latitude,
      longitude: data.longitude,
      price_type: data.price_type,
      price_amount: data.price_amount,
      ticket_url: data.ticket_url,
      description: data.description,
      instagram_url: data.instagram_url,
      registration_required: data.registration_required,
      audience: data.audience,
      contributor_name: data.contributor_name,
      contributor_contact: data.contributor_contact,
      submitted_ip_hash: ipHash,
      user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
      // submission_code and status are assigned by the database trigger
      submission_code: 'pending',
      status: 'pending',
    })
    .select('submission_code, event_name')
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
    event_name: inserted.event_name,
  });
}
