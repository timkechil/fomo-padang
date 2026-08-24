-- =====================================================================
-- FOMO Padang — 0002 functions, triggers, RPCs
-- =====================================================================

-- ---------------------------------------------------------------------
-- Authorization helpers.
-- SECURITY DEFINER so RLS policies on `profiles` can call them without
-- recursing into `profiles` policies.
-- ---------------------------------------------------------------------
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','editor')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.my_role() from public;
grant execute on function public.my_role()  to authenticated;
grant execute on function public.is_staff() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------
-- Local time. Everything the product calls "today" is Padang time (WIB).
-- ---------------------------------------------------------------------
create or replace function public.wib_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

grant execute on function public.wib_today() to anon, authenticated;

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','categories','organizers','events','event_submissions','places'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.tg_set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Slugs
-- ---------------------------------------------------------------------
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(input,'')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- padang-coffee-week-2026 → padang-coffee-week-2026-2 when taken
create or replace function public.unique_slug(base text, target_table text, current_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  root      text := nullif(public.slugify(base), '');
  candidate text;
  n         integer := 1;
  taken     boolean;
begin
  if root is null then
    root := 'fomo-' || substr(replace(gen_random_uuid()::text,'-',''), 1, 8);
  end if;
  root := left(root, 90);
  candidate := root;

  loop
    execute format(
      'select exists (select 1 from public.%I where slug = $1 and ($2::uuid is null or id <> $2))',
      target_table)
    into taken using candidate, current_id;

    exit when not taken;
    n := n + 1;
    candidate := root || '-' || n;
  end loop;

  return candidate;
end;
$$;

create or replace function public.tg_events_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or length(trim(new.slug)) = 0 then
    new.slug := public.unique_slug(new.title, 'events', new.id);
  else
    new.slug := public.unique_slug(new.slug, 'events', new.id);
  end if;
  return new;
end;
$$;

create or replace function public.tg_places_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or length(trim(new.slug)) = 0 then
    new.slug := public.unique_slug(new.name, 'places', new.id);
  else
    new.slug := public.unique_slug(new.slug, 'places', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists events_slug on public.events;
create trigger events_slug before insert or update of slug, title on public.events
for each row execute function public.tg_events_slug();

drop trigger if exists places_slug on public.places;
create trigger places_slug before insert or update of slug, name on public.places
for each row execute function public.tg_places_slug();

-- organizers get a slug too
create or replace function public.tg_organizers_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or length(trim(new.slug)) = 0 then
    new.slug := public.unique_slug(new.name, 'organizers', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists organizers_slug on public.organizers;
create trigger organizers_slug before insert on public.organizers
for each row execute function public.tg_organizers_slug();

-- ---------------------------------------------------------------------
-- Submission codes — assigned by the database, never by the client
-- ---------------------------------------------------------------------
create or replace function public.tg_submission_code()
returns trigger
language plpgsql
as $$
begin
  -- the client cannot choose its own code, ever
  new.submission_code := 'FOMO-' || lpad(nextval('public.submission_code_seq')::text, 6, '0');
  new.status          := 'pending';
  new.reviewed_by     := null;
  new.reviewed_at     := null;
  new.approved_event_id := null;
  return new;
end;
$$;

drop trigger if exists submission_code on public.event_submissions;
create trigger submission_code before insert on public.event_submissions
for each row execute function public.tg_submission_code();

-- ---------------------------------------------------------------------
-- published_at bookkeeping
-- ---------------------------------------------------------------------
create or replace function public.tg_events_publish_stamp()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if tg_op = 'UPDATE' and new.status <> 'published' and old.status = 'published' then
    -- keep the historical published_at; unpublishing is reversible
    null;
  end if;
  return new;
end;
$$;

drop trigger if exists events_publish_stamp on public.events;
create trigger events_publish_stamp before insert or update on public.events
for each row execute function public.tg_events_publish_stamp();

-- ---------------------------------------------------------------------
-- APPROVE: submission → event, in one transaction, idempotent.
-- Called from a server action after Zod validation. Runs as the caller's
-- identity check (is_staff) but with definer rights so it can write the
-- activity log.
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
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_sub
  from public.event_submissions
  where id = p_submission_id
  for update;                      -- serialises double-clicks

  if not found then
    raise exception 'submission_not_found' using errcode = 'P0002';
  end if;

  -- Already approved? Return the event we made last time instead of a duplicate.
  if v_sub.status = 'approved' and v_sub.approved_event_id is not null then
    select * into v_event from public.events where id = v_sub.approved_event_id;
    return jsonb_build_object(
      'event_id', v_event.id, 'slug', v_event.slug, 'already_approved', true);
  end if;

  insert into public.events (
    title, description, organizer_id,
    start_date, end_date, start_time, end_time,
    venue_name, address, district, latitude, longitude,
    price_type, price_amount, ticket_url, source_url, instagram_url, poster_url,
    registration_required, audience,
    status, featured, submitted_from, published_at, created_by, updated_by
  ) values (
    p_event->>'title',
    nullif(p_event->>'description',''),
    nullif(p_event->>'organizer_id','')::uuid,
    (p_event->>'start_date')::date,
    nullif(p_event->>'end_date','')::date,
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
    'published',                                  -- status: server-controlled
    coalesce((p_event->>'featured')::boolean, false),
    v_sub.id,
    now(),
    v_admin,
    v_admin
  )
  returning * into v_event;

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
                             'submission_code', v_sub.submission_code));

  return jsonb_build_object('event_id', v_event.id, 'slug', v_event.slug,
                            'already_approved', false);
end;
$$;

create or replace function public.detect_platform(url text)
returns text
language sql
immutable
as $$
  select case
    when url ilike '%instagram.com%' then 'instagram'
    when url ilike '%tiktok.com%'    then 'tiktok'
    when url ilike '%facebook.com%'  then 'facebook'
    when url ilike '%.go.id%'        then 'government'
    else 'web'
  end;
$$;

-- ---------------------------------------------------------------------
-- Moderation status changes (reject / needs revision) + logging
-- ---------------------------------------------------------------------
create or replace function public.review_submission(
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

  update public.event_submissions
     set status        = p_status,
         reject_reason = case when p_status = 'rejected' then p_reason else reject_reason end,
         admin_notes   = coalesce(p_notes, admin_notes),
         reviewed_by   = v_admin,
         reviewed_at   = now()
   where id = p_submission_id
     and status <> 'approved';        -- approved submissions are history, not a queue

  insert into public.admin_activity_logs (admin_id, action, entity_type, entity_id, metadata)
  values (v_admin, p_status || '_submission', 'event_submission', p_submission_id,
          jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.log_admin_action(
  p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  insert into public.admin_activity_logs (admin_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata,'{}'::jsonb));
end;
$$;

grant execute on function public.approve_submission(uuid, jsonb, uuid[]) to authenticated;
grant execute on function public.review_submission(uuid, text, text, text) to authenticated;
grant execute on function public.log_admin_action(text, text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Public search across events + places (published rows only).
-- SECURITY INVOKER: RLS still applies, so it can never leak drafts.
-- ---------------------------------------------------------------------
create or replace function public.search_public(q text, max_results integer default 40)
returns table (
  kind text, id uuid, slug text, title text, subtitle text,
  start_date date, start_time time, district text,
  price_type text, price_amount numeric, poster_url text,
  category_name text, category_color text, rank real
)
language sql
stable
as $$
  with needle as (select coalesce(nullif(trim(q),''),'') as q)
  select * from (
    select
      'event'::text as kind, e.id, e.slug, e.title,
      coalesce(e.venue_name, e.district) as subtitle,
      e.start_date, e.start_time, e.district,
      e.price_type, e.price_amount, e.poster_url,
      c.name as category_name, c.color as category_color,
      greatest(
        ts_rank(e.search_tsv, websearch_to_tsquery('simple', (select q from needle))),
        similarity(e.title, (select q from needle))
      )::real as rank
    from public.events e
    left join public.event_categories ec on ec.event_id = e.id and ec.is_primary
    left join public.categories c on c.id = ec.category_id
    where e.status = 'published'
      and (
        e.search_tsv @@ websearch_to_tsquery('simple', (select q from needle))
        or e.title      ilike '%' || (select q from needle) || '%'
        or e.venue_name ilike '%' || (select q from needle) || '%'
        or e.district   ilike '%' || (select q from needle) || '%'
        or exists (
          select 1 from public.organizers o
          where o.id = e.organizer_id and o.name ilike '%' || (select q from needle) || '%')
        or exists (
          select 1 from public.event_categories ec2
          join public.categories c2 on c2.id = ec2.category_id
          where ec2.event_id = e.id and c2.name ilike '%' || (select q from needle) || '%')
      )

    union all

    select
      'place'::text as kind, p.id, p.slug, p.name as title,
      coalesce(p.district, p.address) as subtitle,
      null::date, null::time, p.district,
      p.admission_type as price_type, p.admission_price, p.cover_image_url,
      'Local Spot'::text, '#161616'::text,
      greatest(
        ts_rank(p.search_tsv, websearch_to_tsquery('simple', (select q from needle))),
        similarity(p.name, (select q from needle))
      )::real
    from public.places p
    where p.status in ('published','temporarily_closed')
      and (
        p.search_tsv @@ websearch_to_tsquery('simple', (select q from needle))
        or p.name     ilike '%' || (select q from needle) || '%'
        or p.district ilike '%' || (select q from needle) || '%'
        or p.address  ilike '%' || (select q from needle) || '%'
      )
  ) results
  where (select q from needle) <> ''
  order by kind, rank desc nulls last, start_date nulls last
  limit greatest(1, least(coalesce(max_results, 40), 100));
$$;

grant execute on function public.search_public(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Shared plans. Readable only by share_id, never enumerable.
-- ---------------------------------------------------------------------
create or replace function public.get_shared_plan(p_share_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_plan public.plans%rowtype; v_items jsonb;
begin
  select * into v_plan from public.plans
   where share_id = p_share_id
     and (expires_at is null or expires_at > now());
  if not found then return null; end if;

  select coalesce(jsonb_agg(item order by item->>'day_date', (item->>'position')::int), '[]'::jsonb)
    into v_items
  from (
    select jsonb_build_object(
      'kind', pi.kind, 'position', pi.position, 'day_date', pi.day_date,
      'time_label', pi.time_label, 'note', pi.note,
      'title', coalesce(e.title, pl.name),
      'slug',  coalesce(e.slug,  pl.slug),
      'venue', coalesce(e.venue_name, pl.address),
      'district', coalesce(e.district, pl.district)
    ) as item
    from public.plan_items pi
    left join public.events e on e.id = pi.event_id and e.status = 'published'
    left join public.places pl on pl.id = pi.place_id and pl.status in ('published','temporarily_closed')
    where pi.plan_id = v_plan.id
  ) s;

  return jsonb_build_object(
    'share_id', v_plan.share_id, 'title', v_plan.title,
    'created_at', v_plan.created_at, 'items', v_items);
end;
$$;

grant execute on function public.get_shared_plan(text) to anon, authenticated;
