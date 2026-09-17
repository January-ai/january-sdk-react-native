#!/usr/bin/env bash
# Runs one shard of the Maestro suite on the Android emulator that
# reactivecircus/android-emulator-runner booted. The action executes every line
# of its `script` input in a separate shell, so the suite lives in this file.
#
#   android-ui-suite.sh <apk> <shard index> <shard count>
set -euo pipefail

apk="$1"
shard="$2"
shards="$3"

adb install -r "$apk"
adb reverse tcp:8081 tcp:8081

CI=1 yarn ui:start > "$RUNNER_TEMP/metro-android.log" 2>&1 &
metro_pid=$!
trap 'kill "$metro_pid" 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do
  curl --fail --silent http://127.0.0.1:8081/status >/dev/null && break
  sleep 2
done
curl --fail --silent http://127.0.0.1:8081/status
echo
# Bundle once before the first flow launches the app. Bundling 1,200 modules
# while the emulator boots the app starved the runner enough for the launcher
# to hang; warming Metro's transform cache first keeps the first flow honest.
bundle_url="$(curl --fail --silent -H 'expo-platform: android' http://127.0.0.1:8081/ \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).launchAsset.url))')"
echo "Warming up $bundle_url"
curl --fail --silent --output /dev/null --max-time 600 "$bundle_url"

flows="$(node example/.maestro/shard.mjs "$shard" "$shards")"
echo "Flows in shard $shard of $shards: $flows"
test -n "$flows"

# shellcheck disable=SC2086 # the shard is a space-separated list of files
.github/scripts/run-maestro-shard.sh emulator-5554 android-results $flows
