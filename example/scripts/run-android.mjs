#!/usr/bin/env node
// `yarn example android` with no setup: find the Android SDK and a JDK, start
// an emulator if no device is connected, forward Metro (8081) and the token
// relay (8787) into it so the iOS `.env` works unchanged, then hand off to Expo.
// Works on macOS, Linux, and Windows.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const isWindows = process.platform === 'win32';
const exe = (name) => (isWindows ? `${name}.exe` : name);
const home = os.homedir();

const fail = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const output = (file, args, options = {}) =>
  execFileSync(file, args, { stdio: ['ignore', 'pipe', 'ignore'], ...options })
    .toString()
    .trim();
const prependPath = (dir) => {
  process.env.PATH = `${dir}${path.delimiter}${process.env.PATH ?? ''}`;
};

// ——— Android SDK ————————————————————————————————————————————————————————————

const sdkCandidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  path.join(home, 'Library/Android/sdk'), // macOS
  path.join(home, 'Android/Sdk'), // Linux
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'), // Windows
  '/usr/local/lib/android/sdk',
].filter(Boolean);
const sdk = sdkCandidates.find((candidate) =>
  existsSync(path.join(candidate, 'platform-tools', exe('adb')))
);
if (!sdk) {
  fail(
    'Android SDK not found. Install Android Studio (https://developer.android.com/studio), or set ANDROID_HOME to your SDK folder.'
  );
}
process.env.ANDROID_HOME = sdk;
const adb = path.join(sdk, 'platform-tools', exe('adb'));
const emulator = path.join(sdk, 'emulator', exe('emulator'));
prependPath(path.join(sdk, 'emulator'));
prependPath(path.join(sdk, 'platform-tools'));

// ——— JDK 17–21 ———————————————————————————————————————————————————————————————
// Gradle needs JDK 17–21. Prefer a valid JAVA_HOME, then Android Studio's
// bundled JDK, then a system or Homebrew JDK — so a machine with only Android
// Studio installed, or whose default `java` is newer, still builds.

const javaMajor = (javaHome) => {
  try {
    const result = spawnSync(path.join(javaHome, 'bin', exe('java')), ['-version'], {
      encoding: 'utf8',
    });
    const match = /version "(\d+)/.exec(`${result.stderr ?? ''}${result.stdout ?? ''}`);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
};
const jvmFolders = (root) => {
  try {
    return readdirSync(root).map((name) => path.join(root, name, 'Contents', 'Home'));
  } catch {
    return [];
  }
};
const javaHomeFor = (version) => {
  if (isWindows) return '';
  try {
    return output('/usr/libexec/java_home', ['-v', version]);
  } catch {
    return '';
  }
};
const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files';
const jdkCandidates = [
  process.env.JAVA_HOME,
  '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
  path.join(programFiles, 'Android', 'Android Studio', 'jbr'),
  path.join(home, 'android-studio', 'jbr'),
  '/opt/android-studio/jbr',
  javaHomeFor('17'),
  javaHomeFor('21'),
  '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  ...jvmFolders('/Library/Java/JavaVirtualMachines'),
  ...jvmFolders(path.join(home, 'Library/Java/JavaVirtualMachines')),
  '/usr/lib/jvm/java-17-openjdk-amd64',
  '/usr/lib/jvm/java-21-openjdk-amd64',
].filter((candidate) => candidate && existsSync(candidate));
const inRange = (javaHome) => {
  const major = javaMajor(javaHome);
  return major >= 17 && major <= 21;
};
let jdk = jdkCandidates.find(inRange);
if (!jdk) {
  // Last resort: any JDK 17 or newer; Gradle reports if it is too new.
  jdk = jdkCandidates.find((javaHome) => javaMajor(javaHome) >= 17);
  if (jdk) console.warn(`Using JDK ${javaMajor(jdk)} at ${jdk}; the Android build is tested with JDK 17–21.`);
}
if (!jdk) {
  fail(
    'No JDK found. Install Android Studio (its bundled JDK is used automatically) or JDK 17, or set JAVA_HOME.'
  );
}
process.env.JAVA_HOME = jdk;
prependPath(path.join(jdk, 'bin'));

// ——— Device ——————————————————————————————————————————————————————————————————

const connectedDevices = () =>
  output(adb, ['devices'])
    .split('\n')
    .slice(1)
    .filter((line) => line.trim().endsWith('device'))
    .map((line) => line.split('\t')[0]);

const bootCompleted = (serial) => {
  try {
    return output(adb, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed']) === '1';
  } catch {
    return false;
  }
};

let devices = connectedDevices();
if (devices.length === 0) {
  const avds = existsSync(emulator)
    ? output(emulator, ['-list-avds'])
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
  const child = spawn(emulator, ['-avd', avd], { detached: true, stdio: 'ignore' });
  child.on('error', (error) => fail(`Could not start the emulator: ${error.message}`));
  child.unref();

  // Bounded wait: adb wait-for-device would block forever on a failed launch.
  const deadline = Date.now() + 180_000;
  let booted = false;
  while (Date.now() < deadline) {
    devices = connectedDevices();
    if (devices.length > 0 && bootCompleted(devices[0])) {
      booted = true;
      break;
    }
    await sleep(2000);
  }
  if (!booted) {
    fail(
      `The "${avd}" emulator did not finish booting within 3 minutes. Open it from Android Studio → Device Manager, wait for the home screen, then run this again.`
    );
  }
}

// ——— Port forwarding —————————————————————————————————————————————————————————
// The device's localhost becomes this computer's localhost for Metro and the
// token relay, so example/.env needs no Android-specific edits.

for (const serial of devices) {
  for (const port of [8081, 8787]) {
    const result = spawnSync(adb, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], {
      encoding: 'utf8',
    });
    if (result.error || result.status !== 0) {
      fail(
        `Could not forward port ${port} into ${serial}: ${result.error?.message ?? result.stderr?.trim() ?? `adb exited ${result.status}`}\nThe app would not reach Metro or the token relay. Check that USB debugging is authorized on the device, then run this again.`
      );
    }
  }
}

// ——— Hand off to Expo ————————————————————————————————————————————————————————

const result = spawnSync(exe('npx'), ['expo', 'run:android', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
  shell: isWindows,
});
process.exit(result.status ?? 1);
