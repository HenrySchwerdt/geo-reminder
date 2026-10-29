# Google Play Console answers

Sources: [Background location permission](https://support.google.com/googleplay/android-developer/answer/9799150),
[Data safety form](https://support.google.com/googleplay/android-developer/answer/10787469),
[Foreground service declaration](https://support.google.com/googleplay/android-developer/answer/13392821),
[Target API level](https://support.google.com/googleplay/android-developer/answer/11926878),
[Android foreground service types](https://developer.android.com/develop/background-work/services/fgs/declare),
[Expo Location](https://docs.expo.dev/versions/v58.0.0/sdk/location/). **verify in console** marks anything whose current UI wording could not be confirmed.

## 1. Data safety
Google's definitions: **collect** = transmitting data off the user's device; **share** = transferring collected data to a third party. Data processed only on device and not sent off device need not be declared. A privacy policy URL is still required, even when nothing is collected.

Tick exactly:
1. "Does your app collect or share any of the required user data types?" -> **No**.
2. Because of (1) the data-type questionnaire is skipped. Do **not** tick Location (approximate or precise), Personal info, Files, App activity etc.
3. Security practices: if shown, "Is all of the user data collected by your app encrypted in transit?" does not apply (no collection). "Do you provide a way for users to request that their data be deleted?" -> the app deletes everything locally via Settings > Your data > Delete; uninstalling also removes it (state that in the privacy policy). **verify in console** which of these appear when "No data collected" is chosen.
4. Privacy policy URL: the hosted `privacy-policy.md`.
Re-check this if a network library, analytics or crash SDK is ever added. Exports leave the device only when the user shares the file.

## 2. Permissions the build declares
From `expo config --type introspect` and module manifests: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` (re-register alarms/geofences after reboot), plus `INTERNET`/`ACCESS_NETWORK_STATE`/`VIBRATE` pulled in by libraries. Blocked in `app.json`: `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`. Inspect the final manifest in the AAB (Play Console > App bundle explorer) and block anything unexpected. `INTERNET` is left because Metro/dev builds need it and expo-image/file-system declare it; the app makes no network calls.

## 3. Background location permission declaration
Console: Policy and programs > App content > Sensitive app permissions > Location permissions > Start. Google requires: main purpose, **one** feature needing background access (multiple features cause rejection), why it cannot work otherwise, a video (aim for 30 s or less), a prominent in-app disclosure shown before the runtime prompt, and a privacy policy in the console and in-app.

**Core purpose answer:** "Worktime is a work-time tracker that reminds people to clock in and out when they arrive at or leave their workplace."

**Feature (single):** "Arrival and departure reminders for workplaces the user created."

**Declaration text (paste):**
```
Worktime lets users create workplaces (name, place and radius). In the background the app uses geofencing to detect when the phone enters or leaves a workplace the user created, and then posts a local notification asking "Clock in?" or "Clock out?". Without background location access, the app cannot notice arrival or departure while it is closed, which is the app's core value (reminders at the moment you arrive). Location is used only near the user's own workplaces: far away, no location updates run; while near a workplace, short location updates run in a foreground service with a visible notification, and stop once arrival or departure is decided. The user's route is never recorded, location is never sent off the device, and there are no ads. Users can use the app without background location (manual clock in/out and time-based reminders) and can revoke the permission at any time in system settings.
```

### Prominent disclosure (must exist in the app; **currently not present as a dedicated dialog**, see checklist)
Requirements from Google: appears before the runtime permission, in normal use (not buried in Settings or a privacy policy), names "location", says it is used in the background / "when the app is closed", lists the feature that uses it. Suggested screen/dialog text (wording is ours; adapt):
> **Use location in the background?**
> Worktime collects location data to notice when you arrive at or leave your workplaces, **even when the app is closed or not in use**. This is used only for arrival and departure reminders. Your route is never recorded and location never leaves your device.
> [Not now] [Continue]

"Continue" then triggers `requestAlwaysLocation()` (foreground prompt first, then the system "Allow all the time" step). Android 11+ sends the user to a settings page for the second step; the disclosure should tell them to choose "Allow all the time".

### Video script (30 s or less, upload to YouTube as unlisted, paste the link; record on a real Android device with `adb shell screenrecord` or the system recorder, show it is the Android app)
| Time | Show |
|---|---|
| 0-4 s | Fresh install, open Worktime. Voice/caption: "Worktime reminds you to clock in at your workplace." |
| 4-10 s | Add a workplace: tap "Use current location", radius, arrival reminder on. |
| 10-16 s | The **prominent disclosure** screen with the full text, tap "Continue". |
| 16-21 s | The system location prompt, choose "While using the app"; then the settings page, choose **"Allow all the time"**. |
| 21-30 s | Close the app / lock the phone, walk or mock the location into the workplace (Developer options > mock location or emulator route), show the **notification "Clock in?"** with action buttons and the foreground-service notification ("Worktime is checking your arrival") while sampling. Caption: "Works with the app closed; no route is stored." |

## 4. Foreground service declaration
Console: App content > Foreground service permissions (required for apps targeting Android 14+; the app targets API 36). `expo-location` plugin adds `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` and a service with `foregroundServiceType="location"`.
- **Type:** Location.
- **Use case:** Geofencing (closest preset; Google's text: video shows the user completing steps that tie a location to the feature, e.g. selecting a venue). **verify in console** the exact preset names.
- **Functionality description (paste):** "While the phone is near a workplace the user created, the app samples location for up to a few minutes to decide precisely when the user arrived or left, then shows a reminder. A foreground-service notification ('Worktime is checking your arrival') is visible while this runs. Far from every workplace, no service runs."
- **User impact if delayed/interrupted:** "The arrival or departure reminder may arrive late or be skipped; the user can still clock in and out manually. The service restarts at the next geofence event."
- **Video:** the same video as section 3 (the steps that create the workplace and trigger the reminder; the service notification visible).

Technical caution: starting a location foreground service from the background is restricted on Android 12+ (exceptions apply to geofence-triggered starts and when "all the time" location is granted). Test on Android 14/15/16 real devices that sampling starts after a geofence transition with the app swiped away (see `docs/technical/geofencing.md` section 5).

## 5. Content rating (IARC questionnaire)
Category: **Utility, Productivity, Tools or other**. Answer No to violence, sexual content, language, controlled substances, gambling, user-to-user communication, user-generated content, sharing of location with others, digital purchases. Expected: **Everyone / PEGI 3 / USK 0** (verify in console).

## 6. Target audience and content
- Target age groups: **18 and over** (a work tool; avoids the Families policy requirements). Not designed for children; does not appeal to children.
- Ads: **No ads**.
- App access: all functionality available without login or special access.
- Government / financial / health / news app declarations: No.
- Category: Productivity. Contact email, website (optional), privacy policy URL required.
- Data deletion URL (account deletion section): not applicable (no accounts).

## 7. Target API and release type
Target API 36 satisfies the 2026-08-31 requirement for new apps (RN 0.88 default; verify in the AAB). Upload an `.aab` (not apk). Use Play App Signing.
