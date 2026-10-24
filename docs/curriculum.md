# Curriculum authoring

The bundled curriculum version is `2026.10.1`. There are 210 days. Days 1–14 are full morning and evening sessions. Days 15–210 are planned outlines. `src/curriculum/index.ts` refuses to load if `validateCurriculum` reports an error.

## Identifiers

- Day: `day.NNN`
- Session: `day.NNN.morning` or `day.NNN.evening`
- Concept: `concept.<slug>`
- Resource: `resource.<slug>`

A morning session after day 1 depends on the previous evening. An evening session depends on the same morning. Extra prerequisites are merged in. A prerequisite must exist and must sort earlier than the session that names it.

## Full day

Add a day with `buildFullDay` in `src/curriculum/content`. A full session needs:

- concept ids that exist
- a why, an explanation, a question, at least two hints
- an expected outline, a reference solution, and at least two rubric criteria
- a duration from 10 to 25 minutes
- misconceptions, an engineering context, and the tradeoff notes the author type requires

The evening session must practice the morning concepts or a subset of them. Rubric and misconception ids are prefixed with the session id.

Completion is allowed only for `depth: 'full'`. The learner writes an answer of at least 20 characters, marks every rubric row, and records confidence from 1 to 5. That score is a self-assessment. The app does not grade the prose.

## Planned day

Add the next outline in `src/curriculum/roadmap.ts` with `buildPlannedDay`. Keep the phase lengths in that file: web 16, data 18, caching 12, distributed 18, messaging 16, scalability 14, reliability 16, security 14, cloud 14, advanced data 16, architecture 14, case studies 16, judgment 12. Days stay contiguous. The next free number is 211.

When a planned day is promoted to a full day, keep its session ids. Move it from the roadmap into a content file and stop emitting it from `plannedDays`. Learner rows are keyed by session id, so a new id would orphan their draft.

## Resources

Add a resource only when the publisher, URL, and any printed date have been checked. `src/curriculum/resources.ts` is the list. A lesson must remain usable with the network off; a resource is optional reading.

## Progress across versions

Shipping a new curriculum version updates `curriculum_meta` and leaves session rows in place. Do not delete `sysdapp.db` in a migration unless the learner asked to reset. Schema changes belong in `src/db/migrations.ts` as the next integer version.
