-- =====================================================================
-- FOMO Padang — 0003 Row Level Security
--
-- Principle:
--   anon      → can read published events/places/categories/organizers. Nothing else.
--   staff     → can read and manage the catalogue and the moderation queue.
--   admin     → additionally may hard-delete and manage staff roles.
--   the public submission endpoint does NOT rely on anon insert rights;
--   it runs server-side with the service role after validation.
-- =====================================================================

alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.organizers          enable row level security;
alter table public.events              enable row level security;
alter table public.event_categories    enable row level security;
alter table public.event_sources       enable row level security;
alter table public.event_submissions   enable row level security;
alter table public.places              enable row level security;
alter table public.plans               enable row level security;
alter table public.plan_items          enable row level security;
alter table public.admin_activity_logs enable row level security;

-- force RLS also for table owners reached through PostgREST
alter table public.event_submissions   force row level security;
alter table public.profiles            force row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());   -- cannot self-promote

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- categories : public reference data
-- ---------------------------------------------------------------------
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select to anon, authenticated
  using (active or public.is_staff());

drop policy if exists categories_staff_write on public.categories;
create policy categories_staff_write on public.categories
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- organizers : public profile info
-- ---------------------------------------------------------------------
drop policy if exists organizers_public_read on public.organizers;
create policy organizers_public_read on public.organizers
  for select to anon, authenticated using (true);

drop policy if exists organizers_staff_write on public.organizers;
create policy organizers_staff_write on public.organizers
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- events : only published rows are public
-- ---------------------------------------------------------------------
drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select to anon, authenticated
  using (status = 'published' or public.is_staff());

drop policy if exists events_staff_insert on public.events;
create policy events_staff_insert on public.events
  for insert to authenticated with check (public.is_staff());

drop policy if exists events_staff_update on public.events;
create policy events_staff_update on public.events
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- deletion is an admin-only escape hatch; normal flow is status = 'archived'
drop policy if exists events_admin_delete on public.events;
create policy events_admin_delete on public.events
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- event_categories / event_sources : visible with their parent event
-- ---------------------------------------------------------------------
drop policy if exists event_categories_public_read on public.event_categories;
create policy event_categories_public_read on public.event_categories
  for select to anon, authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and (e.status = 'published' or public.is_staff())
  ));

drop policy if exists event_categories_staff_write on public.event_categories;
create policy event_categories_staff_write on public.event_categories
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists event_sources_public_read on public.event_sources;
create policy event_sources_public_read on public.event_sources
  for select to anon, authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and (e.status = 'published' or public.is_staff())
  ));

drop policy if exists event_sources_staff_write on public.event_sources;
create policy event_sources_staff_write on public.event_sources
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- event_submissions : the moderation inbox.
-- No anon policy at all — not readable, not writable from the browser.
-- Inserts happen in /api/submissions with the service role.
-- ---------------------------------------------------------------------
drop policy if exists submissions_staff_read on public.event_submissions;
create policy submissions_staff_read on public.event_submissions
  for select to authenticated using (public.is_staff());

drop policy if exists submissions_staff_update on public.event_submissions;
create policy submissions_staff_update on public.event_submissions
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists submissions_admin_delete on public.event_submissions;
create policy submissions_admin_delete on public.event_submissions
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- places
-- ---------------------------------------------------------------------
drop policy if exists places_public_read on public.places;
create policy places_public_read on public.places
  for select to anon, authenticated
  using (status in ('published','temporarily_closed') or public.is_staff());

drop policy if exists places_staff_write on public.places;
create policy places_staff_write on public.places
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- plans / plan_items : reachable only through get_shared_plan(share_id)
-- ---------------------------------------------------------------------
drop policy if exists plans_staff_read on public.plans;
create policy plans_staff_read on public.plans
  for select to authenticated using (public.is_staff());

drop policy if exists plan_items_staff_read on public.plan_items;
create policy plan_items_staff_read on public.plan_items
  for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------
-- admin_activity_logs : staff can read, nobody can edit history
-- ---------------------------------------------------------------------
drop policy if exists admin_logs_staff_read on public.admin_activity_logs;
create policy admin_logs_staff_read on public.admin_activity_logs
  for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------
-- Table grants. RLS filters rows; grants decide which verbs exist at all.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.events, public.places, public.categories,
                public.organizers, public.event_categories, public.event_sources
  to anon, authenticated;

grant select, insert, update on public.events, public.places, public.categories,
                                 public.organizers, public.event_categories,
                                 public.event_sources, public.event_submissions
  to authenticated;

grant delete on public.events, public.places, public.event_categories,
                public.event_sources, public.event_submissions
  to authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.admin_activity_logs to authenticated;
grant select on public.plans, public.plan_items to authenticated;
