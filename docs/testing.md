# Testing

## Automated

`npm test` runs Node’s built-in test runner against:

- local calendar dates, including a year boundary and a leap day
- curriculum shape: 210 days, 14 full days, prerequisites, and no skipped lesson after a gap
- rubric scores, struggle / shaky / solid scheduling, and the 0, 1, 3, 7, 14, 30 day intervals
- heatmap levels and streaks, including a rest day and 31 December / 1 January
- reminder reconcile: time changes, duplicate ids, timezone force, and denied permission
- backup rejection of extra fields, bad session ids, and files over 8 MB
- SQLite migrations from version 1 to 2 without dropping an answer, draft restore, assessment transactions, export/import, and reset
- a source scan that fails if `src/` calls `fetch`, `XMLHttpRequest`, axios, Firebase, Supabase, or React Native Web

The database tests use `node:sqlite` through `test/helpers/nodeDb.ts`. The app itself uses `expo-sqlite`. The SQL is the same migration list.

`npm run typecheck` checks the app. It does not prove the screens render.

## Not automated

These need a phone or simulator and were not executed in this workspace:

- a cold launch in airplane mode inside a production binary
- the system notification appearing at 8:00 or 20:00
- the share sheet and document picker
- light and dark appearance, Dynamic Type, and the software keyboard over the answer editor
- an upgrade install that keeps `sysdapp.db`

A passing unit test is not a claim that those device checks passed.
