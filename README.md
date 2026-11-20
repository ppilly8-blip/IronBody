# IronBody – free no-equipment workouts

74 exercises, ready-made routines, isometric holds with a countdown timer, step-by-step pictures and a pause button. No or minimal equipment, no account, works offline.

This folder turns the app into something you can install, and GitHub (free) does the building for you, so nothing has to be installed on your computer:

| You want | Use |
|---|---|
| An app on any phone or PC (Android, iPhone, Windows, Mac) | **Part A – web address** |
| An Android `.apk` file | **Part B – APK** |

## Step 0 – put this folder on GitHub (once)

1. Make a free account at github.com, then click **New repository**. Name it `ironbody`, choose **Public**, click **Create repository**.
2. On the new page click **uploading an existing file**. Drag in **everything inside this folder** (all folders and files, not the zip itself). When the upload finishes, click **Commit changes**.
3. Check the file list on the repository page. You should see `.github`, `android-overlay`, `keystore`, `scripts`, `www`, `package.json` and more.
   - `.github` missing? It is a hidden folder (on a Mac press Cmd+Shift+. in Finder to show it). Without it nothing gets built. Fix: **Add file → Create new file**, type `.github/workflows/build-apk.yml` as the name, paste the text of that file from this folder, commit. Do the same for `.github/workflows/pages.yml`.

## Part A – install from a web address (works on iPhone too)

1. In the repository open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
2. Open the **Actions** tab. If **Publish web app** has a red ✗ (Pages was not switched on yet), open it and press **Re-run all jobs**. Wait for the green ✓ (about a minute).
3. Your app address is `https://YOURNAME.github.io/ironbody/` (YOURNAME = your GitHub user name).
4. Open that address on the phone or PC:
   - **Android (Chrome):** ⋮ menu → **Install app** (or *Add to Home screen*).
   - **iPhone (Safari):** Share button → **Add to Home Screen**.
   - **PC (Chrome or Edge):** install icon at the right end of the address bar.

After the first visit it works without internet. Only the Wikipedia photos in the exercise guide need a connection.

## Part B – Android APK

1. **Actions** tab → **Build Android APK** → **Run workflow**. It also starts by itself after the upload. The first build takes roughly 5–10 minutes.
2. When it shows the green ✓, open **Releases** (right side of the repository front page) and tap **IronBody.apk** to download it.
   The newest build is always at `https://github.com/YOURNAME/ironbody/releases/latest/download/IronBody.apk`.
3. Open the downloaded file on the phone. Android asks once to allow installs from your browser or Files app – allow it. If Play Protect says "unknown developer", choose **Install anyway** (it is your own app, not from the Play Store).
4. A newer build installs over the old one and keeps your data, because every build is signed with the same key (`keystore/debug.keystore`) and gets a higher version number.

The APK build runs on GitHub's servers and could not be test-run before this folder was handed over, so the very first build may need a small fix. If it shows a red ✗, open it, copy the red error lines and send them to Claude.

## Updating the app

Replace `www/index.html` (**Add file → Upload files**, same name) with the new version. Both builds start again by themselves.

## Publishing in the stores later

- **Google Play:** a one-time US$25 registration fee. Needs a release-signed bundle made with your own key – not the debug key in `keystore/`. Change `appId` in `capacitor.config.json` first if you want your own name; it cannot be changed after publishing.
- **Apple App Store:** US$99 per year, and a Mac with Xcode to build. Apple can reject apps that are only a website in a wrapper (App Review Guideline 4.2). iOS is not set up in this folder; on iPhone use Part A.
- **Microsoft Store:** registration is free now (since 2025 for individuals, May 2026 for companies). The web address from Part A can be packaged with pwabuilder.com.

## For developers

```
npm ci                      # once
npm run android:prepare     # builds android/ from the Capacitor template + android-overlay/
cd android && ./gradlew assembleDebug     # needs JDK 21 and the Android SDK
npm run android:open        # or open android/ in Android Studio
```

- `www/` – the app (one page, offline support, fonts and icons included)
- `android-overlay/` – app icon and launch screen, copied over the generated Android project
- `scripts/prepare-android.js` – creates `android/` (not stored in git) and applies the overlay
- `.github/workflows/` – the two automatic builds
- Requires Node 22 or newer.
