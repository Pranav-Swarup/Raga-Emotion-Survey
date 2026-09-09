-- Run once in Supabase: Project > SQL Editor > New query.

create table submissions (
  id uuid primary key default gen_random_uuid(),
  respondent_id uuid not null,
  training_background text,
  clip_id text,
  melakarta text,
  raga text,
  phrase text,
  presentation_order int,
  valence int,
  arousal int,
  free_text text,
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
