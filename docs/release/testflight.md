# Release runbook: TestFlight (today) and Google Play internal testing

Everything runs from `apps/mobile`. Use `npx eas-cli@latest` (project convention, see `apps/mobile/AGENTS.md`).
Do not commit secrets: `.p8` keys, service-account JSON and credentials stay out of git.

Sources: [EAS Build eas.json](https://docs.expo.dev/build/eas-json.md), [App version management](https://docs.expo.dev/build-reference/app-versions.md),
[EAS Submit iOS](https://docs.expo.dev/submit/ios.md), [EAS Submit Android](https://docs.expo.dev/submit/android.md),
[TestFlight with EAS](https://docs.expo.dev/submit/testflight.md), [eas.json schema](https://docs.expo.dev/eas/json.md).

## Version policy (decided)

| Item | Value | Where it lives |
|---|---|---|
| Marketing version (`CFBundleShortVersionString` / `versionName`) | `1.0.0` | `app.json` -> `version` (edit by hand for each new release; `autoIncrement` does not touch it) |
| Build number (`CFBundleVersion`) / `versionCode` | auto, starts at 1 | **EAS servers** (`"appVersionSource": "remote"` + `autoIncrement: true` on `production`) |
| `ios.buildNumber` / `android.versionCode` in `app.json` | intentionally **absent** | Expo docs: with `remote`, config values are ignored |
| `runtimeVersion` | intentionally absent | `expo-updates` is not installed, so there are no OTA updates in 1.0.0 |

If a build number was already used in App Store Connect or Play for this bundle id, run `npx eas-cli@latest build:version:set` first.

## Known blockers to settle before building (see `checklist.md`)

1. `privacy@example.com` placeholder is in `apps/mobile/src/app/privacy.tsx`. Replace it and link the hosted privacy policy URL in the app.
2. Android background location needs a prominent in-app disclosure *before* the runtime prompt (see `google-play.md`).
3. `expo-dev-client` is not in `package.json`. Only the `development` profile needs it (`npx expo install expo-dev-client`); `preview`/`production` do not.
4. `UIBackgroundModes` contains `remote-notification` but the app has no push notifications. Consider removing it (App Review may ask why).

## Part A: iOS / TestFlight

### A1. Prerequisites (one-time, in browsers)
1. Paid **Apple Developer Program** membership (required for submit). Note your **Team ID** (developer.apple.com > Membership details).
2. Register the bundle ID `com.worktime.app` (developer.apple.com > Identifiers). EAS can also do this during the first build.
3. **App Store Connect** > Apps > "+" > New App: platform iOS, name "Worktime" (must be unique store-wide; have a fallback such as "Worktime: Work Hours"), primary language, bundle ID `com.worktime.app`, SKU (e.g. `worktime-ios`).
4. Open the app > App Information > copy **Apple ID** (a number). That is `ascAppId`.
5. An [Expo account](https://expo.dev/signup).

### A2. Configure
Edit `apps/mobile/eas.json` > `submit.production.ios`: replace `REPLACE_WITH_APP_STORE_CONNECT_APPLE_ID` and `REPLACE_WITH_APPLE_TEAM_ID`.

### A3. Commands
```bash
cd apps/mobile
npx expo install --check          # dependency versions match SDK 58
npx -y expo-doctor
npx eas-cli@latest login
npx eas-cli@latest init           # creates the EAS project, writes extra.eas.projectId + owner into app.json
npx eas-cli@latest build -p ios --profile production
```
`eas init` will add `expo.extra.eas.projectId` (and possibly `owner`) to `app.json`; commit that. The first build asks you to log in to your Apple account and lets EAS create the distribution certificate and provisioning profile (answer yes; 2FA prompts are normal). Capabilities needed (Background Modes) are derived from `Info.plist`.

Then submit (either separately or with `build --auto-submit`):
```bash
npx eas-cli@latest submit -p ios --profile production --latest
```
Authentication: interactive login with Apple ID, or an App Store Connect API key (`eas credentials -p ios` -> App Store Connect: manage your API key). For CI use `ascApiKeyPath`, `ascApiKeyIssuerId`, `ascApiKeyId` in `eas.json` (never commit the `.p8`).

### A4. After upload
1. App Store Connect > your app > **TestFlight**. Processing usually takes 5 to 10 minutes (not guaranteed) and Apple emails you.
2. Export compliance: `ITSAppUsesNonExemptEncryption=false` is set in `app.json`, so the build should not sit at "Missing Compliance". If it does, answer the questionnaire (see `app-store.md`).
3. **Internal testers** (up to 100, must be users of your App Store Connect team): Users and Access > add the person (role e.g. Developer/Marketing) > TestFlight > Internal Testing > "+" group > add testers and the build. No Beta App Review needed; available right after processing.
4. Testers install the **TestFlight** app and accept the invite.

### A5. External testers (optional, later)
Per the Expo/Apple docs: an internal group must exist first; then create an external group, add a processed build, and fill in **Test Information**: beta app description, feedback email, contact info, "What to Test", and review notes. The first build of each version goes through **Beta App Review** (typically less strict than full review, but the same guidelines apply). Because this app asks for "Always" location, put the reviewer demo steps from `app-store.md` into the review notes. No sign-in is needed (state "no account"). Only Account Holder/Admin/App Manager can manage external testing. Public link: up to 10,000 testers; builds expire after 90 days.

### A6. Real-device smoke test before inviting others
Install via TestFlight, then: grant "While Using", then "Always"; create a workplace with "Use current location" and arrival delay "Right away"; leave the radius; confirm notification and action buttons; export CSV; delete all data.

## Part B: Android / Google Play internal testing

### B1. Prerequisites
1. **Google Play Console** developer account (one-time fee; personal accounts created after Nov 2023 must run a closed test with 12+ testers for 14 days before *production* access; internal testing is not affected. Verify current rules in console: https://support.google.com/googleplay/android-developer/answer/14151465).
2. Console > Create app: name "Worktime", default language, App, Free.
3. Create a **service account** with Play permissions and download its JSON key (Expo guide: https://github.com/expo/fyi/blob/main/creating-google-service-account.md). Either upload it to EAS (`eas credentials -p android`, Google Service Account) or save it as `apps/mobile/secrets/play-service-account.json` (path in `eas.json`; **add `secrets/` to `.gitignore`**, do not commit).
4. Target API: Play requires new apps/updates to target Android 16 (API 36) from 2026-08-31 ([source](https://support.google.com/googleplay/android-developer/answer/11926878)). React Native 0.88 in this repo sets `targetSdk = "36"` (`node_modules/react-native/gradle/libs.versions.toml`), so this is met; confirm in the built AAB (`eas build` log or Play Console pre-launch report).

### B2. Build
```bash
npx eas-cli@latest build -p android --profile production     # .aab, versionCode auto-incremented remotely
```
First build: let EAS generate the upload keystore (back it up: `eas credentials -p android`). Play App Signing holds the real signing key.

### B3. Upload
Submit via EAS (Expo docs say the first release to internal testing can be created this way; if Play Console refuses because setup tasks are open, upload the `.aab` manually once under Testing > Internal testing > Create new release):
```bash
npx eas-cli@latest submit -p android --profile production --latest
```
`eas.json` uses `track: internal` and `releaseStatus: draft`; open the draft in Play Console and click "Roll out" after the declarations below.

### B4. Before testers can install
Complete in Console > Dashboard "Set up your app": privacy policy URL, app access (no login), ads (none), content rating, target audience, Data safety, **background location** declaration, **foreground service** declaration, news/health/government declarations (none). Details and answers: `google-play.md`. Internal testing normally does not require review of the whole listing, but the sensitive-permission forms must be complete before production.

### B5. Testers
Testing > Internal testing > Testers tab > create email list (up to 100) > copy the opt-in link and send it. Testers must opt in via the link, then install from Play.
