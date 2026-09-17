-- Run in the Supabase SQL Editor to remove test/junk responses.
-- Deletes every row belonging to a respondent who has at least one row
-- matching these patterns, not just the matching row itself — otherwise a
-- respondent's other (real) clip row would be left behind on its own.

delete from submissions
where respondent_id in (
  select respondent_id from submissions
  where lower(trim(free_text)) = 'test'
     or lower(trim(name)) = 'pranav'
     or lower(trim(name)) = 'abcd'
);
