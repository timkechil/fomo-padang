-- =====================================================================
-- FOMO Padang — 0005  V1.2 revisions
--
-- Additive only. Every new column is nullable or defaulted, so existing
-- production rows stay valid and nothing needs reseeding.
-- =====================================================================

-- ---------------------------------------------------------------------
-- §14  Places: where the cover photo came from.
-- Free text, not a URL column: "Photo by Tim FOMO" is a legitimate value.
-- ---------------------------------------------------------------------
alter table public.places
  add column if not exists source_photo text;

alter table public.places
  drop constraint if exists places_source_photo_len;
alter table public.places
  add constraint places_source_photo_len
  check (source_photo is null or char_length(source_photo) <= 300);

comment on column public.places.source_photo is
  'Attribution for cover_image_url. URL or free text. Nullable by design.';

-- ---------------------------------------------------------------------
-- §16  Events: public contributor credit.
--
-- `event_submissions` is staff-only under RLS, so a public event page cannot
-- read the originating submission. The public *name* is therefore copied onto
-- the event at approval time. Contact details are deliberately NOT copied —
-- they stay in the submission, visible to staff only.
-- ---------------------------------------------------------------------
alter table public.events
  add column if not exists contributor_name text;

alter table public.events
  drop constraint if exists events_contributor_name_len;
alter table public.events
  add constraint events_contributor_name_len
  check (contributor_name is null or char_length(contributor_name) <= 120);

comment on column public.events.contributor_name is
  'Public credit copied from the approved submission. Never contact details.';

-- Backfill events already approved from a community submission.
update public.events e
   set contributor_name = s.contributor_name
  from public.event_submissions s
 where e.submitted_from = s.id
   and e.contributor_name is null
   and s.contributor_name is not null;

-- ---------------------------------------------------------------------
-- §16  approve_submission(): carry the contributor name onto the event.
--
-- Redefined in full because Postgres has no partial function patch. The body
-- is the 0002 version plus contributor_name — the lock, the idempotency check
-- and the activity log are unchanged.
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
  for update;

  if not found then
    raise exception 'submission_not_found' using errcode = 'P0002';
  end if;

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
    status, featured, submitted_from, contributor_name,
    published_at, created_by, updated_by
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
    'published',
    coalesce((p_event->>'featured')::boolean, false),
    v_sub.id,
    v_sub.contributor_name,          -- public name only
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

-- ---------------------------------------------------------------------
-- §12  Additional place categories.
--
-- The existing 'spot' row is reused and only relabelled (§11 Local Spot →
-- Spot Lokal); its slug is untouched so existing places keep their category.
-- ---------------------------------------------------------------------
update public.categories
   set name = 'Spot Lokal'
 where slug = 'spot' and name <> 'Spot Lokal';

insert into public.categories (name, slug, type, color, sort_order, active)
values
  ('Tempat Makan',      'tempat-makan',      'place', '#FD7318', 12, true),
  ('Tempat Nongkrong',  'tempat-nongkrong',  'place', '#6096C9', 13, true),
  ('Toko Oleh-Oleh',    'toko-oleh-oleh',    'place', '#019736', 14, true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- §15  Permanent event delete — admin only.
--
-- The delete policy from 0003 (`events_admin_delete`, using is_admin()) is
-- already correct and is left untouched. What was missing is that deleting an
-- event would orphan rows that reference it, so:
--   * event_categories / event_sources already cascade (0001)
--   * plan_items already cascade (0001)
--   * event_submissions.approved_event_id is ON DELETE SET NULL (0001), which
--     preserves the moderation record while dropping the dead pointer
-- The one thing to repair is the submission's status: a submission whose event
-- has been permanently deleted should not still read "approved" and point at
-- nothing, or its row can never be re-reviewed.
-- ---------------------------------------------------------------------
create or replace function public.tg_event_deleted_reopen_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.submitted_from is not null then
    update public.event_submissions
       set status = 'needs_revision',
           admin_notes = coalesce(admin_notes || ' | ', '')
             || 'Event hasil approval dihapus permanen pada '
             || to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI')
             || ' WIB.'
     where id = old.submitted_from;
  end if;
  return old;
end;
$$;

drop trigger if exists event_deleted_reopen_submission on public.events;
create trigger event_deleted_reopen_submission
before delete on public.events
for each row execute function public.tg_event_deleted_reopen_submission();

-- ---------------------------------------------------------------------
-- §8  Audience "Dewasa"
--
-- No migration needed for the value itself: events.audience is plain text with
-- no CHECK constraint (0001), so the new option is accepted as-is. The allowed
-- list is enforced in Zod (src/lib/validation.ts) and surfaced from
-- src/lib/constants.ts. Recorded here so the absence of a change is deliberate
-- rather than an oversight.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- §11/§12  search_public(): return the place's real category instead of the
-- hard-coded 'Local Spot' string, so search results label a warung as
-- "Tempat Makan" and the retired wording disappears from every surface.
-- Identical to the 0002 definition apart from the place branch's join.
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
      coalesce(pc.name, 'Spot Lokal')::text,
      coalesce(pc.color, '#161616')::text,
      greatest(
        ts_rank(p.search_tsv, websearch_to_tsquery('simple', (select q from needle))),
        similarity(p.name, (select q from needle))
      )::real
    from public.places p
    left join public.categories pc on pc.id = p.category_id
    where p.status in ('published','temporarily_closed')
      and (
        p.search_tsv @@ websearch_to_tsquery('simple', (select q from needle))
        or p.name     ilike '%' || (select q from needle) || '%'
        or p.district ilike '%' || (select q from needle) || '%'
        or p.address  ilike '%' || (select q from needle) || '%'
        or coalesce(pc.name,'') ilike '%' || (select q from needle) || '%'
      )
  ) results
  where (select q from needle) <> ''
  order by kind, rank desc nulls last, start_date nulls last
  limit greatest(1, least(coalesce(max_results, 40), 100));
$$;

grant execute on function public.search_public(text, integer) to anon, authenticated;
