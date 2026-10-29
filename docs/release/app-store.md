# App Store Connect answers and App Review notes

Sources: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (2.5.4 background services, 5.1.1 data collection, 5.1.2 data use, 5.1.5 location services),
[App privacy details](https://developer.apple.com/app-store/app-privacy-details/), [Set an age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating),
[Expo privacy manifests](https://docs.expo.dev/guides/apple-privacy.md). Anything marked **verify in console** could not be confirmed from public docs; the console wording changes.

## 1. App Privacy ("nutrition label")
Answer: **Data Not Collected** (App Store Connect > App Privacy > "Do you or your third-party partners collect data from this app?" -> **No**).

Rationale (Apple's definition: "collect" means transmitting data off the device so you or partners can access it longer than needed to service a request; data processed only on device is not collected and need not be disclosed):
- Time entries, workplaces, settings, notification state: SQLite on the device only.
- Location: used on device to compare the phone with workplaces the user created; never transmitted, never logged as a route.
- Export (CSV/JSON) is created locally and shared only by the user via the system share sheet.
- No analytics, ads, crash reporter, account, server or third-party SDK that transmits data. (Re-check if any dependency is added; third-party SDK collection counts too.)
- Privacy Policy URL (required): host `privacy-policy.md` (e.g. GitHub Pages) and paste the URL. Guideline 5.1.1(i) also requires the link in-app (see checklist).
- Tracking: none; `NSPrivacyTracking` is false; no App Tracking Transparency prompt, no `NSUserTrackingUsageDescription`.

## 2. Privacy manifest (in `app.json` -> `ios.privacyManifests`)
Declared required-reason APIs (union of the app's own and its Expo/React Native modules' manifests, read from `node_modules` on 2026-10-29):

| Category | Codes | Source |
|---|---|---|
| UserDefaults | CA92.1 | React Native, expo-notifications, expo-constants, expo-task-manager, expo-system-ui |
| File timestamp | C617.1, 0A2A.1, 3B52.1 | React Native (C617.1), expo-file-system (0A2A.1, 3B52.1; import/export) |
| System boot time | 35F9.1 | React Native timing, expo-device |
| Disk space | E174.1, 85F4.1 | expo-file-system |

Expo docs warn Apple does not reliably parse manifests from static pods, hence the explicit copy. If Apple emails "ITMS-91053 Missing API declaration" after upload, add the listed category/reason. Code meanings: see Apple's "Describing use of required reason API" page (verify exact wording there).

## 3. Export compliance
`ITSAppUsesNonExemptEncryption = false` is set. The app contains no custom or non-exempt cryptography (no networking of user data; only OS-provided crypto, e.g. `expo-crypto` for random IDs/hashing, is exempt-class). If App Store Connect still asks: "Does your app use encryption?" -> **Yes, only exempt** / qualifies for exemption (verify in console); no French declaration needed for exempt use. A legal check is advisable if distribution plans change.

## 4. Age rating
Questionnaire (App Information > Age Ratings > Set Up). Expected answers: no parental controls, no age assurance, no unrestricted web access, no user-generated content, no social media, no messaging, no advertising, no profanity, horror, alcohol/tobacco/drugs, medical/wellness content (it is a time tracker; if you consider "health or wellness topics" relevant, answer None), no sexual content, no violence, no gambling/contests/loot boxes. Expected result **4+**. Age Categories: Not Applicable (do not choose Made for Kids). **verify in console** (questions have changed in 2025).

## 5. Other metadata
- Category: Productivity (secondary: Business).
- Pricing: Free. No in-app purchases. Copyright: "2026 <your name>".
- Support URL (required) and Privacy Policy URL (required); Marketing URL optional.
- Content rights: no third-party content.
- App Review contact: your name, phone, email. Sign-in required: **No**.
- Availability: all regions or restrict as desired; no encryption/EU DSA issues for a free app, but the EU Digital Services Act "trader" status must be declared if distributing in the EU (verify in console).

## 6. Permission purpose strings (review)
From `app.json` (all in plain language, say what and why; Guideline 5.1.1(ii) requires clear and complete purpose strings):

| Key | Current text | Verdict |
|---|---|---|
| `NSLocationAlwaysAndWhenInUseUsageDescription` (expo-location plugin) | "Allow Worktime to notice when you arrive at or leave a workplace, even when the app is closed. Your route is never recorded." | Good: states trigger, benefit and limit. |
| `NSLocationWhenInUseUsageDescription` | "Worktime uses your location to remind you to clock in and out at your workplaces." (infoPlist) vs "...to set up workplaces and remind you to clock in." (plugin) | Two different strings for the same key; the plugin value is applied by the plugin in prebuild but confirm the final plist in the build (`npx expo config --type introspect`). Keep one consistent wording. |
| Notifications | No purpose string needed on iOS (runtime prompt). Ask only when the user enables reminders, with in-app context first. | OK |

Also required for review (5.1.5): the app must work without Always permission (it does: fallback to time-based reminders and manual clock in/out) and must not force permission (5.1.2(i), 5.1.1(iv)). Verify the denied state is reachable and usable on a real device.

## 7. Background mode justification
- `UIBackgroundModes: location`: Guideline 2.5.4 lists location as a legitimate background use. Used for arrival/departure detection with region monitoring plus brief location updates only near a user-created workplace (`docs/technical/geofencing.md`: far away nothing runs; once the decision is made, sampling stops). No continuous route tracking, `showsBackgroundLocationIndicator` is false only because updates are short-lived near fences (consider setting it true if App Review pushes back).
- `remote-notification`: **not needed** (no push, no server). Recommend removing to avoid an unexplained background mode; if kept, explain "reserved, unused" (weak). Decision for the owner.

## 8. App Review notes (paste into "Notes")
```
Worktime is a local-only work-time tracker. There is no account, server, analytics or ads, so no login is needed.
Data export (CSV/JSON), import and "Delete all data" are in Settings > Your data. Privacy: Settings > Privacy.

Background location: used only to notice arrival at / departure from workplaces the user creates, then ask "Clock in?" / "Clock out?" via a local notification. Region monitoring wakes the app; short location updates run only close to a workplace. The route is never stored.

How to test without travelling (about 2 minutes):
1. Open the app, allow location "While Using", then choose "Always" when asked (the app also works without it).
2. Settings tab > "Add workplace". Tap "Use current location" (a 100 m radius is fine). Under "Ask after I've been there for" choose "Right away" and under "Only between" choose "Any time"; make sure today is an active day.
3. Allow notifications. To test arrival, leave the workplace area and come back (or use Simulator > Features > Location > City Run / Custom Location). A local notification with action buttons ("Clock in" etc.) appears. For departure, clock in on Today, then move outside the radius; set the departure delay to its shortest value.
4. Settings > "Precision & status" and "Background location" show live status (why and how often location is sampled, GPS budget, and a log of decisions).
5. Without Always permission the app falls back to manual and time-based reminders.
```
Labels match the current UI (apps/mobile/src/app); adjust if the UI wording changes before submission.

## 9. Screenshots needed (6.9" and 6.5"/5.5" as required by console) -- see `store-listing.md`.
