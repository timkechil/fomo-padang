-- =====================================================================
-- FOMO Padang — 0007  Multiple / non-consecutive event dates
--
-- Additive and backward-compatible. start_date / end_date keep their existing
-- meaning and every existing row keeps working untouched:
--   end_date IS NULL  -> 'single'
--   end_date present  -> 'range'  (still an inclusive consecutive span)
-- A third type, 'multiple', stores its real occurrences in event_dates.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. schedule_type on events
-- ---------------------------------------------------------------------
alter table public.events
  add column if not exists schedule_type text not null default 'single';

alter table public.events
  drop constraint if exists events_schedule_type_check;
alter table public.events
  add constraint events_schedule_type_check
  check (schedule_type in ('single', 'range', 'multiple'));

comment on column public.events.schedule_type is
  'single | range | multiple. For multiple, the real occurrences live in event_dates; '
  'start_date/end_date are kept in sync as the first/last occurrence envelope.';

-- Backfill existing production rows to match what they already mean.
update public.events
   set schedule_type = case
     when end_date is null or end_date = start_date then 'single'
     else 'range'
   end
 where schedule_type = 'single'
   and end_date is not null
   and end_date <> start_date;

-- 1b. Derive schedule_type for anything that does not set it explicitly.
--
-- The column default is 'single', so a legacy insert carrying an end_date (the
-- seed script, a manual SQL fix, any external tooling) would otherwise be
-- mislabelled. 'multiple' is always honoured and never overwritten.
create or replace function public.tg_events_schedule_type()
returns trigger
language plpgsql
as $$
begin
  if new.schedule_type is distinct from 'multiple' then
    new.schedule_type := case
      when new.end_date is null or new.end_date = new.start_date then 'single'
      else 'range'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists events_schedule_type on public.events;
create trigger events_schedule_type
before insert or update of start_date, end_date, schedule_type on public.events
for each row execute function public.tg_events_schedule_type();

-- ---------------------------------------------------------------------
-- 2. event_dates — one row per actual occurrence
--
-- Relational, not a comma-separated string: the calendar and the date filters
-- need to index and join on individual dates.
-- ---------------------------------------------------------------------
create table if not exists public.event_dates (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  event_date date not null,
  created_at timestamptz not null default now(),
  constraint event_dates_unique unique (event_id, event_date)
);

comment on table public.event_dates is
  'Occurrence dates for schedule_type = multiple. One event keeps one slug, '
  'one poster and one detail page; only its dates are multiplied.';

create index if not exists event_dates_event_idx on public.event_dates (event_id);
create index if not exists event_dates_date_idx  on public.event_dates (event_date);
create index if not exists event_dates_pair_idx  on public.event_dates (event_date, event_id);

-- ---------------------------------------------------------------------
-- 3. Keep start_date / end_date as the first/last occurrence envelope.
--
-- This is what makes the feature backward-compatible: every existing query
-- that prefilters on start_date / effective_end_date keeps returning the right
-- candidate rows, and "Acara sudah selesai" automatically keys off the LAST
-- occurrence rather than the first. Exact per-day matching is then applied on
-- top of that envelope.
-- ---------------------------------------------------------------------
create or replace function public.sync_event_date_envelope(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_min date;
  v_max date;
begin
  select min(event_date), max(event_date)
    into v_min, v_max
    from public.event_dates
   where event_id = p_event_id;

  if v_min is null then
    return;                       -- no occurrences yet: leave the row as-is
  end if;

  update public.events
     set start_date = v_min,
         end_date   = case when v_max > v_min then v_max else null end
   where id = p_event_id
     and schedule_type = 'multiple';
end;
$$;

create or replace function public.tg_event_dates_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.sync_event_date_envelope(coalesce(new.event_id, old.event_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists event_dates_sync on public.event_dates;
create trigger event_dates_sync
after insert or update or delete on public.event_dates
for each row execute function public.tg_event_dates_sync();

-- ---------------------------------------------------------------------
-- 4. RLS — mirrors event_categories exactly: visible with its parent event.
-- ---------------------------------------------------------------------
alter table public.event_dates enable row level security;

drop policy if exists event_dates_public_read on public.event_dates;
create policy event_dates_public_read on public.event_dates
  for select to anon, authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and (e.status = 'published' or public.is_staff())
  ));

drop policy if exists event_dates_staff_write on public.event_dates;
create policy event_dates_staff_write on public.event_dates
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant select on public.event_dates to anon, authenticated;
grant insert, update, delete on public.event_dates to authenticated;

-- ---------------------------------------------------------------------
-- 5. Contributor submissions can propose a schedule too.
--
-- A plain date[] is enough here: event_submissions is a staging table that is
-- never queried by date. The relational event_dates rows are created only at
-- approval, so contributor data still cannot bypass moderation.
-- ---------------------------------------------------------------------
alter table public.event_submissions
  add column if not exists schedule_type text not null default 'single';

alter table public.event_submissions
  drop constraint if exists event_submissions_schedule_type_check;
alter table public.event_submissions
  add constraint event_submissions_schedule_type_check
  check (schedule_type in ('single', 'range', 'multiple'));

alter table public.event_submissions
  add column if not exists occurrence_dates date[];

alter table public.event_submissions
  drop constraint if exists event_submissions_occurrence_len;
alter table public.event_submissions
  add constraint event_submissions_occurrence_len
  check (occurrence_dates is null or array_length(occurrence_dates, 1) <= 60);

-- ---------------------------------------------------------------------
-- 6. approve_submission(): carry occurrence dates onto the new event.
--
-- Redefined in full (Postgres has no partial function patch). Identical to the
-- 0005 version except for schedule_type and the event_dates insert. Still
-- locks FOR UPDATE and still returns the existing event when called twice, so
-- a double-clicked Approve creates neither a duplicate event nor duplicate dates.
-- ---------------------------------------------------------------------
create or replace function public.approve_submission(
  p_submission_id uuid,
  p_event         jsonb,
  p_category_ids  uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sub    public.event_submissions%rowtype;
  v_event  public.events%rowtype;
  v_admin  uuid := auth.uid();
  v_cat    uuid;
  v_first  boolean := true;
  v_dates  date[];
  v_date   date;
  v_type   text;
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_sub
  from public.event_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'submission_not_found' using errcode = 'P0002';
  end if;

  if v_sub.status = 'approved' and v_sub.approved_event_id is not null then
    select * into v_event from public.events where id = v_sub.approved_event_id;
    return jsonb_build_object(
      'event_id', v_event.id, 'slug', v_event.slug, 'already_approved', true);
  end if;

  v_type := coalesce(nullif(p_event->>'schedule_type', ''), 'single');

  -- dates come from the admin's edited payload, falling back to what the
  -- contributor proposed
  if p_event ? 'dates' and jsonb_typeof(p_event->'dates') = 'array' then
    select array_agg((value #>> '{}')::date order by (value #>> '{}')::date)
      into v_dates
      from jsonb_array_elements(p_event->'dates')
     where nullif(value #>> '{}', '') is not null;
  else
    v_dates := v_sub.occurrence_dates;
  end if;

  insert into public.events (
    title, description, organizer_id,
    start_date, end_date, start_time, end_time,
    venue_name, address, district, latitude, longitude,
    price_type, price_amount, ticket_url, source_url, instagram_url, poster_url,
    registration_required, audience,
    status, featured, submitted_from, contributor_name, schedule_type,
    published_at, created_by, updated_by
  ) values (
    p_event->>'title',
    nullif(p_event->>'description',''),
    nullif(p_event->>'organizer_id','')::uuid,
    case when v_type = 'multiple' and v_dates is not null
         then v_dates[1] else (p_event->>'start_date')::date end,
    case when v_type = 'multiple' and v_dates is not null
         then (case when array_length(v_dates,1) > 1
                    then v_dates[array_length(v_dates,1)] else null end)
         when v_type = 'single' then null
         else nullif(p_event->>'end_date','')::date end,
    nullif(p_event->>'start_time','')::time,
    nullif(p_event->>'end_time','')::time,
    nullif(p_event->>'venue_name',''),
    nullif(p_event->>'address',''),
    nullif(p_event->>'district',''),
    nullif(p_event->>'latitude','')::double precision,
    nullif(p_event->>'longitude','')::double precision,
    coalesce(nullif(p_event->>'price_type',''),'free'),
    nullif(p_event->>'price_amount','')::numeric,
    nullif(p_event->>'ticket_url',''),
    nullif(p_event->>'source_url',''),
    nullif(p_event->>'instagram_url',''),
    nullif(p_event->>'poster_url',''),
    coalesce((p_event->>'registration_required')::boolean, false),
    nullif(p_event->>'audience',''),
    'published',
    coalesce((p_event->>'featured')::boolean, false),
    v_sub.id,
    v_sub.contributor_name,
    v_type,
    now(),
    v_admin,
    v_admin
  )
  returning * into v_event;

  if v_type = 'multiple' and v_dates is not null then
    foreach v_date in array v_dates loop
      insert into public.event_dates (event_id, event_date)
      values (v_event.id, v_date)
      on conflict (event_id, event_date) do nothing;
    end loop;
  end if;

  foreach v_cat in array coalesce(p_category_ids, '{}') loop
    insert into public.event_categories (event_id, category_id, is_primary)
    values (v_event.id, v_cat, v_first)
    on conflict do nothing;
    v_first := false;
  end loop;

  if v_sub.source_url is not null then
    insert into public.event_sources (event_id, url, platform, is_primary)
    values (v_event.id, v_sub.source_url, public.detect_platform(v_sub.source_url), true);
  end if;

  update public.event_submissions
     set status = 'approved',
         reviewed_by = v_admin,
         reviewed_at = now(),
         approved_event_id = v_event.id
   where id = v_sub.id;

  insert into public.admin_activity_logs (admin_id, action, entity_type, entity_id, metadata)
  values (v_admin, 'approved_submission', 'event_submission', v_sub.id,
          jsonb_build_object('event_id', v_event.id, 'slug', v_event.slug,
                             'submission_code', v_sub.submission_code,
                             'schedule_type', v_type));

  return jsonb_build_object('event_id', v_event.id, 'slug', v_event.slug,
                            'already_approved', false);
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Replace an event's occurrence set in one call (used by the admin form).
-- Idempotent: saving the same dates twice leaves the same rows.
-- ---------------------------------------------------------------------
create or replace function public.set_event_dates(
  p_event_id uuid,
  p_dates    date[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_date date;
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  delete from public.event_dates
   where event_id = p_event_id
     and (p_dates is null or not (event_date = any(p_dates)));

  if p_dates is not null then
    foreach v_date in array p_dates loop
      insert into public.event_dates (event_id, event_date)
      values (p_event_id, v_date)
      on conflict (event_id, event_date) do nothing;
    end loop;
  end if;

  perform public.sync_event_date_envelope(p_event_id);
end;
$$;

grant execute on function public.set_event_dates(uuid, date[]) to authenticated;
grant execute on function public.sync_event_date_envelope(uuid) to authenticated;
