import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { getStaffSession } from '@/lib/supabase/auth';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';

export const runtime = 'nodejs';

const BUCKETS = new Set(['event-posters', 'place-images', 'organizer-assets']);

/** Extension and Content-Type are both attacker-controlled, so the real
 *  check is the file signature. */
function sniff(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }
  const ascii = (i: number, s: string) =>
    String.fromCharCode(...bytes.slice(i, i + s.length)) === s;
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return { mime: 'image/webp', ext: 'webp' };
  return null;
}

export async function POST(request: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Tidak punya akses.' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('file');
  const bucket = String(form.get('bucket') ?? 'event-posters');

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: 'File tidak terbaca.' }, { status: 400 });
  }
  if (!BUCKETS.has(bucket)) {
    return NextResponse.json({ ok: false, message: 'Bucket tidak dikenal.' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, message: 'Ukuran file maksimal 5 MB.' }, { status: 413 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(buffer);
  if (!kind) {
    return NextResponse.json(
      { ok: false, message: 'File bukan gambar JPG/PNG/WEBP yang valid.' },
      { status: 415 },
    );
  }

  // Filename comes from us, never from the upload.
  const path = `${new Date().getFullYear()}/${randomUUID()}.${kind.ext}`;

  // Uploads run as the signed-in staff member, so the Storage RLS policy
  // is enforced here too — the service role is never involved.
  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: kind.mime,
    cacheControl: '31536000',
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ ok: false, message: `Upload gagal: ${error.message}` }, { status: 500 });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl, path });
}
