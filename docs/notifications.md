# Notifications

The app schedules at most two daily local notifications. The defaults are 8:00 and 20:00 in the device’s local timezone. Each one can be turned off, and the times can be changed in Settings. The two times must differ.

Stable identifiers:

- `sysdapp.reminder.morning`
- `sysdapp.reminder.evening`
- `sysdapp.reminder.test`

Android uses the channel `learning-reminders`. The app does not request exact alarms. iOS remote-notification entitlements are disabled in `app.json` (`enableRemoteNotifications: false`).

Copy is generic. The body names the lesson title and does not include the reference solution.

## What the operating system actually does

Scheduling succeeds when the OS accepts the request. Delivery is not guaranteed.

- iOS and Android may delay or drop notifications under Focus, battery restrictions, force-quit, or a denied permission.
- Changing the timezone or the clock time reschedules the reminders the next time the app opens.
- Lesson titles in the notification body refresh on the next launch and after an assessment is saved. They do not update while the app is closed.
- A test reminder is a one-shot local notification about two seconds out. It is not one of the daily reminders.
- Denying permission cancels the daily reminders and schedules nothing.
- Reopening the app cancels a duplicate or stale reminder before creating a replacement, so upgrades do not stack copies.

Permission is requested from Settings, not on the first screen.
