import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// example/.maestro/live/api.js runs inside Maestro, which gives it a
// synchronous `http`, an `output` object shared by a flow's scripts, and the
// flow's env values as globals. These tests run it the same way against a
// fake relay and API, so the live checks are tested without a live request.

const source = readFileSync(
  path.join(__dirname, '..', '..', 'example', '.maestro', 'live', 'api.js'),
  'utf8'
);
const TOKEN = 'ct-test-secret-token-0123456789';

interface Reply {
  status: number;
  body?: unknown;
}

function fakeMaestro(routes: (url: string) => Reply) {
  const requests: string[] = [];
  const logs: string[] = [];
  const output: Record<string, unknown> = {};
  let clock = Date.parse('2026-09-22T16:00:00Z');
  const respond = (url: string, reply: Reply) => ({
    ok: reply.status >= 200 && reply.status < 300,
    status: reply.status,
    body: reply.body === undefined ? '' : JSON.stringify(reply.body),
    url,
  });
  const http = {
    post: (url: string) => {
      requests.push(`POST ${url}`);
      return respond(url, {
        status: 201,
        body: {
          token: TOKEN,
          expires_in: 1800,
          end_user_id: 'qa-user',
        },
      });
    },
    get: (url: string, options: { headers: Record<string, string> }) => {
      requests.push(`GET ${url}`);
      expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
      return respond(url, routes(url));
    },
    delete: (url: string) => {
      requests.push(`DELETE ${url}`);
      return respond(url, routes(url));
    },
  };
  // A clock that moves only when read, so the pacing wait ends quickly.
  class FakeDate extends Date {
    static now() {
      clock += 250;
      return clock;
    }
  }

  function run(env: Record<string, string>) {
    const context = vm.createContext({
      ...env,
      Date: FakeDate,
      Intl,
      JSON,
      Math,
      Number,
      Object,
      String,
      console: { log: (line: string) => logs.push(line) },
      encodeURIComponent,
      http,
      output,
    });
    vm.runInContext(source, context);
  }

  return { logs, output, requests, run };
}

const noLogsToday = (url: string): Reply =>
  url.includes('/water-logs')
    ? { status: 200, body: { items: [] } }
    : {
        status: 404,
      };

describe('live API checks', () => {
  it('records the context and confirms the API answers before any change', () => {
    const maestro = fakeMaestro(noLogsToday);
    maestro.run({
      CHECK: 'context',
      TIMEZONE: 'America/New_York',
      USER_ID: 'qa-user',
    });
    expect(maestro.output.live).toMatchObject({
      timezone: 'America/New_York',
      user: 'qa-user',
    });
    expect(maestro.requests.filter((r) => r.startsWith('GET'))).toHaveLength(1);
    expect(maestro.logs.at(-1)).toBe('[api] the January API is answering');
  });

  it('stops at once with the reason when the account is rate limited', () => {
    const maestro = fakeMaestro(() => ({
      status: 429,
      body: {
        code: 'rate_limited',
        message: 'The window reopens at 2026-09-24T00:11:49Z.',
      },
    }));
    expect(() =>
      maestro.run({
        CHECK: 'context',
        TIMEZONE: 'America/New_York',
        USER_ID: 'qa-user',
      })
    ).toThrow(/RATE_LIMITED.*reopens at 2026-09-24T00:11:49Z/);
    expect(maestro.requests.filter((r) => r.startsWith('GET'))).toHaveLength(1);
  });

  it('compares the water total with the app and the expected change', () => {
    let total: number | undefined;
    const maestro = fakeMaestro((url) =>
      url.includes('/water-logs')
        ? {
            status: 200,
            body: {
              items:
                total === undefined
                  ? []
                  : [
                      {
                        date: '2026-09-22',
                        total: { unit: 'fl_oz', value: total },
                      },
                    ],
            },
          }
        : { status: 404 }
    );
    maestro.run({
      CHECK: 'context',
      TIMEZONE: 'America/New_York',
      USER_ID: 'qa-user',
    });
    maestro.run({ CHECK: 'water-total', UNIT: 'fl_oz', UI_TEXT: '—' });

    total = 8;
    maestro.run({
      CHECK: 'water-total',
      UNIT: 'fl_oz',
      UI_TEXT: '8 fl oz',
      EXPECT_CHANGE: '8',
    });
    expect(maestro.logs.at(-1)).toContain('changed by 8 as expected');

    // The app showing something else fails the flow.
    expect(() =>
      maestro.run({ CHECK: 'water-total', UNIT: 'fl_oz', UI_TEXT: '16 fl oz' })
    ).toThrow('app shows "16 fl oz", API has "8 fl oz"');
    // So does a total that moved by the wrong amount.
    expect(() =>
      maestro.run({
        CHECK: 'water-total',
        UNIT: 'fl_oz',
        UI_TEXT: '8 fl oz',
        EXPECT_CHANGE: '-8',
      })
    ).toThrow('moved by 0 fl_oz, expected -8');
  });

  it('builds the summary line the way the app does', () => {
    const maestro = fakeMaestro((url) =>
      url.includes('/food-logs/summary')
        ? {
            status: 200,
            body: {
              totals: {
                logs_count: 2,
                nutrients: { calories: { unit: 'kcal', value: 612.4 } },
              },
              average_per_logged_day: {
                nutrients: { calories: { unit: 'kcal', value: 306.2 } },
              },
            },
          }
        : noLogsToday(url)
    );
    maestro.run({
      CHECK: 'context',
      TIMEZONE: 'America/New_York',
      USER_ID: 'qa-user',
    });
    maestro.run({
      CHECK: 'food-summary',
      RANGE: 'day',
      UI_TEXT: '2 logs · 612 kcal · avg 306 kcal/day',
    });
    expect(maestro.logs.at(-1)).toContain('matches the app');
  });

  it('never prints the client token, and mints it once per flow', () => {
    const maestro = fakeMaestro(noLogsToday);
    maestro.run({
      CHECK: 'context',
      TIMEZONE: 'America/New_York',
      USER_ID: 'qa-user',
    });
    maestro.run({ CHECK: 'water-total', UNIT: 'ml', UI_TEXT: '—' });
    maestro.run({ CHECK: 'water-total', UNIT: 'fl_oz', UI_TEXT: '—' });
    expect(maestro.logs.join('\n')).not.toContain(TOKEN);
    expect(maestro.requests.filter((r) => r.startsWith('POST'))).toHaveLength(
      1
    );
  });

  it('paces its own requests to 20 a minute', () => {
    const maestro = fakeMaestro(noLogsToday);
    maestro.run({
      CHECK: 'context',
      TIMEZONE: 'America/New_York',
      USER_ID: 'qa-user',
    });
    for (let index = 0; index < 20; index += 1) {
      maestro.run({ CHECK: 'water-total', UNIT: 'fl_oz', UI_TEXT: '—' });
    }
    expect(maestro.logs.some((line) => line.includes('pacing: waiting'))).toBe(
      true
    );
  });
});
