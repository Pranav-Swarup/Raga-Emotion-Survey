# Beyond the Scale — Carnatic rāga listening survey

Low-friction listener survey using the **GEMS-9** emotion instrument: consent → familiarisation clip → replayable music clips (nine GEMS-9 ratings + one optional word each) → demographics → done. One tap per screen where possible, a thick progress bar with a "step X/Y" indicator up top, custom audio player, clips replayable, back/forward arrows to review or edit earlier answers, and a phone-first layout.

## Try it locally
`python3 -m http.server` in this folder, open localhost:8000. No backend needed to test — you get a CSV download at the end if `config.js` isn't filled in.

## Content config
All clip URLs, the GEMS-9 items, and the demographics options live in `survey-config.js` — edit that file, not `app.js`, to change content. `config.js` is separate and holds only the Supabase connection (URL + anon key).

## Interaction details
- **Progress bar + step indicator.** The bar at the top fills as you move through familiarisation → each clip, reaching full on the last clip. The "X/Y" pill top-left (in the accent red) bumps with a small animation whenever the step changes. Demographics is a final, uncounted screen after that — no bar movement, no pill, no nav arrows.
- **Listen-gated ratings.** On the familiarisation clip and on every music clip, the rating controls stay locked (with a "please finish listening" message) and the Continue/Next button stays invisible until 75% of the audio has played (`LISTEN_THRESHOLD` in `survey-config.js`). For clips, Next also needs all nine GEMS-9 items answered — the free-text word is optional.
- **Gentle enforcement.** If you try to leave a clip with items unanswered, those rows get a subtle highlight rather than a hard block.
- **Interstitial pause.** A brief neutral "next clip loading" pause (`INTERSTITIAL_MS` in `app.js`, default 3s) sits between clips so one clip's emotion doesn't bleed into the rating of the next. The next clip's audio preloads during this pause and while you're rating the current one.
- **Back/forward arrows.** Faint arrows pinned to the bottom corners let a respondent step back to a previous screen (to change an answer) and forward again to where they left off. They grey out completely at the two ends of the flow — you can't skip ahead of your furthest answered step, only revisit ones you've already done. The interstitial itself isn't a navigable step.
- **Phone-first.** Layout, tap targets, and the button/arrow sizing are tuned for narrow viewports (safe-area insets included for notched phones); it also works fine on desktop.

## Swap in real clips
Edit the `CLIPS` array in `survey-config.js`: each needs `id`, `label`, `src` (hosted audio URL), and metadata `melakarta` / `raga` (stored with each response, never shown — the study is a blind comparison). Replace `FAMILIARISATION_SRC` with your warm-up clip. A Supabase storage bucket is a convenient place to host the audio in the same free project.

## Backend (Supabase, free)
**Fresh project:**
1. Create a project at [supabase.com](https://supabase.com) (free tier, no credit card).
2. SQL Editor → New query → paste in `schema.sql` → Run. This creates the `submissions` table with an insert-only public policy (anon key can write, not read).
3. Project Settings → API → copy the **Project URL** and **anon public** key into `config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
4. Reload the app — the "Done" screen will now say "Saved." instead of "No backend configured yet."
5. Export data any time: Table Editor → `submissions` → Export → CSV.

**Existing project** (already has a `submissions` table from an earlier version of this app): run `migration.sql` instead of `schema.sql` — it only adds the new GEMS-9/demographics columns and never touches existing rows or drops anything.

Until you fill in `config.js`, the app still works end-to-end — it just skips the network call and offers a CSV download instead, so you can test the full flow before wiring up Supabase.

**Data API settings** (Project Settings → Data API): turn Data API **on**; leave "Automatically expose new tables" **off** (recommended) — `schema.sql`/`migration.sql` grant the `anon` role insert access explicitly, so you don't need blanket auto-exposure.

## Host (free)
This is a static site with no build step, so any of these work with a free tier:
- **Netlify** — easiest: drag the whole folder onto [app.netlify.com/drop](https://app.netlify.com/drop). `netlify.toml` (already in this folder) sets long-lived caching for the audio files.
- **Vercel** — `vercel` CLI or connect a GitHub repo at [vercel.com/new](https://vercel.com/new), no config needed for a static site.
- **GitHub Pages** — push this folder to a GitHub repo, then Settings → Pages → deploy from the branch/root.

All three give a free HTTPS URL. Do this *after* filling in `config.js`, or update `config.js` and redeploy once Supabase is set up.

Free-tier Supabase projects auto-pause after about a week with no API activity. If the survey will sit untouched for long stretches, either check the dashboard periodically during collection or set up a scheduled ping (e.g. a GitHub Actions cron hitting the REST endpoint) to keep it awake.

## Data shape
One row per clip per respondent: `respondent_id, clip_id, melakarta, raga, presentation_order, wonder, transcendence, tenderness, nostalgia, peacefulness, power, joyful_activation, tension, sadness, free_text, time_spent_ms, age, training, years_of_training, listening_frequency, familiar, course_student, roll_number, name, created_at`. Clip order is fixed (Abheri, then Reethigowla) — not randomised. Demographics are collected once per respondent and repeated on each of their clip rows.

## Notes / easy adjustments
- GEMS-9 is the only instrument — no valence/arousal, no second scale.
- No forced-listen gate on replay — clips can be replayed freely; what's gated on 75% playback is the *first* appearance of the rating controls and the Next/Continue button, per `LISTEN_THRESHOLD` in `survey-config.js`.
- Progress bar and step indicator count familiarisation + each clip only; demographics is a final uncounted screen.
- Back/forward navigation restores previously entered ratings/selections when you revisit a step.
