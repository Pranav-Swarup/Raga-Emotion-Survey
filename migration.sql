-- Run this once in your EXISTING project's SQL Editor to bring the live
-- `submissions` table up to date with the GEMS-9 instrument + demographics.
-- Purely additive: it only adds new nullable columns, so nothing already in
-- the table (including your test row) is touched or dropped.
--
-- The old `valence`, `arousal`, `phrase`, and `training_background` columns
-- are no longer written by the app. They're left in place here in case you
-- want to keep the old test data around; drop them yourself later if you
-- don't, e.g.:
--   alter table submissions drop column valence, drop column arousal,
--     drop column phrase, drop column training_background;

alter table submissions
  add column if not exists wonder int,
  add column if not exists transcendence int,
  add column if not exists tenderness int,
  add column if not exists nostalgia int,
  add column if not exists peacefulness int,
  add column if not exists power int,
  add column if not exists joyful_activation int,
  add column if not exists tension int,
  add column if not exists sadness int,
  add column if not exists time_spent_ms int,
  add column if not exists age int,
  add column if not exists training text,
  add column if not exists years_of_training int,
  add column if not exists listening_frequency text,
  add column if not exists familiar text,
  add column if not exists course_student text,
  add column if not exists roll_number text,
  add column if not exists name text;

-- `roll_number` and `name` are only filled in when the respondent says they're
-- part of the Music Workshop course, and are only ever null otherwise. This
-- makes those rows identifiable — no longer anonymous. The RLS policy stays
-- insert-only for the anon key either way, so the public can't read any row
-- back through the API, but treat this table as containing PII for course
-- respondents once you export it.
