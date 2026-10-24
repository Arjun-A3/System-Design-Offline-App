<p align="center">
  <img src="assets/images/icon.png" alt="System Design Academy logo" width="128" />
</p>

<h1 align="center">System Design Academy</h1>

<p align="center">An App you can put in airplane mode and still study from.</p>

System Design Academy is an offline practice app for system design. Each day is a morning lesson and an evening lesson. You write an answer, mark a rubric, and say how sure you are. The app does not grade your prose. It schedules the next review from that self-assessment, keeps a streak, and stores everything in SQLite on the device.

There is no account, no backend, and no analytics. Opening the app does not count as study. A session counts when you record an assessment.

Curriculum `2026.10.1` spans **210 days** across 14 phases. **Days 1–14** are fully written. **Days 15–210** are planned outlines: visible in the curriculum, and impossible to mark complete until they are published.

## A day

```
morning lesson          evening lesson
10–25 minutes           same concepts, new question
write ≥ 20 characters   write again
mark the rubric         mark the rubric
confidence 1–5          confidence 1–5
        \                    /
         spaced repetition
         0 · 1 · 3 · 7 · 14 · 30 days
```

A struggle brings the concept back today. Shaky work holds the interval. Solid work pushes it out, and a concept is treated as mastered once the interval reaches 14 days. Missed days do not delete the curriculum queue or the review queue.

A marked rest day keeps a streak intact and does not add to it. An empty day ends the run. Today does not break the streak until the local day is over.

## The map

| | Phase | What it is for |
|---|---|---|
| 01 | Computer science and systems foundations | Processes, memory, CPU, Linux, and the path under a request |
| 02 | Web architecture | Proxies, sessions, limits, and failure handling at the edge |
| 03 | Data systems | Modeling, indexes, transactions, replication, sharding, recovery |
| 04 | Caching and performance | Where a cache helps, how it lies, and what happens when it fails |
| 05 | Distributed systems | Partial failure, consistency, consensus, backpressure |
| 06 | Messaging and workers | Queues, logs, delivery guarantees, workflows that survive retries |
| 07 | Scalability | Capacity, bottlenecks, and the cost of more machines |
| 08 | Reliability and observability | SLOs, signals, incidents, and recovery that describes user harm |
| 09 | Security and privacy | Trust boundaries, identity, secrets, and feature-shaped incidents |
| 10 | Cloud and infrastructure | Containers, orchestration, identity, delivery, platform cost |
| 11 | Advanced distributed data systems | Partitioning, streams, search, and multi-region writes |
| 12 | Architecture patterns | Boundaries, data movement, and change without worshipping the diagram |
| 13 | Real-world case studies | Shorteners, chat, feeds, search, video, payments, inventory |
| 14 | Senior and staff-level judgment | ADRs, migrations, debt, incidents, and strategy |

Home shows today's day, the next lesson, streaks, and reviews that are due. Curriculum walks the phases. Revision holds due reviews, weak concepts, bookmarks, and unresolved misconceptions. Progress is a heatmap: squares fill from completed sessions and reviews, not from launches. Settings holds reminder times, appearance, export, import, and reset.

## On the device

- Lessons ship inside the app binary. Optional reading links open only after you confirm an alert.
- Progress, drafts, notes, bookmarks, mastery, and settings live in `sysdapp.db`.
- Reminders are at most two local notifications, 8:00 and 20:00 by default. Permission is requested from Settings, not on first launch. Copy names the lesson title and never includes the reference solution.
- Export writes a JSON file (`sysdapp.backup`, version 1) through the share sheet. Import validates every field before it writes, in one transaction. Answers stay; lesson text always comes from the build you are running.
- The database is not encrypted. Uninstalling the app deletes it. Export before you move phones.
- Reset asks twice. It clears learning history and keeps reminder times and appearance.

## Run it

Node.js 22 or newer, npm, and either Expo Go or a simulator.

```bash
npm install
npm test
npm run typecheck
npx expo start
```

Open the project in Expo Go, an iOS simulator, or an Android emulator. There is no web target. With Expo Go, the first launch still needs the packager. After the bundle is loaded you can turn the network off. A development or production build does not need the packager at all.

`npm test` runs the engine, curriculum, backup, and SQLite tests with Node's test runner. Domain code stays free of Expo except at the edges: the SQLite adapter, notification scheduling, and the share sheet.

| Profile | What it builds |
|---|---|
| `development` | Dev client, iOS simulator |
| `preview` | Internal distribution |
| `production` | Store build, version auto-increment |

A store build has not been run from this workspace. `ios/` and `android/` are generated by Expo prebuild. Change native behavior in `app.json`, not in those folders.

## Code

| Path | Role |
|---|---|
| `src/app` | Screens. Expo Router. Tabs plus lesson, phase, and resources. |
| `src/curriculum` | Bundled lessons. The loader refuses to start if validation fails. |
| `src/engine` | Dates, assessment, repetition, streaks, heatmap, and the next lesson. Pure. |
| `src/db` | Migrations and the repository. |
| `src/notifications` | Reminder planning is pure. The native module only schedules that plan. |
| `src/backup` | JSON validation, share sheet, document picker. |
| `src/state` | Opens the database, loads a snapshot, reconciles reminders. |
| `test` | Node tests. Not part of the app bundle. |

Expo SDK 58 · React Native · TypeScript · Expo Router · SQLite.

## Guides

- [Local development](docs/development.md)
- [Testing](docs/testing.md)
- [Install on a device](docs/device-install.md)
- [Production builds](docs/distribution.md)
- [Notifications](docs/notifications.md)
- [Backup and restore](docs/backup.md)
- [Curriculum authoring](docs/curriculum.md)
