# Distribution

`eas.json` has three profiles:

- `development` — a dev client, internal distribution, iOS simulator enabled
- `preview` — an internal installable build
- `production` — store build, version auto-increment from the local app version

The app ids are `academy.sysdesign.offline` on both platforms. The URL scheme is `sysdapp`. Remote push is off.

This workspace has not run `eas build` or a store submit. Installing the EAS CLI and linking an Expo account are still required before a cloud build.

## Before a production build

```bash
npm test
npm run typecheck
npx expo-doctor
```

`expo-doctor` is a configuration check. It does not install the app on a phone.

Create a production binary only after an Expo project is linked:

```bash
npx eas-cli@latest build --platform all --profile production
```

Submit is a separate command (`eas submit`) and needs store credentials that are not in this repo.

## Privacy notes for a store listing

- No account and no analytics SDK.
- Progress stays in on-device SQLite and is not encrypted.
- Notifications are local. The app does not register for remote push.
- Optional resource links leave the app only after an explicit confirmation.
- Backup files are JSON the learner chooses to share.

`ITSAppUsesNonExemptEncryption` is false because the app does not add its own encryption.
