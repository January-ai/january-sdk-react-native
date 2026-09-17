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

mkdir -p example/.maestro/artifacts
flows="$(node example/.maestro/shard.mjs "$shard" "$shards")"
echo "Flows in shard $shard of $shards: $flows"
test -n "$flows"

# shellcheck disable=SC2086 # the shard is a space-separated list of files
maestro test --device emulator-5554 $flows \
  --include-tags fixture,parity \
  --debug-output example/.maestro/artifacts/debug --flatten-debug-output \
  --format JUNIT --output example/.maestro/artifacts/android-results.xml
