-- =====================================================================
-- FOMO Padang — 0006  V1.3 revisions
--
-- Adds the contributor place-recommendation flow, mirroring the event
-- submission architecture from 0001/0002 rather than inventing a new one.
-- Additive only: no existing table, column, policy or row is altered.
-- =====================================================================

-- ---------------------------------------------------------------------
-- §11/§12  place_submissions — the contributor inbox for Tempat.
--
-- Deliberately NOT `places`: an anonymous recommendation must never be a
-- published row, exactly as event_submissions is separate from events.
-- ---------------------------------------------------------------------
create table if not exists public.place_submissions (
  id                  uuid primary key default gen_random_uuid(),
  submission_code     text not null unique,

  place_name          text not null,
  category_id         uuid references public.categories(id) on delete set null,
  source_url          text not null,

  description         text,
  address             text,
  district            text,
  latitude            double precision,
  longitude           double precision,

  opening_hours_label text,
  admission_type      text,
  admission_price     numeric(12,2),

  instagram_url       text,
  website_url         text,
  source_photo        text,

  contributor_name    text,
  contributor_contact text,

  status              text not null default 'pending',
  admin_notes         text,
  reject_reason       text,

  approved_place_id   uuid references public.places(id) on delete set null,
  reviewed_by         uuid references public.profiles(id) on delete set null,
  reviewed_at         timestamptz,

  submitted_ip_hash   text,
  user_agent          text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint place_submissions_status_check
    check (status in ('pending','needs_revision','approved','rejected')),
  constraint place_submissions_admission_check
    check (admission_type is null or admission_type in ('free','paid')),
  constraint place_submissions_price_check
    check (admission_price is null or admission_price >= 0),
  constraint place_submissions_lat_check
    check (latitude is null or (latitude between -90 and 90)),
  constraint place_submissions_lng_check
    check (longitude is null or (longitude between -180 and 180)),
  constraint place_submissions_name_len
    check (char_length(place_name) between 2 and 180),
  constraint place_submissions_source_len
    check (char_length(source_url) between 8 and 600),
  constraint place_submissions_desc_len
    check (description is null or char_length(description) <= 4000)
);

comment on table public.place_submissions is
  'Contributor place recommendations. Never public; approval creates a row in places.';

create index if not exists place_submissions_status_idx
  on public.place_submissions (status);
create index if not exists place_submissions_created_idx
  on public.place_submissions (created_at desc);
create index if not exists place_submissions_ip_idx
  on public.place_submissions (submitted_ip_hash, created_at desc);

-- one submission can only ever produce one place
create unique index if not exists place_submissions_approved_uniq
  on public.place_submissions (approved_place_id) where approved_place_id is not null;

-- ---------------------------------------------------------------------
-- Human-friendly codes, same shape as events: TEMPAT-000001
-- ---------------------------------------------------------------------
create sequence if not exists public.place_submission_code_seq start with 1;

create or replace function public.tg_place_submission_code()
returns trigger
language plpgsql
as $$
begin
  -- Server-owned fields. A crafted request cannot set any of these.
  new.submission_code   := 'TEMPAT-' || lpad(nextval('public.place_submission_code_seq')::text, 6, '0');
  new.status            := 'pending';
  new.reviewed_by       := null;
  new.reviewed_at       := null;
  new.approved_place_id := null;
  return new;
end;
$$;

drop trigger if exists place_submission_code on public.place_submissions;
create trigger place_submission_code before insert on public.place_submissions
for each row execute function public.tg_place_submission_code();

drop trigger if exists set_updated_at on public.place_submissions;
create trigger set_updated_at before update on public.place_submissions
for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- APPROVE: place_submission → places, one transaction, idempotent.
-- Mirrors approve_submission() for events.
-- ---------------------------------------------------------------------
create or replace function public.approve_place_submission(
  p_submission_id uuid,
  p_place         jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sub   public.place_submissions%rowtype;
  v_place public.places%rowtype;
  v_admin uuid := auth.uid();
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_sub
  from public.place_submissions
  where id = p_submission_id
  for update;                      -- serialises double-clicks

  if not found then
    raise exception 'submission_not_found' using errcode = 'P0002';
  end if;

  -- Already approved? Return what we made last time, never a duplicate.
  if v_sub.status = 'approved' and v_sub.approved_place_id is not null then
    select * into v_place from public.places where id = v_sub.approved_place_id;
    return jsonb_build_object(
      'place_id', v_place.id, 'slug', v_place.slug, 'already_approved', true);
  end if;

  insert into public.places (
    name, description, tips, category_id,
    address, district, latitude, longitude,
    opening_hours, admission_type, admission_price,
    instagram_url, website_url, cover_image_url, source_photo,
    status, featured, created_by, updated_by
  ) values (
    p_place->>'name',
    nullif(p_place->>'description',''),
    nullif(p_place->>'tips',''),
    nullif(p_place->>'category_id','')::uuid,
    nullif(p_place->>'address',''),
    nullif(p_place->>'district',''),
    nullif(p_place->>'latitude','')::double precision,
    nullif(p_place->>'longitude','')::double precision,
    case when coalesce(p_place->>'opening_hours_label','') = '' then '{}'::jsonb
         else jsonb_build_object('label', p_place->>'opening_hours_label') end,
    coalesce(nullif(p_place->>'admission_type',''),'free'),
    nullif(p_place->>'admission_price','')::numeric,
    nullif(p_place->>'instagram_url',''),
    nullif(p_place->>'website_url',''),
    nullif(p_place->>'cover_image_url',''),
    nullif(p_place->>'source_photo',''),
    'published',                                  -- server-controlled
    coalesce((p_place->>'featured')::boolean, false),
    v_admin,
    v_admin
  )
  returning * into v_place;

  update public.place_submissions
     set status = 'approved',
         reviewed_by = v_admin,
         reviewed_at = now(),
         approved_place_id = v_place.id
   where id = v_sub.id;

  insert into public.admin_activity_logs (admin_id, action, entity_type, entity_id, metadata)
  values (v_admin, 'approved_place_submission', 'place_submission', v_sub.id,
          jsonb_build_object('place_id', v_place.id, 'slug', v_place.slug,
                             'submission_code', v_sub.submission_code));

  return jsonb_build_object('place_id', v_place.id, 'slug', v_place.slug,
                            'already_approved', false);
end;
$$;

create or replace function public.review_place_submission(
  p_submission_id uuid,
  p_status        text,
  p_reason        text default null,
  p_notes         text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_admin uuid := auth.uid();
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_status not in ('pending','needs_revision','rejected') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  update public.place_submissions
     set status        = p_status,
         reject_reason = case when p_status = 'rejected' then p_reason else reject_reason end,
         admin_notes   = coalesce(p_notes, admin_notes),
         reviewed_by   = v_admin,
         reviewed_at   = now()
   where id = p_submission_id
     and status <> 'approved';     -- approved rows are history, not a queue

  insert into public.admin_activity_logs (admin_id, action, entity_type, entity_id, metadata)
  values (v_admin, p_status || '_place_submission', 'place_submission', p_submission_id,
          jsonb_build_object('reason', p_reason));
end;
$$;

grant execute on function public.approve_place_submission(uuid, jsonb) to authenticated;
grant execute on function public.review_place_submission(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- RLS: identical posture to event_submissions.
--
-- There is NO anon policy at all. Anonymous contributions arrive through
-- /api/place-submissions, which validates server-side and inserts with the
-- service role — so the browser never touches this table, and contributor
-- contact details are unreachable without a staff session.
-- ---------------------------------------------------------------------
alter table public.place_submissions enable row level security;
alter table public.place_submissions force row level security;

drop policy if exists place_submissions_staff_read on public.place_submissions;
create policy place_submissions_staff_read on public.place_submissions
  for select to authenticated using (public.is_staff());

drop policy if exists place_submissions_staff_update on public.place_submissions;
create policy place_submissions_staff_update on public.place_submissions
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists place_submissions_admin_delete on public.place_submissions;
create policy place_submissions_admin_delete on public.place_submissions
  for delete to authenticated using (public.is_admin());

revoke all on public.place_submissions from anon, authenticated;
grant select, insert, update, delete on public.place_submissions to authenticated;

-- ---------------------------------------------------------------------
-- §15 (V1.2) parity: if a published place created from a submission is later
-- deleted, reopen the submission instead of leaving it pointing at nothing.
-- ---------------------------------------------------------------------
create or replace function public.tg_place_deleted_reopen_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.place_submissions
     set status = 'needs_revision',
         admin_notes = coalesce(admin_notes || ' | ', '')
           || 'Tempat hasil approval dihapus pada '
           || to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') || ' WIB.'
   where approved_place_id = old.id;
  return old;
end;
$$;

drop trigger if exists place_deleted_reopen_submission on public.places;
create trigger place_deleted_reopen_submission
before delete on public.places
for each row execute function public.tg_place_deleted_reopen_submission();
