#!/usr/bin/env node
/*
 * Builds the android/ project folder for IronBody.
 *
 *   1. creates android/ from the official Capacitor template (only if it is missing)
 *   2. puts our own app icon + launch screen on top of it (android-overlay/)
 *   3. applies two tiny text patches (vibration permission, dark launch-screen colour)
 *   4. copies www/ into the Android app ("cap sync")
 *
 * Safe to run as often as you like. Run "npm ci" once before the first time.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'android');
const mainDir = path.join(androidDir, 'app', 'src', 'main');
const resDir = path.join(mainDir, 'res');
const overlayDir = path.join(root, 'android-overlay');

const log = (msg) => console.log('[prepare-android] ' + msg);
const fail = (msg) => {
  console.error('[prepare-android] ERROR: ' + msg);
  process.exit(1);
};

function cap(...args) {
  const bin = path.join(root, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor');
  if (!fs.existsSync(bin)) fail('Capacitor is not installed yet. Run "npm ci" first, then try again.');
  execFileSync(process.execPath, [bin, ...args], { cwd: root, stdio: 'inherit' });
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

// ---- 0. the web app must be there --------------------------------------------------------
if (!fs.existsSync(path.join(root, 'www', 'index.html'))) fail('www/index.html is missing.');

// ---- 1. Android project from the Capacitor template --------------------------------------
if (!fs.existsSync(path.join(androidDir, 'app'))) {
  log('creating the Android project (first run) ...');
  cap('add', 'android');
} else {
  log('android/ already exists - reusing it');
}
if (!fs.existsSync(resDir)) fail('android/app/src/main/res not found - the Capacitor template looks different than expected.');

// ---- 2. our icon + launch screen ----------------------------------------------------------
// The template ships a generic splash.png in several drawable folders. Our launch screen is
// drawable/splash.xml, so the template pictures have to go (two files with the same name in
// one folder would stop the build).
for (const name of fs.readdirSync(resDir)) {
  if (!/^drawable(-.+)?$/.test(name)) continue;
  const dir = path.join(resDir, name);
  const png = path.join(dir, 'splash.png');
  if (fs.existsSync(png)) fs.rmSync(png);
  if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}
if (!fs.existsSync(overlayDir)) fail('android-overlay/ folder is missing.');
copyDir(overlayDir, androidDir);
log('icons + launch screen copied in');

// ---- 3. small text patches ------------------------------------------------------------------
// 3a. permission to vibrate (buzz at the end of a set or hold)
const manifestFile = path.join(mainDir, 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestFile, 'utf8');
if (!manifest.includes('android.permission.VIBRATE')) {
  if (!manifest.includes('</manifest>')) fail('AndroidManifest.xml has no </manifest> tag.');
  manifest = manifest.replace(
    '</manifest>',
    '    <!-- buzz at the end of a set / hold (navigator.vibrate) -->\n' +
      '    <uses-permission android:name="android.permission.VIBRATE" />\n</manifest>'
  );
  fs.writeFileSync(manifestFile, manifest);
  log('added the vibrate permission');
}

// 3b. dark background for the Android 12+ launch screen
const stylesFile = path.join(resDir, 'values', 'styles.xml');
let styles = fs.readFileSync(stylesFile, 'utf8');
if (!styles.includes('windowSplashScreenBackground')) {
  const launchTheme = /(<style\s+name="AppTheme\.NoActionBarLaunch"[^>]*>)([\s\S]*?)(<\/style>)/;
  if (!launchTheme.test(styles)) fail('launch theme not found in styles.xml - the Capacitor template looks different than expected.');
  styles = styles.replace(
    launchTheme,
    (all, open, body, close) =>
      open +
      body.replace(/\s*$/, '\n') +
      '        <!-- Android 12+ launch screen: dark background like the app -->\n' +
      '        <item name="windowSplashScreenBackground">@color/ic_launcher_background</item>\n    ' +
      close
  );
  fs.writeFileSync(stylesFile, styles);
  log('set the launch-screen colour');
}

// 3c. version number: the automatic build passes its run number, so every new APK is newer
//     than the one before (Android refuses to install an older number over a newer one).
const build = parseInt(process.env.IRONBODY_BUILD_NUMBER || '', 10);
if (build > 0) {
  const gradleFile = path.join(androidDir, 'app', 'build.gradle');
  const gradle = fs.readFileSync(gradleFile, 'utf8');
  if (!/versionCode\s+\d+/.test(gradle) || !/versionName\s+"[^"]*"/.test(gradle)) {
    fail('versionCode / versionName not found in app/build.gradle - the Capacitor template looks different than expected.');
  }
  fs.writeFileSync(
    gradleFile,
    gradle.replace(/versionCode\s+\d+/, 'versionCode ' + build).replace(/versionName\s+"[^"]*"/, 'versionName "1.0.' + build + '"')
  );
  log('version set to 1.0.' + build + ' (code ' + build + ')');
}

// 3d. sign with the fixed key in keystore/. Without this, every build machine invents its own
//     random debug key, and Android refuses to install a newer APK over an older one.
{
  const gradleFile = path.join(androidDir, 'app', 'build.gradle');
  const gradle = fs.readFileSync(gradleFile, 'utf8');
  if (!gradle.includes('ironbodyDebug')) {
    if (!fs.existsSync(path.join(root, 'keystore', 'debug.keystore'))) fail('keystore/debug.keystore is missing.');
    const buildTypes = /^([ \t]*)buildTypes\s*\{/m;
    const found = buildTypes.exec(gradle);
    if (!found) fail('buildTypes block not found in app/build.gradle - the Capacitor template looks different than expected.');
    const i = found[1];
    const block =
      i + 'signingConfigs {\n' +
      i + '    ironbodyDebug {\n' +
      i + '        storeFile file("../../keystore/debug.keystore")\n' +
      i + '        storePassword "android"\n' +
      i + '        keyAlias "androiddebugkey"\n' +
      i + '        keyPassword "android"\n' +
      i + '    }\n' +
      i + '}\n' +
      i + 'buildTypes {\n' +
      i + '    debug {\n' +
      i + '        signingConfig signingConfigs.ironbodyDebug\n' +
      i + '    }';
    fs.writeFileSync(gradleFile, gradle.replace(buildTypes, () => block));
    log('debug builds are signed with keystore/debug.keystore');
  }
}

// ---- 4. copy the web app into the Android app ----------------------------------------------
log('copying www/ into the Android app ...');
cap('sync', 'android');

// ---- 5. quick self-check ---------------------------------------------------------------------
const needed = [
  'assets/public/index.html',
  'assets/capacitor.config.json',
  'res/drawable/splash.xml',
  'res/drawable-nodpi/splash_logo.png',
  'res/values/ic_launcher_background.xml',
  'res/mipmap-xxxhdpi/ic_launcher_foreground.png',
];
const missing = needed.filter((f) => !fs.existsSync(path.join(mainDir, f)));
if (missing.length) fail('something went wrong, these files are missing: ' + missing.join(', '));

log('done. Next: cd android && ./gradlew assembleDebug   (or: npx cap open android)');
