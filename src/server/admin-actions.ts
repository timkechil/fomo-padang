'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStaffSession, requireStaff } from '@/lib/supabase/auth';
import {
  eventSchema, placeSchema, reviewSchema, organizerSchema,
  fieldErrors, formDataToObject,
} from '@/lib/validation';

export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');

  if (!email || !password) {
    return { ok: false, message: 'Email dan kata sandi wajib diisi.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, message: 'Email atau kata sandi salah.' };
  }

  // Being in auth.users is not the same as being staff.
  const session = await getStaffSession();
  if (!session) {
    await supabase.auth.signOut();
    return { ok: false, message: 'Akun ini belum punya akses tim FOMO. Hubungi admin.' };
  }

  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

/* ------------------------------------------------------------------ *
 * Moderation
 * ------------------------------------------------------------------ */

/** Approve → create the event → publish, in one database transaction. */
export async function approveSubmissionAction(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const submissionId = String(formData.get('submission_id') ?? '');
  if (!submissionId) return { ok: false, message: 'Submission tidak ditemukan.' };

  const raw = formDataToObject(formData);
  raw.category_ids = formData.getAll('category_ids').map(String).filter(Boolean);

  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Ada isian event yang belum lengkap.',
      errors: fieldErrors(parsed.error),
    };
  }

  const { category_ids, ...event } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('approve_submission', {
    p_submission_id: submissionId,
    p_event: event,
    p_category_ids: category_ids,
  });

  if (error) {
    return { ok: false, message: `Gagal menyetujui: ${error.message}` };
  }

  const result = data as { slug: string; already_approved: boolean };
  revalidatePath('/admin');
  revalidatePath('/admin/submissions');
  revalidatePath('/');
  revalidatePath(`/event/${result.slug}`);
  redirect(`/admin/submissions?published=${encodeURIComponent(result.slug)}`);
}

export async function reviewSubmissionAction(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const parsed = reviewSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: 'Aksi moderasi tidak valid.', errors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('review_submission', {
    p_submission_id: parsed.data.submission_id,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason,
    p_notes: parsed.data.notes,
  });

  if (error) return { ok: false, message: `Gagal menyimpan: ${error.message}` };

  revalidatePath('/admin');
  revalidatePath('/admin/submissions');
  return { ok: true, message: 'Status kiriman diperbarui.' };
}

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

export async function saveEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireStaff();
  const eventId = String(formData.get('event_id') ?? '');

  const raw = formDataToObject(formData);
  raw.category_ids = formData.getAll('category_ids').map(String).filter(Boolean);

  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: 'Ada isian yang belum pas.', errors: fieldErrors(parsed.error) };
  }

  const { category_ids, ...event } = parsed.data;
  const supabase = await createClient();

  let slug = String(formData.get('current_slug') ?? '');
  let id = eventId;

  if (eventId) {
    const { data, error } = await supabase
      .from('events')
      .update({ ...event, updated_by: session.userId })
      .eq('id', eventId)
      .select('id, slug')
      .single();
    if (error) return { ok: false, message: `Gagal menyimpan: ${error.message}` };
    slug = data.slug;
  } else {
    const { data, error } = await supabase
      .from('events')
      .insert({ ...event, created_by: session.userId, updated_by: session.userId })
      .select('id, slug')
      .single();
    if (error) return { ok: false, message: `Gagal membuat event: ${error.message}` };
    id = data.id;
    slug = data.slug;
  }

  // categories: replace the set
  await supabase.from('event_categories').delete().eq('event_id', id);
  if (category_ids.length) {
    await supabase.from('event_categories').insert(
      category_ids.map((cid, i) => ({ event_id: id, category_id: cid, is_primary: i === 0 })),
    );
  }

  await supabase.rpc('log_admin_action', {
    p_action: eventId ? 'updated_event' : 'created_event',
    p_entity_type: 'event',
    p_entity_id: id,
    p_metadata: { slug, status: event.status },
  });

  revalidatePath('/admin/events');
  revalidatePath('/');
  revalidatePath(`/event/${slug}`);
  redirect(`/admin/events/${id}?saved=1`);
}

export async function setEventStatusAction(formData: FormData) {
  const session = await requireStaff();
  const id = String(formData.get('event_id') ?? '');
  const status = String(formData.get('status') ?? '');
  const featured = formData.get('featured');

  if (!id) return;

  const supabase = await createClient();
  const patch: Record<string, unknown> = { updated_by: session.userId };

  if (['draft', 'published', 'cancelled', 'archived'].includes(status)) patch.status = status;
  if (featured !== null) patch.featured = featured === 'true';

  const { data } = await supabase.from('events').update(patch).eq('id', id).select('slug').single();

  await supabase.rpc('log_admin_action', {
    p_action: status ? `${status}_event` : 'updated_event',
    p_entity_type: 'event',
    p_entity_id: id,
    p_metadata: patch,
  });

  revalidatePath('/admin/events');
  revalidatePath('/');
  if (data?.slug) revalidatePath(`/event/${data.slug}`);
}

/* ------------------------------------------------------------------ *
 * Places
 * ------------------------------------------------------------------ */

export async function savePlaceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireStaff();
  const placeId = String(formData.get('place_id') ?? '');

  const parsed = placeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: 'Ada isian yang belum pas.', errors: fieldErrors(parsed.error) };
  }

  const { opening_hours_label, ...rest } = parsed.data;
  const payload = {
    ...rest,
    opening_hours: opening_hours_label ? { label: opening_hours_label } : {},
    updated_by: session.userId,
  };

  const supabase = await createClient();
  let id = placeId;

  if (placeId) {
    const { error } = await supabase.from('places').update(payload).eq('id', placeId);
    if (error) return { ok: false, message: `Gagal menyimpan: ${error.message}` };
  } else {
    const { data, error } = await supabase
      .from('places')
      .insert({ ...payload, created_by: session.userId })
      .select('id')
      .single();
    if (error) return { ok: false, message: `Gagal membuat tempat: ${error.message}` };
    id = data.id;
  }

  await supabase.rpc('log_admin_action', {
    p_action: placeId ? 'updated_place' : 'created_place',
    p_entity_type: 'place',
    p_entity_id: id,
    p_metadata: { status: payload.status },
  });

  revalidatePath('/admin/places');
  revalidatePath('/places');
  redirect(`/admin/places/${id}?saved=1`);
}

export async function setPlaceStatusAction(formData: FormData) {
  await requireStaff();
  const id = String(formData.get('place_id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['draft', 'published', 'temporarily_closed', 'archived'].includes(status)) return;

  const supabase = await createClient();
  await supabase.from('places').update({ status }).eq('id', id);
  await supabase.rpc('log_admin_action', {
    p_action: `${status}_place`, p_entity_type: 'place', p_entity_id: id, p_metadata: {},
  });

  revalidatePath('/admin/places');
  revalidatePath('/places');
}

/* ------------------------------------------------------------------ *
 * Organizers
 * ------------------------------------------------------------------ */

export async function createOrganizerAction(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const parsed = organizerSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: 'Data penyelenggara belum pas.', errors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('organizers').insert(parsed.data);
  if (error) return { ok: false, message: `Gagal menyimpan: ${error.message}` };

  revalidatePath('/admin/events');
  return { ok: true, message: 'Penyelenggara ditambahkan.' };
}
