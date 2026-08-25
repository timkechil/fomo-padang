# FOMO Padang

Semua yang lagi terjadi di Padang, dikurasi di satu tempat.

Next.js 15 (App Router) + TypeScript + Supabase (Postgres, Auth, Storage, RLS).
The interface is the original FOMO Padang prototype, migrated component by
component — the CSS in `src/app/globals.css` is the prototype's stylesheet,
unchanged.

---

## Supabase setup

### 1. Create the Supabase project

Create a project at supabase.com. Region `Southeast Asia (Singapore)` is the
closest to Padang. Note the project ref, the anon key, and the service-role key.

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where it runs | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | public; RLS is what protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | bypasses RLS — never prefix with `NEXT_PUBLIC_` |
| `SUBMISSION_IP_SALT` | server only | any long random string; salts the hashed submitter IPs |
| `NEXT_PUBLIC_SITE_URL` | both | used for canonical + Open Graph URLs |
| `TURNSTILE_SECRET_KEY` | server only | optional; leave empty to keep CAPTCHA off |

The service role is used in exactly three places: `/api/submissions`,
`/api/plans`, and the seed script. `src/lib/supabase/admin.ts` imports
`server-only`, so importing it from a client component fails the build rather
than leaking the key.

### 3. Run the migrations

In order, either through the Supabase SQL editor or the CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push          # applies supabase/migrations/*.sql in order
```

| File | Contents |
| --- | --- |
| `0001_schema.sql` | extensions, 11 tables, check constraints, indexes, submission-code sequence |
| `0002_functions.sql` | auth helpers, `updated_at` triggers, slug generation, `approve_submission()`, `search_public()`, `get_shared_plan()` |
| `0003_rls.sql` | RLS enabled on every table, explicit policies, grant matrix |
| `0004_storage.sql` | three buckets + storage policies (public read, staff write) |

### 4. Seed sample data

```bash
npm install
npm run db:seed
```

18 events, 8 places, 11 categories, and the organizers behind them. Every seeded
description is prefixed `[Data contoh]` so sample rows stay obvious next to real
ones. The script upserts on slug, so running it again updates rather than
duplicates. Dates are generated relative to today, so the demo never goes stale.

### 5. Create the first admin user

Supabase Dashboard → Authentication → Users → **Add user** (email + password,
auto-confirm). There is no public sign-up route.

### 6. Give that user a staff role

Being in `auth.users` is not the same as being staff. In the SQL editor:

```sql
insert into public.profiles (id, full_name, role)
values ('<the-user-uuid>', 'Nama Kamu', 'admin');
```

Roles: `admin` (everything, including deletes) and `editor` (create, edit,
review — no destructive actions). Nothing in the code checks an email address;
authorization comes from this row via `is_staff()` / `is_admin()` in RLS.

### 7. Storage

`0004_storage.sql` creates `event-posters`, `place-images`, and
`organizer-assets` with a 5 MB limit and a JPEG/PNG/WEBP allowlist. Nothing to
click in the dashboard. Anonymous contributors cannot upload — they send a
source URL and the team pulls the poster during review.

### 8. Run it

```bash
npm run dev            # http://localhost:3000
npm run typecheck
npm run build
```

---

## How the moderation flow works

```
Kasih Info Event  →  POST /api/submissions  →  event_submissions (pending)
                                                      ↓
                                            /admin/submissions
                                                      ↓  admin edits + completes
                                            approve_submission()  ← one transaction
                                                      ↓
                                       events (published)  +  submission = approved
                                                      ↓
                                            /event/[slug] live
```

`approve_submission()` locks the submission row `FOR UPDATE`, and a unique
partial index on `events.submitted_from` means a double-click can never create
two events. A second call returns the event created by the first.

Rejections keep the row: `rejected` and `needs_revision` are statuses, not
deletions, so moderation history survives.

## Security notes

- **RLS on every table**, never disabled. Anonymous visitors can read published
  events, published places, active categories, and organizers. That is the whole
  list.
- **`event_submissions` has no anon policy at all.** The public form posts to a
  server route that validates with Zod, drops anything outside the schema, and
  inserts with the service role. `status`, `submission_code`, `reviewed_by`,
  `reviewed_at`, and `approved_event_id` are set by a database trigger, so a
  crafted request cannot self-approve.
- **Uploads** are checked by magic bytes, not by filename or Content-Type, and
  are stored under a server-generated path. They run as the signed-in staff
  member, so Storage RLS applies to them too.
- **No raw HTML** from contributors is ever rendered; descriptions are plain
  text rendered as React children.
- **Anti-spam**: honeypot field, per-IP hourly limit in memory, per-IP daily
  limit in the database (hashed IPs, salted), and optional Turnstile.
- `/admin` sends `X-Robots-Tag: noindex` and every admin page and action calls
  `requireStaff()` — hiding a button is never the control.

## V1.2 (25 Agustus 2026)

New in this revision:

- **`NEXT_PUBLIC_SITE_URL` is now load-bearing.** Set it on Vercel to the live
  origin. `src/lib/site-url.ts` resolves it, falls back to the Vercel-provided
  host, and refuses a `localhost` value in a production build — that value was
  the cause of shared event links opening "Halaman nggak ketemu".
- **Migration `0005_v12_revisions.sql`** — run it before deploying. Additive
  only; existing rows stay valid and nothing needs reseeding.
- **National holidays** live in `src/lib/holidays.ts`, not in the database.
  Covered years: 2026, 2027. To add a year, copy the dates from that year's
  SKB 3 Menteri into the `HOLIDAYS` table — never compute the Islamic-calendar
  dates, they are set by decree.
- **Permanent event delete** is admin-only, enforced in three places: the UI
  only renders for `role = 'admin'`, the server action calls
  `requireStaff('admin')`, and the RLS policy `events_admin_delete` is the
  final gate.

## Timezone

Everything the product calls "today" is Padang time. `todayWIB()` formats
through `Intl.DateTimeFormat` with `Asia/Jakarta`, dates parse at local noon so
no offset can shift a day, and Postgres has `wib_today()` for the same reason.
An event on 22 August never renders as 21 August.

Multi-day events use the generated column `effective_end_date =
coalesce(end_date, start_date)`. The overlap test `start_date <= windowEnd AND
effective_end_date >= windowStart` is indexed, and it is why a 22–24 August
event appears on all three days in the calendar and in "Hari Ini".

## Project layout

```
supabase/migrations/     SQL migrations (reproducible from scratch)
supabase/seed/           seed script + sample data ported from the prototype
src/app/                 routes: explore, map, calendar, places, event, plan, submit, search, admin
src/app/api/             submissions, shared plans, admin upload
src/components/          UI migrated from the prototype HTML
src/components/admin/    moderation and editor UI
src/lib/                 supabase clients, queries, validation, formatting, plan store
src/server/              admin server actions
```

## What is still local

My Plan lives in `localStorage` (`fomo.plan.v2`) — no account needed. Pressing
Bagikan copies it into `plans` / `plan_items` and returns a `/plan/[shareId]`
link that anyone can read and nobody can edit. Personal notes travel with the
share, so tell contributors that.
# fomo-padang
