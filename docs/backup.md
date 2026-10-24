# Backup and restore

Settings exports a JSON file through the system share sheet. Import uses the document picker. The format id is `sysdapp.backup`, version 1. Files larger than 8 MB are rejected.

The file contains learning sessions, drafts, assessments, mastery, revision items, daily activity, notes, bookmarks, notification preferences, appearance settings, and the curriculum version that was installed at export time. It does not contain an account, location, contacts, or notification text.

Import validates every key and value before it writes. Unknown fields, malformed session ids, and assessments that point at a missing session are rejected. Writes use parameterized SQL inside one transaction.

After a successful import, the app sets `curriculum_meta` back to the curriculum bundled in the current build. Your answers stay. Lesson text comes from the app binary, not from the backup.

## Limits

- The database is not encrypted. A backup file is ordinary JSON. Store it somewhere you trust.
- Uninstalling the app deletes the on-device database. Export before you uninstall or move phones.
- Reset progress asks twice. It deletes learning history and keeps reminder times and appearance settings.
- A backup from a newer format version will not import.
