-- =====================================================================
-- FOMO Padang — 0001 schema
-- Postgres / Supabase. Timezone of record for the product: Asia/Jakarta.
-- =====================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";       -- fuzzy search on titles/venues

-- ---------------------------------------------------------------------
-- profiles : one row per staff member in auth.users
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'editor',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin','editor'))
);

comment on table public.profiles is
  'Staff accounts. There is no public sign-up: rows are created by an admin (see README).';

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  type        text not null default 'event',
  color       text not null default '#FD7318',
  icon        text,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_type_check check (type in ('event','place')),
  constraint categories_color_check check (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- ---------------------------------------------------------------------
-- organizers
-- ---------------------------------------------------------------------
create table if not exists public.organizers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  instagram_url text,
  website_url   text,
  contact_url   text,
  logo_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- event_submissions : community inbox. NEVER public, NEVER auto-published.
-- ---------------------------------------------------------------------
create table if not exists public.event_submissions (
  id                    uuid primary key default gen_random_uuid(),
  submission_code       text not null unique,

  event_name            text not null,
  source_url            text not null,

  organizer_name        text,
  category_id           uuid references public.categories(id) on delete set null,

  start_date            date,
  end_date              date,
  start_time            time,
  end_time              time,

  venue_name            text,
  address               text,
  district              text,
  latitude              double precision,
  longitude             double precision,

  price_type            text,
  price_amount          numeric(12,2),
  ticket_url            text,

  description           text,
  instagram_url         text,
  poster_url            text,

  registration_required boolean,
  audience              text,

  contributor_name      text,
  contributor_contact   text,

  status                text not null default 'pending',
  admin_notes           text,
  reject_reason         text,

  approved_event_id     uuid,                 -- FK added after events exists
  reviewed_by           uuid references public.profiles(id) on delete set null,
  reviewed_at           timestamptz,

  submitted_ip_hash     text,                 -- salted hash, for rate limiting only
  user_agent            text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint submissions_status_check
    check (status in ('pending','needs_revision','approved','rejected')),
  constraint submissions_price_type_check
    check (price_type is null or price_type in ('free','paid')),
  constraint submissions_price_amount_check
    check (price_amount is null or price_amount >= 0),
  constraint submissions_dates_check
    check (end_date is null or start_date is null or end_date >= start_date),
  constraint submissions_lat_check
    check (latitude is null or (latitude between -90 and 90)),
  constraint submissions_lng_check
    check (longitude is null or (longitude between -180 and 180)),
  constraint submissions_name_len check (char_length(event_name) between 3 and 180),
  constraint submissions_source_len check (char_length(source_url) between 8 and 600),
  constraint submissions_desc_len check (description is null or char_length(description) <= 4000)
);

-- ---------------------------------------------------------------------
-- events : the public source of truth
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  title                 text not null,
  description           text,

  organizer_id          uuid references public.organizers(id) on delete set null,

  start_date            date not null,
  end_date              date,
  start_time            time,
  end_time              time,

  venue_name            text,
  address               text,
  district              text,
  latitude              double precision,
  longitude             double precision,

  price_type            text not null default 'free',
  price_amount          numeric(12,2),

  ticket_url            text,
  source_url            text,
  instagram_url         text,
  poster_url            text,

  registration_required boolean not null default false,
  audience              text,

  status                text not null default 'draft',
  featured              boolean not null default false,

  submitted_from        uuid references public.event_submissions(id) on delete set null,
  published_at          timestamptz,

  created_by            uuid references public.profiles(id) on delete set null,
  updated_by            uuid references public.profiles(id) on delete set null,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- coalesce(end_date, start_date), stored so date-overlap queries are a
  -- simple indexed BETWEEN instead of an OR across nullable columns.
  effective_end_date date generated always as (coalesce(end_date, start_date)) stored,

  search_tsv tsvector generated always as (
    to_tsvector('simple',
      coalesce(title,'') || ' ' ||
      coalesce(description,'') || ' ' ||
      coalesce(venue_name,'') || ' ' ||
      coalesce(district,''))
  ) stored,

  constraint events_status_check
    check (status in ('draft','published','cancelled','archived')),
  constraint events_price_type_check
    check (price_type in ('free','paid')),
  constraint events_price_amount_check
    check (price_amount is null or price_amount >= 0),
  constraint events_paid_needs_amount
    check (price_type <> 'paid' or price_amount is not null),
  constraint events_dates_check
    check (end_date is null or end_date >= start_date),
  constraint events_lat_check
    check (latitude is null or (latitude between -90 and 90)),
  constraint events_lng_check
    check (longitude is null or (longitude between -180 and 180)),
  constraint events_title_len check (char_length(title) between 3 and 180),
  constraint events_published_needs_timestamp
    check (status <> 'published' or published_at is not null)
);

alter table public.event_submissions
  drop constraint if exists event_submissions_approved_event_fk;
alter table public.event_submissions
  add constraint event_submissions_approved_event_fk
  foreign key (approved_event_id) references public.events(id) on delete set null;

-- one submission can only ever produce one event
create unique index if not exists events_submitted_from_uniq
  on public.events (submitted_from) where submitted_from is not null;

-- ---------------------------------------------------------------------
-- event_categories : an event can carry several categories
-- ---------------------------------------------------------------------
create table if not exists public.event_categories (
  event_id    uuid not null references public.events(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary  boolean not null default false,
  primary key (event_id, category_id)
);

-- exactly one primary category per event
create unique index if not exists event_categories_one_primary
  on public.event_categories (event_id) where is_primary;

-- ---------------------------------------------------------------------
-- event_sources : where the information came from (IG, TikTok, gov site…)
-- ---------------------------------------------------------------------
create table if not exists public.event_sources (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  url        text not null,
  platform   text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint event_sources_url_len check (char_length(url) between 8 and 600)
);

-- ---------------------------------------------------------------------
-- places : permanent local spots
-- ---------------------------------------------------------------------
create table if not exists public.places (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  description     text,
  tips            text,

  category_id     uuid references public.categories(id) on delete set null,

  address         text,
  district        text,
  latitude        double precision,
  longitude       double precision,

  opening_hours   jsonb not null default '{}'::jsonb,
  admission_type  text not null default 'free',
  admission_price numeric(12,2),

  instagram_url   text,
  website_url     text,
  cover_image_url text,

  status          text not null default 'draft',
  featured        boolean not null default false,

  created_by      uuid references public.profiles(id) on delete set null,
  updated_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  search_tsv tsvector generated always as (
    to_tsvector('simple',
      coalesce(name,'') || ' ' ||
      coalesce(description,'') || ' ' ||
      coalesce(address,'') || ' ' ||
      coalesce(district,''))
  ) stored,

  constraint places_status_check
    check (status in ('draft','published','temporarily_closed','archived')),
  constraint places_admission_type_check
    check (admission_type in ('free','paid')),
  constraint places_admission_price_check
    check (admission_price is null or admission_price >= 0),
  constraint places_lat_check check (latitude is null or (latitude between -90 and 90)),
  constraint places_lng_check check (longitude is null or (longitude between -180 and 180)),
  constraint places_name_len check (char_length(name) between 2 and 180)
);

-- ---------------------------------------------------------------------
-- plans / plan_items : My Plan stays local, but shared plans get a row
-- ---------------------------------------------------------------------
create table if not exists public.plans (
  id         uuid primary key default gen_random_uuid(),
  share_id   text not null unique,
  title      text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint plans_share_id_len check (char_length(share_id) between 6 and 32)
);

create table if not exists public.plan_items (
  id        uuid primary key default gen_random_uuid(),
  plan_id   uuid not null references public.plans(id) on delete cascade,
  kind      text not null default 'event',
  event_id  uuid references public.events(id) on delete cascade,
  place_id  uuid references public.places(id) on delete cascade,
  day_date  date,
  time_label text,
  note      text,
  position  integer not null default 0,
  constraint plan_items_kind_check check (kind in ('event','place')),
  constraint plan_items_target_check check (
    (kind = 'event' and event_id is not null and place_id is null) or
    (kind = 'place' and place_id is not null and event_id is null)
  ),
  constraint plan_items_note_len check (note is null or char_length(note) <= 240)
);

-- ---------------------------------------------------------------------
-- admin_activity_logs : accountability for moderation
-- ---------------------------------------------------------------------
create table if not exists public.admin_activity_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------
create index if not exists events_status_idx        on public.events (status);
create index if not exists events_start_date_idx    on public.events (start_date);
create index if not exists events_end_date_idx      on public.events (end_date);
create index if not exists events_featured_idx      on public.events (featured) where featured;
create index if not exists events_status_dates_idx  on public.events (status, start_date, effective_end_date);
create index if not exists events_effective_end_idx  on public.events (effective_end_date);
create index if not exists events_district_idx      on public.events (district);
create index if not exists events_organizer_idx     on public.events (organizer_id);
create index if not exists events_search_idx        on public.events using gin (search_tsv);
create index if not exists events_title_trgm_idx    on public.events using gin (title gin_trgm_ops);

create index if not exists submissions_status_idx     on public.event_submissions (status);
create index if not exists submissions_created_at_idx on public.event_submissions (created_at desc);
create index if not exists submissions_ip_idx         on public.event_submissions (submitted_ip_hash, created_at desc);

create index if not exists places_status_idx      on public.places (status);
create index if not exists places_district_idx    on public.places (district);
create index if not exists places_search_idx      on public.places using gin (search_tsv);

create index if not exists event_categories_cat_idx on public.event_categories (category_id);
create index if not exists event_sources_event_idx  on public.event_sources (event_id);
create index if not exists plan_items_plan_idx      on public.plan_items (plan_id, position);
create index if not exists admin_logs_created_idx   on public.admin_activity_logs (created_at desc);

-- ---------------------------------------------------------------------
-- human-friendly submission codes: FOMO-000282, FOMO-000283, …
-- (a sequence avoids the race condition of "select max()+1")
-- ---------------------------------------------------------------------
create sequence if not exists public.submission_code_seq start with 282;
