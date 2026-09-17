#!/usr/bin/env node
// Print the Maestro flow files that belong to shard <index> of <total>, so CI
// can spread the suite over several emulators or simulators. Flows are sorted
// by file name and dealt round-robin, which keeps the shards the same size
// and stable between runs. Live-tagged flows are listed too; the caller's
// --include-tags keeps them out of fixture runs.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const [indexArg, totalArg] = process.argv.slice(2);
const index = Number(indexArg);
const total = Number(totalArg);
if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || index < 0 || index >= total) {
  console.error('usage: node example/.maestro/shard.mjs <index> <total>');
  process.exit(2);
}

const flowsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'flows');
const files = readdirSync(flowsDir)
  .filter((name) => name.endsWith('.yaml'))
  .sort();
const shard = files.filter((_, position) => position % total === index);
console.log(
  shard.map((name) => path.join('example/.maestro/flows', name)).join(' ')
);
