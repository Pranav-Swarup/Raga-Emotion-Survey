-- Run in the Supabase SQL Editor to enable the results preview page.
--
-- The anon key is public (it's sitting in config.js in this repo), so it must
-- never be able to read name / roll_number / respondent_id — those are the
-- only columns that could identify a respondent. This view exposes
-- everything else needed for the results charts/quotes and nothing else.
-- Views run with the permissions of their owner (not the querying role), so
-- this can select from `submissions` and hand out a restricted column set
-- even though `submissions` itself only grants anon INSERT.

create or replace view results_public as
select
  clip_id,
  raga,
  melakarta,
  presentation_order,
  wonder,
  transcendence,
  tenderness,
  nostalgia,
  peacefulness,
  power,
  joyful_activation,
  tension,
  sadness,
  free_text,
  time_spent_ms,
  age,
  training,
  years_of_training,
  listening_frequency,
  familiar
from submissions;

grant select on results_public to anon;
