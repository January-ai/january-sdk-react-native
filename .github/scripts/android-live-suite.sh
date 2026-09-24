#!/usr/bin/env bash
# Runs the live Maestro flows against the January API on the Android emulator
# that reactivecircus/android-emulator-runner booted. The action executes every
# line of its `script` input in a separate shell, so the suite lives in this
# file. The token relay is already listening on the runner at 127.0.0.1:8787;
# the app reaches it, and Metro, through adb reverse.
#
#   android-live-suite.sh <apk>
set -euo pipefail

apk="$1"

adb install -r "$apk"
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8787 tcp:8787

# Metro without fixtures, so the app calls the January API with tokens from
# the relay. EXPO_PUBLIC_JANUARY_TOKEN_ENDPOINT and EXPO_PUBLIC_DEMO_END_USER_ID
# come from the job. Full bundles, as in the fixture shards.
CI=1 EXPO_NO_METRO_LAZY=1 yarn example start --port 8081 > "$RUNNER_TEMP/metro-android-live.log" 2>&1 &
metro_pid=$!
trap 'kill "$metro_pid" 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do
  curl --fail --silent http://127.0.0.1:8081/status >/dev/null && break
  sleep 2
done
curl --fail --silent http://127.0.0.1:8081/status
echo
# Bundle once before the first flow launches the app, as the fixture shards do.
bundle_url="$(curl --fail --silent -H 'expo-platform: android' http://127.0.0.1:8081/ \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).launchAsset.url))')"
echo "Warming up $bundle_url"
curl --fail --silent --output /dev/null --max-time 600 "$bundle_url"

# One flow at a time, 30 seconds apart, stopping at the first failure; see
# scripts/ui-live.mjs.
node scripts/ui-live.mjs --device emulator-5554 --debug-output example/.maestro/artifacts/live
