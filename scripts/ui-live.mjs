#!/usr/bin/env node
// Runs the live Maestro flows (tagged `live`) one at a time against the
// January API, pausing between flows so the app and the checks stay well
// under the API's per-user request rate, and stopping at the first flow that
// fails. A failure because the account's request allowance is used up (429
// rate_limited) stops the run cleanly, before the next flow changes any data,
// and prints the command that resumes it. The weight flow runs last, so a run
// that cannot finish never logs a weight it cannot take back.
//
//   node scripts/ui-live.mjs --device <id> [--from <flow>] [--pause <seconds>]
//     [--debug-output <dir>] [-- <extra maestro test arguments>]
//
// `--from 95` resumes at 95-live-food-logs.yaml. Arguments after `--` go to
// every `maestro test`, for example `-e JANUARY_RELAY_TOKEN=...`.
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const root = path.resolve(import.meta.dirname, '..');
const flowsRoot = path.join(root, 'example', '.maestro', 'flows');

const args = process.argv.slice(2);
const separator = args.indexOf('--');
const ownArgs = separator >= 0 ? args.slice(0, separator) : args;
const maestroArgs = separator >= 0 ? args.slice(separator + 1) : [];
const option = (name) => {
  const index = ownArgs.indexOf(`--${name}`);
  return index >= 0 ? ownArgs[index + 1] : undefined;
};
const device = option('device');
const from = option('from');
const pauseSeconds = Number(option('pause') ?? 30);
const debugOutput = option('debug-output');

const flows = readdirSync(flowsRoot)
  .filter((name) => name.endsWith('.yaml'))
  .sort()
  .filter((name) => {
    const [header] = yaml.loadAll(
      readFileSync(path.join(flowsRoot, name), 'utf8')
    );
    return (header?.tags ?? []).includes('live');
  });
const start = from ? flows.findIndex((name) => name.startsWith(from)) : 0;
if (start < 0) {
  console.error(
    `No live flow starts with "${from}". Live flows: ${flows.join(', ')}`
  );
  process.exit(2);
}

const resume = (flow) =>
  [
    'corepack yarn ui:test:live',
    device ? `--device ${device}` : '',
    `--from ${flow.slice(0, 2)}`,
    debugOutput ? `--debug-output ${debugOutput}` : '',
    maestroArgs.length ? `-- ${maestroArgs.join(' ')}` : '',
  ]
    .filter(Boolean)
    .join(' ');

function runFlow(flow) {
  const command = [
    ...(device ? ['--device', device] : []),
    'test',
    path.join('example', '.maestro', 'flows', flow),
    '--include-tags',
    'live',
    ...(debugOutput
      ? [
          '--debug-output',
          path.join(debugOutput, flow.replace(/\.yaml$/, '')),
          '--flatten-debug-output',
        ]
      : []),
    ...maestroArgs,
  ];
  return new Promise((resolve) => {
    const child = spawn('maestro', command, { cwd: root });
    let transcript = '';
    const relay = (stream, sink) =>
      stream.on('data', (chunk) => {
        const text = chunk.toString();
        transcript += text;
        sink.write(text);
      });
    relay(child.stdout, process.stdout);
    relay(child.stderr, process.stderr);
    child.on('close', (code) => resolve({ code, transcript }));
  });
}

for (let index = start; index < flows.length; index += 1) {
  const flow = flows[index];
  console.log(`\n=== ${flow} (${index + 1} of ${flows.length})`);
  const { code, transcript } = await runFlow(flow);
  if (code !== 0) {
    const limited = /RATE_LIMITED|rate_limited|Too many requests/.test(
      transcript
    );
    console.log(
      limited
        ? `\nThe January API account has no requests left, so the run stopped at ${flow} before anything else changed.`
        : `\n${flow} failed, so the run stopped there.`
    );
    console.log(`Resume with:\n  ${resume(flow)}`);
    process.exit(limited ? 3 : 1);
  }
  if (index < flows.length - 1 && pauseSeconds > 0) {
    console.log(`Pausing ${pauseSeconds} s before the next flow.`);
    await new Promise((resolve) => setTimeout(resolve, pauseSeconds * 1000));
  }
}
console.log('\nEvery live flow passed.');
