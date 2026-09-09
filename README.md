# Beyond the Scale — Carnatic rāga listening survey

Low-friction listener survey: consent → one background question → familiarisation tone → replayable clips (valence + arousal + one word) → done. One tap per screen where possible, a thick progress bar with a "step X/Y" indicator up top, custom audio player, clips replayable, back/forward arrows to review or edit earlier answers, and a phone-first layout.

## Try it locally
`python3 -m http.server` in this folder, open localhost:8000. Placeholder tones stand in for real clips. No backend needed to test — you get a CSV download at the end.

## Interaction details
- **Progress bar + step indicator.** The bar at the top fills as you move through background → familiarisation → each clip. The "X/Y" pill top-left (in the accent red) bumps with a small animation whenever the step changes.
- **Continue/Next gating.** On the familiarisation tone and on every clip, the primary button stays invisible until 75% of the audio has played (`LISTEN_THRESHOLD` in `app.js`), then fades in. For clips, it also needs both SAM ratings before it becomes clickable.
- **Back/forward arrows.** Faint arrows pinned to the bottom corners let a respondent step back to a previous screen (to change an answer) and forward again to where they left off. They grey out completely at the two ends of the flow — you can't skip ahead of your furthest answered step, only revisit ones you've already done.
- **Phone-first.** Layout, tap targets, and the button/arrow sizing are tuned for narrow viewports (safe-area insets included for notched phones); it also works fine on desktop.

## Swap in real clips
Edit the `CLIPS` array at the top of `app.js`: each needs `id`, `src` (hosted audio URL), and metadata `melakarta` / `raga` / `phrase` (stored with each response, never shown). Replace `FAMILIARISATION_SRC` with your plain warm-up tone. A Supabase storage bucket is a convenient place to host the audio in the same free project.

## Backend (Supabase, free)
1. Create a project at [supabase.com](https://supabase.com) (free tier, no credit card).
2. SQL Editor → New query → paste in `schema.sql` → Run. This creates the `submissions` table with an insert-only public policy (anon key can write, not read).
3. Project Settings → API → copy the **Project URL** and **anon public** key into `config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
4. Reload the app — the "Done" screen will now say "Saved." instead of "No backend configured yet."
5. Export data any time: Table Editor → `submissions` → Export → CSV.

Until you fill in `config.js`, the app still works end-to-end — it just skips the network call and offers a CSV download instead, so you can test the full flow before wiring up Supabase.

## Host (free)
This is a static site with no build step, so any of these work with a free tier:
- **Netlify** — easiest: drag the whole folder onto [app.netlify.com/drop](https://app.netlify.com/drop). `netlify.toml` (already in this folder) sets long-lived caching for the audio files.
- **Vercel** — `vercel` CLI or connect a GitHub repo at [vercel.com/new](https://vercel.com/new), no config needed for a static site.
- **GitHub Pages** — push this folder to a GitHub repo, then Settings → Pages → deploy from the branch/root.

All three give a free HTTPS URL. Do this *after* filling in `config.js`, or update `config.js` and redeploy once Supabase is set up.

## Data shape
One row per clip per respondent: `respondent_id, training_background, clip_id, melakarta, raga, phrase, presentation_order, valence, arousal, free_text, created_at`. Clip order is randomised per respondent and recoverable via `presentation_order`.

## Notes / easy adjustments
- No forced-listen gate on replay — clips can be replayed freely; the Next/Continue button's *first* appearance is what's gated on 75% playback, per `LISTEN_THRESHOLD` in `app.js`.
- Progress bar and step indicator count background + familiarisation + each clip.
- Back/forward navigation restores previously entered ratings/selections when you revisit a step.
