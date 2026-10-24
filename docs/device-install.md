# Install on a device

## Expo Go

Local SQLite and local notifications are part of the Expo SDK and are intended to work in Expo Go.

1. Install Expo Go from the App Store or Play Store.
2. From this directory, run `npx expo start`.
3. Scan the QR code with the phone on the same network, or press `i` / `a` for a simulator.

Airplane mode can be enabled after the bundle has loaded. The first launch still needs the packager if you are using Expo Go, because Expo Go downloads the JavaScript bundle from your computer. A development or production build does not.

## Development build

Use this when you want a binary that does not depend on Expo Go:

```bash
npx expo prebuild
npx expo run:ios
npx expo run:android
```

Or use EAS. See [distribution.md](distribution.md).

## What is stored

Progress, drafts, notes, bookmarks, and settings are in the app’s SQLite file. Uninstalling the app deletes that file. Export a backup first if you want to keep it. The file is not encrypted.
