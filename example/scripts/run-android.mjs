#!/usr/bin/env node
// `yarn example android` with no setup: find the Android SDK, start an emulator
// if no device is connected, forward Metro (8081) and the token relay (8787)
// into it so the iOS `.env` works unchanged, then hand off to Expo.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fail = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const home = os.homedir();
const sdk = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  path.join(home, 'Library/Android/sdk'),
  path.join(home, 'Android/Sdk'),
  '/usr/local/lib/android/sdk',
]
  .filter(Boolean)
  .find((candidate) => existsSync(path.join(candidate, 'platform-tools')));
if (!sdk) {
  fail(
    'Android SDK not found. Install Android Studio (https://developer.android.com/studio), or set ANDROID_HOME to your SDK folder.'
  );
}
process.env.ANDROID_HOME = sdk;
process.env.PATH = `${path.join(sdk, 'platform-tools')}:${path.join(sdk, 'emulator')}:${process.env.PATH}`;
const adb = path.join(sdk, 'platform-tools', 'adb');
const emulator = path.join(sdk, 'emulator', 'emulator');

// Gradle needs JDK 17–21. Prefer a valid JAVA_HOME, then Android Studio's
// bundled JDK, then a system JDK 17 or 21 — so a fresh Mac with only Android
// Studio installed (or one whose default `java` is newer) still builds.
const javaMajor = (javaHome) => {
  try {
    const out = spawnSync(path.join(javaHome, 'bin', 'java'), ['-version'], { encoding: 'utf8' });
    const match = /version "(\d+)/.exec(`${out.stderr}${out.stdout}`);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
};
const usableJdk = (javaHome) => javaHome && existsSync(javaHome) && javaMajor(javaHome) >= 17 && javaMajor(javaHome) <= 21;
const javaHomeFor = (version) => {
  try {
    return execFileSync('/usr/libexec/java_home', ['-v', version], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
};
const jvmFolders = (root) => {
  try {
    return readdirSync(root).map((name) => path.join(root, name, 'Contents', 'Home'));
  } catch {
    return [];
  }
};
const candidates = [
  process.env.JAVA_HOME,
  '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
  javaHomeFor('17'),
  javaHomeFor('21'),
  '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  ...jvmFolders('/Library/Java/JavaVirtualMachines'),
  ...jvmFolders(path.join(home, 'Library/Java/JavaVirtualMachines')),
].filter(Boolean);
let jdk = candidates.find(usableJdk);
if (!jdk) {
  // Last resort: any JDK 17 or newer, and let Gradle report if it is too new.
  jdk = candidates.find((javaHome) => javaHome && existsSync(javaHome) && javaMajor(javaHome) >= 17);
  if (jdk) console.warn(`Using JDK ${javaMajor(jdk)} at ${jdk}; the Android build is tested with JDK 17–21.`);
}
if (!jdk) {
  fail(
    'No JDK found. Install Android Studio (its bundled JDK is used automatically) or JDK 17 (brew install openjdk@17), or set JAVA_HOME.'
  );
}
process.env.JAVA_HOME = jdk;
process.env.PATH = `${path.join(jdk, 'bin')}:${process.env.PATH}`;

const run = (file, args) =>
  execFileSync(file, args, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();

const connectedDevices = () =>
  run(adb, ['devices'])
    .split('\n')
    .slice(1)
    .filter((line) => line.trim().endsWith('device'))
    .map((line) => line.split('\t')[0]);

let devices = connectedDevices();
if (devices.length === 0) {
  const avds = existsSync(emulator)
    ? run(emulator, ['-list-avds'])
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('INFO') && !line.includes(' '))
    : [];
  if (avds.length === 0) {
    fail(
      'No Android device is connected and no emulator exists yet.\nCreate one in Android Studio → Device Manager (any Pixel with Android 8.0+), or plug in a phone with USB debugging on, then run this again.'
    );
  }
  const avd = avds.find((name) => /pixel/i.test(name)) ?? avds[0];
  console.log(`No Android device is running. Starting the "${avd}" emulator…`);
  spawn(emulator, ['-avd', avd], { detached: true, stdio: 'ignore' }).unref();
  run(adb, ['wait-for-device']);
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (run(adb, ['shell', 'getprop', 'sys.boot_completed']) === '1') break;
    await sleep(2000);
  }
  devices = connectedDevices();
  if (devices.length === 0) fail('The emulator did not finish booting. Open it from Android Studio and run this again.');
}

// The emulator's (or USB phone's) localhost becomes this computer's localhost for
// Metro and the token relay, so example/.env needs no Android-specific edits.
for (const serial of devices) {
  for (const port of [8081, 8787]) {
    spawnSync(adb, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'ignore' });
  }
}

const result = spawnSync('npx', ['expo', 'run:android', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
