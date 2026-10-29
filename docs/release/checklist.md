# Pre-submission checklist

Legend: [ ] todo, owner in brackets. Sources are in the other docs of this folder.

## Blockers (fix before any external review)
- [ ] Replace `privacy@example.com` in `apps/mobile/src/app/privacy.tsx` and add the hosted privacy policy link inside the app (Guideline 5.1.1(i): link in App Store Connect *and* in-app). [code]
- [ ] Host `privacy-policy.md` publicly (GitHub Pages), fill in name/address/contact, paste URL into App Store Connect and Play Console. [owner]
- [ ] Android: add a prominent disclosure before the background-location prompt (text in `google-play.md` section 3). The Location screen currently shows only a denied-state card. [code]
- [ ] Decide on `UIBackgroundModes: remote-notification` (unused, recommend removing). [owner/code]
- [ ] Unify the two `NSLocationWhenInUseUsageDescription` strings (infoPlist vs expo-location plugin). [owner]

## Accounts and records
- [ ] Apple Developer Program active, Team ID noted. [owner]
- [ ] App Store Connect app record created (bundle id `com.worktime.app`), `ascAppId` and Team ID put into `eas.json`. [owner]
- [ ] Play Console developer account, app created, service account key created (not committed; `secrets/` in `.gitignore`). [owner]
- [ ] `eas login`, `eas init` run; `extra.eas.projectId` committed. [owner]

## Build hygiene
- [ ] `npx expo install --check`, `npx -y expo-doctor` (20/20 passed on 2026-10-29), `npx tsc --noEmit`, `npx expo lint`, `npm test`. [dev]
- [ ] `npx expo install expo-dev-client` if a development profile build is wanted (not in package.json). [dev]
- [ ] `version` 1.0.0 in `app.json`; build number is remote (`autoIncrement`). [dev]
- [ ] Production build succeeds for both platforms; inspect merged Android manifest in Play bundle explorer: no unexpected permissions; target SDK 36. [dev]
- [ ] Privacy manifest: no ITMS-91053 email after upload; if one comes, add the category/reason to `ios.privacyManifests`. [dev]

## Device testing (real devices, release build)
- [ ] iOS: permission flow While Using -> Always; denied path usable; arrival and departure notifications with actions; behaviour after app swipe-away; export CSV/JSON; import; delete all data. [QA]
- [ ] Android 14/15/16: same, plus foreground service notification appears only near a workplace; sampling starts from a geofence while the app is closed; OEM battery-saver hint. [QA]
- [ ] Dark mode, Dynamic Type/font scale, VoiceOver/TalkBack on main flows. [QA]
- [ ] Works with no network (airplane mode). [QA]

## App Store Connect (see `app-store.md`)
- [ ] App Privacy: Data Not Collected. [owner]
- [ ] Age rating questionnaire (expected 4+). [owner]
- [ ] Export compliance resolved (key set; nothing to answer). [owner]
- [ ] Listing text (EN/DE), keywords, screenshots (real device), icon, support URL, privacy URL. [owner]
- [ ] App Review notes pasted; reviewer demo steps verified by following them once on a fresh install. [owner]
- [ ] TestFlight: internal group created, testers invited; Test Information filled for external testing. [owner]

## Google Play Console (see `google-play.md`)
- [ ] Data safety: No data collected or shared; privacy policy URL. [owner]
- [ ] Background location declaration text pasted; video (<=30 s) recorded and linked. [owner]
- [ ] Foreground service declaration (location / geofencing) with the same video. [owner]
- [ ] Content rating, target audience 18+, ads: none, app access: no login. [owner]
- [ ] Store listing, icon 512, feature graphic 1024x500, phone screenshots. [owner]
- [ ] Internal testing: email list, opt-in link shared; for production on a new personal account, closed test requirement (verify in console). [owner]

## Consistency check
- [ ] In-app Privacy screen, privacy-policy.md, App Privacy label and Data safety all say the same thing: local-only, no collection, no sharing, export/delete in-app. [owner]
- [ ] Nothing in the listing promises unreleased features (watch, widgets, Live Activity). [owner]
