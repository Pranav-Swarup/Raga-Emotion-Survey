-- For a FRESH Supabase project only. Run once: Project > SQL Editor > New query.
-- If you already created the `submissions` table from an earlier version of
-- this schema, do NOT re-run this — use migration.sql instead, which adds the
-- new columns without touching your existing table or data.

create table submissions (
  id uuid primary key default gen_random_uuid(),
  respondent_id uuid not null,
  clip_id text,
  melakarta text,
  raga text,
  presentation_order int,

  -- GEMS-9 (each 0-4: not at all -> extremely)
  wonder int,
  transcendence int,
  tenderness int,
  nostalgia int,
  peacefulness int,
  power int,
  joyful_activation int,
  tension int,
  sadness int,

  free_text text,
  time_spent_ms int,

  -- demographics (collected once per respondent, repeated on each clip row)
  age int,
  training text,
  years_of_training int,
  listening_frequency text,
  familiar text,

  -- only set when the respondent says they're part of the Music Workshop
  -- course — makes those specific rows identifiable, unlike the rest of the table
  course_student text,
  roll_number text,
  name text,

  created_at timestamptz,
  inserted_at timestamptz default now()
);

-- Public anon key may INSERT only. You read/export from the dashboard
-- (Table Editor), which uses your own login, not the anon key.
alter table submissions enable row level security;

create policy "anon can insert"
  on submissions for insert
  to anon
  with check (true);

-- RLS policies alone don't grant table-level privileges. If your project has
-- "Automatically expose new tables" turned off (Project Settings > Data API,
-- the recommended setting), the anon role also needs this explicit grant or
-- every insert fails with "permission denied for table submissions".
grant insert on table submissions to anon;
