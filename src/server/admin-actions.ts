'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStaffSession, requireStaff } from '@/lib/supabase/auth';
import {
  eventSchema, placeSchema, reviewSchema, organizerSchema, categorySchema,
  approvePlaceSchema, reviewPlaceSchema,
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

export interface OrganizerActionState extends ActionState {
  organizerId?: string;
  organizerName?: string;
}

/** V1.2 §5 — create or update an organizer. Used by /admin/organizers and by
 *  the inline "+ Tambah Penyelenggara Baru" control on the event form. */
export async function saveOrganizerAction(
  _prev: OrganizerActionState, formData: FormData,
): Promise<OrganizerActionState> {
  await requireStaff();

  const parsed = organizerSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: 'Data penyelenggara belum pas.', errors: fieldErrors(parsed.error) };
  }

  const { id, ...fields } = parsed.data;
  const supabase = await createClient();

  if (id) {
    const { data, error } = await supabase
      .from('organizers').update(fields).eq('id', id).select('id, name').single();
    if (error) return { ok: false, message: `Gagal menyimpan: ${error.message}` };
    await supabase.rpc('log_admin_action', {
      p_action: 'updated_organizer', p_entity_type: 'organizer',
      p_entity_id: id, p_metadata: { name: fields.name },
    });
    revalidatePath('/admin/organizers');
    revalidatePath('/admin/events');
    return { ok: true, message: 'Penyelenggara diperbarui.', organizerId: data.id, organizerName: data.name };
  }

  const { data, error } = await supabase
    .from('organizers').insert(fields).select('id, name').single();
  if (error) return { ok: false, message: `Gagal menyimpan: ${error.message}` };

  await supabase.rpc('log_admin_action', {
    p_action: 'created_organizer', p_entity_type: 'organizer',
    p_entity_id: data.id, p_metadata: { name: data.name },
  });

  revalidatePath('/admin/organizers');
  revalidatePath('/admin/events');
  return { ok: true, message: 'Penyelenggara ditambahkan.', organizerId: data.id, organizerName: data.name };
}

/** Kept as an alias so any existing import keeps working. */
export const createOrganizerAction = saveOrganizerAction;

/* ------------------------------------------------------------------ *
 * Categories (V1.2 §7)
 * ------------------------------------------------------------------ */

export async function saveCategoryAction(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const parsed = categorySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: 'Data kategori belum pas.', errors: fieldErrors(parsed.error) };
  }

  const { id, slug, ...fields } = parsed.data;
  const supabase = await createClient();

  if (id) {
    // The slug is the join key used by every event and place filter URL, so it
    // is deliberately not editable after creation.
    const { error } = await supabase.from('categories').update(fields).eq('id', id);
    if (error) return { ok: false, message: `Gagal menyimpan: ${error.message}` };
    await supabase.rpc('log_admin_action', {
      p_action: 'updated_category', p_entity_type: 'category',
      p_entity_id: id, p_metadata: { name: fields.name },
    });
  } else {
    const generated = (slug ?? fields.name)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const { data, error } = await supabase
      .from('categories').insert({ ...fields, slug: generated }).select('id').single();
    if (error) {
      return {
        ok: false,
        message: error.code === '23505'
          ? 'Sudah ada kategori dengan slug itu. Pakai nama yang sedikit berbeda.'
          : `Gagal menyimpan: ${error.message}`,
      };
    }
    await supabase.rpc('log_admin_action', {
      p_action: 'created_category', p_entity_type: 'category',
      p_entity_id: data.id, p_metadata: { name: fields.name, slug: generated },
    });
  }

  revalidatePath('/admin/categories');
  revalidatePath('/');
  revalidatePath('/places');
  return { ok: true, message: 'Kategori tersimpan.' };
}

/* ------------------------------------------------------------------ *
 * Permanent delete (V1.2 §15) — admin only
 * ------------------------------------------------------------------ */

export async function deleteEventPermanentlyAction(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  // requireStaff('admin') redirects an editor away before anything runs.
  const session = await requireStaff('admin');

  const id = String(formData.get('event_id') ?? '');
  const confirm = String(formData.get('confirm') ?? '').trim().toUpperCase();
  if (!id) return { ok: false, message: 'Event tidak ditemukan.' };
  if (confirm !== 'HAPUS') {
    return { ok: false, message: 'Ketik HAPUS untuk mengonfirmasi penghapusan permanen.' };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from('events').select('id, slug, title, poster_url').eq('id', id).maybeSingle();
  if (!target) return { ok: false, message: 'Event tidak ditemukan.' };

  // Log before deleting: the row is about to stop existing.
  await supabase.rpc('log_admin_action', {
    p_action: 'deleted_event_permanently', p_entity_type: 'event', p_entity_id: id,
    p_metadata: { slug: target.slug, title: target.title, by: session.userId },
  });

  const { data: deleted, error } = await supabase
    .from('events').delete().eq('id', id).select('id');
  if (error) return { ok: false, message: `Gagal menghapus: ${error.message}` };

  // RLS refuses a delete by matching zero rows rather than raising, so an
  // empty result means "not permitted", not "succeeded".
  if (!deleted || deleted.length === 0) {
    return { ok: false, message: 'Penghapusan permanen ditolak. Hanya admin yang bisa melakukannya.' };
  }

  // Best-effort cleanup of the uploaded poster; a failure here must not leave
  // the admin staring at an error for a row that is already gone.
  if (target.poster_url && target.poster_url.includes('/event-posters/')) {
    const path = target.poster_url.split('/event-posters/')[1];
    if (path) await supabase.storage.from('event-posters').remove([path]).catch(() => {});
  }

  revalidatePath('/admin/events');
  revalidatePath('/');
  redirect('/admin/events?deleted=1');
}


/* ------------------------------------------------------------------ *
 * Place submissions (V1.3 §12)
 * ------------------------------------------------------------------ */

/** Approve → create the published Place, in one idempotent transaction. */
export async function approvePlaceSubmissionAction(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const parsed = approvePlaceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Ada isian tempat yang belum lengkap.',
      errors: fieldErrors(parsed.error),
    };
  }

  const { submission_id, ...place } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('approve_place_submission', {
    p_submission_id: submission_id,
    p_place: place,
  });

  if (error) return { ok: false, message: `Gagal menyetujui: ${error.message}` };

  const result = data as { slug: string; already_approved: boolean };
  revalidatePath('/admin');
  revalidatePath('/admin/place-submissions');
  revalidatePath('/places');
  revalidatePath(`/place/${result.slug}`);
  redirect(`/admin/place-submissions?published=${encodeURIComponent(result.slug)}`);
}

export async function reviewPlaceSubmissionAction(
  _prev: ActionState, formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const parsed = reviewPlaceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: 'Aksi moderasi tidak valid.', errors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('review_place_submission', {
    p_submission_id: parsed.data.submission_id,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason,
    p_notes: parsed.data.notes,
  });

  if (error) return { ok: false, message: `Gagal menyimpan: ${error.message}` };

  revalidatePath('/admin');
  revalidatePath('/admin/place-submissions');
  return { ok: true, message: 'Status rekomendasi diperbarui.' };
}
