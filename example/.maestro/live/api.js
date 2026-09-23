// Checks what the January API stored for the demo's end user against what the
// app shows, for the live flows. A flow runs it after each change it makes:
//
//   - runScript:
//       file: ../live/api.js
//       env:
//         CHECK: water-total
//         UNIT: fl_oz
//         UI_TEXT: ${output.uiText}
//
// context.yaml runs CHECK=context first. It records the end user and timezone
// the app uses, read from Settings, and makes one request to confirm the API
// is answering before the flow changes anything. Every check gets a client
// token for that user from the same token relay the app uses (one per flow,
// kept only in memory) and calls the January API directly. Tokens are never
// printed. A mismatch throws, which fails the flow; every result is logged
// with [api].
//
// The account's request allowance is shared with the app. These checks make
// at most 20 requests a minute of their own, and when the API answers 429
// rate_limited they stop the flow at once with the time the allowance
// reopens, instead of letting every later step fail.
//
// Optional env on the maestro command line:
//   JANUARY_TOKEN_ENDPOINT  default http://127.0.0.1:8787/api/january/client-token
//   JANUARY_RELAY_TOKEN     the relay's RELAY_TOKEN, for a hosted relay
//   JANUARY_API_URL         default https://partners.january.ai

// Maestro's script globals, and the env values a flow may pass (each read
// with a typeof check, since an env value not passed is not defined at all).
/* global http, output, CHECK, UNIT, UI_TEXT, NAME, EXPECT_CHANGE, EXPECT_VALUE,
   EXPECT_FOODS, RANGE, KIND, DAY, USER_ID, TIMEZONE, JANUARY_TOKEN_ENDPOINT,
   JANUARY_RELAY_TOKEN, JANUARY_API_URL */

var CALLS_PER_MINUTE = 20;

var tokenEndpoint =
  typeof JANUARY_TOKEN_ENDPOINT === 'undefined'
    ? 'http://127.0.0.1:8787/api/january/client-token'
    : JANUARY_TOKEN_ENDPOINT;
var relayToken =
  typeof JANUARY_RELAY_TOKEN === 'undefined' ? '' : JANUARY_RELAY_TOKEN;
var apiUrl =
  typeof JANUARY_API_URL === 'undefined'
    ? 'https://partners.january.ai'
    : JANUARY_API_URL;

// Env values a flow did not pass arrive undefined, or empty when a subflow
// forwards one it was not given; both mean "not set".
function envValue(name) {
  var value = rawEnvValue(name);
  return value === '' ? undefined : value;
}

function rawEnvValue(name) {
  switch (name) {
    case 'UNIT':
      return typeof UNIT === 'undefined' ? undefined : UNIT;
    case 'UI_TEXT':
      return typeof UI_TEXT === 'undefined' ? undefined : String(UI_TEXT);
    case 'NAME':
      return typeof NAME === 'undefined' ? undefined : NAME;
    case 'EXPECT_CHANGE':
      return typeof EXPECT_CHANGE === 'undefined' ? undefined : EXPECT_CHANGE;
    case 'EXPECT_VALUE':
      return typeof EXPECT_VALUE === 'undefined' ? undefined : EXPECT_VALUE;
    case 'EXPECT_FOODS':
      return typeof EXPECT_FOODS === 'undefined' ? undefined : EXPECT_FOODS;
    case 'RANGE':
      return typeof RANGE === 'undefined' ? undefined : RANGE;
    case 'KIND':
      return typeof KIND === 'undefined' ? undefined : KIND;
    case 'DAY':
      return typeof DAY === 'undefined' ? undefined : DAY;
    case 'USER_ID':
      return typeof USER_ID === 'undefined' ? undefined : USER_ID;
    case 'TIMEZONE':
      return typeof TIMEZONE === 'undefined' ? undefined : TIMEZONE;
    default:
      return undefined;
  }
}

function required(name) {
  var value = envValue(name);
  if (value === undefined) {
    throw new Error('[api] ' + CHECK + ' needs ' + name + '.');
  }
  return value;
}

function log(message) {
  console.log('[api] ' + message);
}

function fail(message) {
  log('MISMATCH ' + message);
  throw new Error('[api] ' + message);
}

// ---------------------------------------------------------------------------
// Dates, in the timezone the app uses.

function localDate(timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftDate(day, days) {
  var parts = day.split('-');
  var date = new Date(
    Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  );
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekday(day) {
  var parts = day.split('-');
  return new Date(
    Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  ).getUTCDay();
}

// The Logs tab's "This week": Sunday through Saturday of the current week.
function thisWeek(today) {
  var start = shiftDate(today, -weekday(today));
  return { start: start, end: shiftDate(start, 6) };
}

// The Tracking charts' ranges, ending today.
function chartRange(range, today) {
  if (range === 'week') return { start: shiftDate(today, -6), end: today };
  if (range === 'month') return { start: shiftDate(today, -29), end: today };
  var year = Number(today.slice(0, 4));
  var month = Number(today.slice(5, 7)) - 11;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  return {
    start: year + '-' + (month < 10 ? '0' : '') + month + '-01',
    end: today,
  };
}

// ---------------------------------------------------------------------------
// The API, through the relay.

// Waits, if needed, so this flow's own checks stay under CALLS_PER_MINUTE.
function pace() {
  var now = Date.now();
  var recent = (output._apiCalls || []).filter(function (time) {
    return now - time < 60000;
  });
  if (recent.length >= CALLS_PER_MINUTE) {
    var until = recent[0] + 60000;
    log('pacing: waiting ' + Math.ceil((until - now) / 1000) + ' s');
    while (Date.now() < until) {
      // Maestro's scripts have no timer to wait on.
    }
  }
  recent.push(Date.now());
  output._apiCalls = recent;
}

function rateLimited(response) {
  var body = {};
  try {
    body = JSON.parse(response.body);
  } catch {
    body = {};
  }
  var reason = body.message ? String(body.message) : 'no message';
  log(
    'RATE_LIMITED ' + response.status + ' ' + (body.code || '') + ': ' + reason
  );
  throw new Error(
    '[api] RATE_LIMITED: the January API account has no requests left (' +
      reason +
      '). Stopping this flow before it changes anything else.'
  );
}

function clientToken(user) {
  var cached = output._clientToken;
  if (cached && cached.user === user && cached.until > Date.now()) {
    return cached.token;
  }
  var headers = { 'January-End-User-ID': user };
  if (relayToken) headers.Authorization = 'Bearer ' + relayToken;
  var response = http.post(tokenEndpoint, { headers: headers, body: '' });
  if (response.status === 429) rateLimited(response);
  if (!response.ok) {
    fail('the token relay answered ' + response.status + ' for ' + user);
  }
  var body = JSON.parse(response.body);
  if (body.end_user_id && body.end_user_id !== user) {
    fail('the relay minted a token for ' + body.end_user_id + ', not ' + user);
  }
  var lifetime = Number(body.expires_in || body.expiresIn || 600);
  // Kept for this flow only, and replaced a minute before it expires.
  output._clientToken = {
    user: user,
    token: body.token,
    until: Date.now() + Math.max(lifetime - 60, 30) * 1000,
  };
  return body.token;
}

function api(method, path) {
  pace();
  var headers = { Authorization: 'Bearer ' + clientToken(context.user) };
  var response =
    method === 'DELETE'
      ? http.delete(apiUrl + path, { headers: headers })
      : http.get(apiUrl + path, { headers: headers });
  if (response.status === 429) rateLimited(response);
  if (!response.ok) {
    var detail = response.body ? String(response.body).slice(0, 300) : '';
    fail(method + ' ' + path + ' answered ' + response.status + ' ' + detail);
  }
  return response.body ? JSON.parse(response.body) : undefined;
}

function query(params) {
  var parts = [];
  for (var key in params) {
    parts.push(key + '=' + encodeURIComponent(params[key]));
  }
  return parts.join('&');
}

function waterTotals(start, end, unit) {
  return api(
    'GET',
    '/v1.2/water-logs?' +
      query({
        start_date: start,
        end_date: end,
        timezone: context.timezone,
        unit: unit,
      })
  ).items;
}

function dailyWeights(start, end) {
  return api(
    'GET',
    '/v1.2/weight-logs?' +
      query({ start_date: start, end_date: end, timezone: context.timezone })
  ).items;
}

function foodLogs(start, end) {
  return api(
    'GET',
    '/v1.2/food-logs?' +
      query({ start_date: start, end_date: end, timezone: context.timezone })
  ).items;
}

function foodSummary(start, end) {
  return api(
    'GET',
    '/v1.2/food-logs/summary?' +
      query({
        start_date: start,
        end_date: end,
        timezone: context.timezone,
        group_by: 'day',
      })
  );
}

// Long ranges are read in 90-day pieces, as the app does.
function inChunks(range, read) {
  var items = [];
  var start = range.start;
  while (start <= range.end) {
    var last = shiftDate(start, 89);
    var end = last < range.end ? last : range.end;
    items = items.concat(read(start, end));
    start = shiftDate(end, 1);
  }
  return items;
}

// ---------------------------------------------------------------------------
// Formatting, as the app shows it.

function round(value, digits) {
  var factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function volume(value, unit) {
  return (
    round(value, unit === 'cup' ? 3 : 1) +
    ' ' +
    (unit === 'fl_oz' ? 'fl oz' : unit)
  );
}

function weight(value, unit) {
  return round(value, 1) + ' ' + unit;
}

function summaryText(summary) {
  var totals = summary.totals;
  var parts = [
    totals.logs_count + ' ' + (totals.logs_count === 1 ? 'log' : 'logs'),
  ];
  var calories = totals.nutrients && totals.nutrients.calories;
  if (calories) parts.push(Math.round(calories.value) + ' kcal');
  var average =
    summary.average_per_logged_day &&
    summary.average_per_logged_day.nutrients &&
    summary.average_per_logged_day.nutrients.calories;
  if (average) parts.push('avg ' + Math.round(average.value) + ' kcal/day');
  return parts.join(' · ');
}

function convertWeight(value, from, to) {
  if (from === to) return value;
  if (from === 'lb' && to === 'kg') return value * 0.45359237;
  if (from === 'kg' && to === 'lb') return value / 0.45359237;
  return value;
}

function number(text) {
  return Number(String(text).replace(/,/g, ''));
}

// ---------------------------------------------------------------------------

var check = CHECK;
var context = output.live;

if (check === 'context') {
  var user = String(required('USER_ID')).trim();
  var timezone = String(required('TIMEZONE')).trim();
  var today = localDate(timezone);
  output.live = {
    user: user,
    timezone: timezone,
    today: today,
    run: String(Date.now()).slice(-6),
  };
  output.water = {};
  context = output.live;
  log(
    'end user ' +
      user +
      ', timezone ' +
      timezone +
      ', today ' +
      today +
      ', run ' +
      output.live.run
  );
  // One request before the flow changes anything: a 429 stops it here.
  waterTotals(today, today, 'fl_oz');
  log('the January API is answering');
} else {
  if (!context) throw new Error('[api] run ../live/context.yaml first.');
  var day =
    envValue('DAY') === 'yesterday'
      ? shiftDate(context.today, -1)
      : context.today;

  if (check === 'water-total') {
    // The day's total in UNIT equals the app's; with EXPECT_CHANGE, it moved
    // by exactly that much since the previous water check in this unit.
    var unit = required('UNIT');
    var items = waterTotals(day, day, unit);
    var total = items.length ? items[0].total.value : 0;
    var expected = items.length ? volume(total, unit) : '—';
    var shown = String(required('UI_TEXT')).trim();
    if (shown !== expected) {
      fail(
        'water on ' +
          day +
          ': app shows "' +
          shown +
          '", API has "' +
          expected +
          '"'
      );
    }
    var change = envValue('EXPECT_CHANGE');
    var before = output.water[unit];
    if (change !== undefined) {
      if (before === undefined) fail('no earlier water total in ' + unit);
      var moved = round(total - before, 1);
      if (Math.abs(moved - Number(change)) > 0.11) {
        fail(
          'water on ' +
            day +
            ' moved by ' +
            moved +
            ' ' +
            unit +
            ', expected ' +
            change
        );
      }
    }
    if (day === context.today) output.water[unit] = total;
    log(
      'water ' +
        day +
        ' ' +
        unit +
        ': API ' +
        expected +
        ' = app "' +
        shown +
        '"' +
        (change !== undefined ? ', changed by ' + change + ' as expected' : '')
    );
  } else if (check === 'water-unchanged') {
    // A rejected log left the day's total alone.
    var unitNow = required('UNIT');
    var itemsNow = waterTotals(day, day, unitNow);
    var totalNow = itemsNow.length ? itemsNow[0].total.value : 0;
    if (output.water[unitNow] === undefined) {
      fail('no earlier water total in ' + unitNow);
    }
    if (round(totalNow - output.water[unitNow], 1) !== 0) {
      fail(
        'water on ' +
          day +
          ' changed from ' +
          output.water[unitNow] +
          ' to ' +
          totalNow +
          ' ' +
          unitNow
      );
    }
    log(
      'water ' +
        day +
        ' ' +
        unitNow +
        ': still ' +
        totalNow +
        ' after the rejected log'
    );
  } else if (check === 'weight-day') {
    // The day's latest weight equals the app's, and is the one just logged.
    var weights = dailyWeights(day, day);
    var latest = weights.length ? weights[0].weight : undefined;
    var expectedWeight = latest ? weight(latest.value, latest.unit) : '—';
    var shownWeight = String(required('UI_TEXT')).trim();
    if (shownWeight !== expectedWeight) {
      fail(
        'weight on ' +
          day +
          ': app shows "' +
          shownWeight +
          '", API has "' +
          expectedWeight +
          '"'
      );
    }
    var logged = envValue('EXPECT_VALUE');
    if (logged !== undefined) {
      var loggedUnit = required('UNIT');
      if (
        !latest ||
        latest.unit !== loggedUnit ||
        Number(latest.value) !== Number(logged)
      ) {
        fail(
          'weight on ' +
            day +
            ' is ' +
            expectedWeight +
            ', expected ' +
            logged +
            ' ' +
            loggedUnit
        );
      }
    }
    log(
      'weight ' +
        day +
        ': API ' +
        expectedWeight +
        ' = app "' +
        shownWeight +
        '"'
    );
  } else if (check === 'food-log-saved') {
    // Today's logs hold one named NAME with EXPECT_FOODS foods; its id is kept
    // for the rename and delete checks.
    var name = required('NAME');
    var logs = foodLogs(day, day).filter(function (item) {
      return item.name === name;
    });
    if (logs.length !== 1) {
      fail(logs.length + ' food logs named "' + name + '" on ' + day);
    }
    var foods = logs[0].foods ? logs[0].foods.length : 0;
    var expectedFoods = envValue('EXPECT_FOODS');
    if (expectedFoods !== undefined && foods !== Number(expectedFoods)) {
      fail('"' + name + '" has ' + foods + ' foods, expected ' + expectedFoods);
    }
    output.foodLogId = logs[0].id;
    log(
      'food log "' +
        name +
        '" saved on ' +
        day +
        ' with ' +
        foods +
        ' food(s), id ' +
        logs[0].id
    );
  } else if (check === 'food-log-renamed') {
    var renamed = required('NAME');
    var match = foodLogs(day, day).filter(function (item) {
      return item.id === output.foodLogId;
    })[0];
    if (!match) fail('food log ' + output.foodLogId + ' is missing on ' + day);
    if (match.name !== renamed) {
      fail(
        'food log ' +
          output.foodLogId +
          ' is named "' +
          match.name +
          '", expected "' +
          renamed +
          '"'
      );
    }
    var renamedFoods = match.foods ? match.foods.length : 0;
    var expectedAfterEdit = envValue('EXPECT_FOODS');
    if (
      expectedAfterEdit !== undefined &&
      renamedFoods !== Number(expectedAfterEdit)
    ) {
      fail(
        'food log ' +
          output.foodLogId +
          ' has ' +
          renamedFoods +
          ' foods, expected ' +
          expectedAfterEdit
      );
    }
    log(
      'food log ' +
        output.foodLogId +
        ' renamed to "' +
        renamed +
        '", ' +
        renamedFoods +
        ' food(s)'
    );
  } else if (check === 'food-log-deleted') {
    var remaining = foodLogs(day, day).filter(function (item) {
      return item.id === output.foodLogId;
    });
    if (remaining.length) {
      fail('food log ' + output.foodLogId + ' is still there');
    }
    log('food log ' + output.foodLogId + ' is gone');
  } else if (check === 'food-summary') {
    // The app's summary line equals one built from the summary endpoint for
    // the same dates: RANGE week (the Logs tab) or day (the Tracking tab).
    var dates =
      required('RANGE') === 'week'
        ? thisWeek(context.today)
        : { start: day, end: day };
    var line = summaryText(foodSummary(dates.start, dates.end));
    var shownLine = String(required('UI_TEXT')).trim();
    if (shownLine !== line) {
      fail(
        'summary ' +
          dates.start +
          '..' +
          dates.end +
          ': app shows "' +
          shownLine +
          '", API gives "' +
          line +
          '"'
      );
    }
    log(
      'summary ' +
        dates.start +
        '..' +
        dates.end +
        ': "' +
        line +
        '" matches the app'
    );
  } else if (check === 'chart') {
    // The chart's spoken summary agrees with the API over the same range.
    var kind = required('KIND');
    var rangeName = required('RANGE');
    var range = chartRange(rangeName, context.today);
    var label = String(required('UI_TEXT'));
    var chartUnit = required('UNIT');
    if (kind === 'water') {
      var days = inChunks(range, function (start, end) {
        return waterTotals(start, end, chartUnit);
      });
      var sum = 0;
      var months = {};
      days.forEach(function (item) {
        sum += item.total.value;
        months[item.date.slice(0, 7)] = true;
      });
      var loggedCount =
        rangeName === 'year' ? Object.keys(months).length : days.length;
      var parsed = /: (\d+) of \d+ (?:days|months) logged, ([\d,.]+) /.exec(
        label
      );
      if (!days.length) {
        if (!/nothing logged/.test(label)) {
          fail('water chart shows data the API does not have: ' + label);
        }
      } else if (
        !parsed ||
        Number(parsed[1]) !== loggedCount ||
        Math.abs(number(parsed[2]) - round(sum, 1)) > 0.11
      ) {
        fail(
          'water chart "' +
            label +
            '" but the API has ' +
            loggedCount +
            ' logged and ' +
            round(sum, 1) +
            ' ' +
            chartUnit
        );
      }
      log(
        'water chart ' +
          rangeName +
          ' ' +
          range.start +
          '..' +
          range.end +
          ': ' +
          loggedCount +
          ' logged, ' +
          round(sum, 1) +
          ' ' +
          chartUnit +
          ' = app'
      );
    } else {
      var entries = inChunks(range, dailyWeights);
      var last = entries.length
        ? entries[entries.length - 1].weight
        : undefined;
      var lastValue = last
        ? round(convertWeight(last.value, last.unit, chartUnit), 1)
        : undefined;
      var countMatch = /: (\d+) entries|: 1 entry/.exec(label);
      var shownCount = countMatch
        ? countMatch[1]
          ? Number(countMatch[1])
          : 1
        : 0;
      if (shownCount !== entries.length) {
        fail(
          'weight chart "' +
            label +
            '" but the API has ' +
            entries.length +
            ' entries'
        );
      }
      var lastText =
        lastValue === undefined
          ? ''
          : lastValue.toLocaleString('en-US', { maximumFractionDigits: 1 }) +
            ' ' +
            chartUnit;
      if (last && label.indexOf(lastText) < 0) {
        fail('weight chart "' + label + '" does not end at ' + lastText);
      }
      log(
        'weight chart ' +
          rangeName +
          ' ' +
          range.start +
          '..' +
          range.end +
          ': ' +
          entries.length +
          ' entries' +
          (last ? ', latest ' + lastText : '') +
          ' = app'
      );
    }
  } else if (check === 'cleanup') {
    // Deletes food logs this run left behind, found by the run's name prefix.
    var prefix = required('NAME');
    var stale = foodLogs(shiftDate(context.today, -1), context.today).filter(
      function (item) {
        return item.name && item.name.indexOf(prefix) === 0;
      }
    );
    stale.forEach(function (item) {
      api('DELETE', '/v1.2/food-logs/' + item.id);
    });
    log(
      'cleanup: removed ' +
        stale.length +
        ' food log(s) named "' +
        prefix +
        '…"'
    );
  } else {
    throw new Error('[api] unknown CHECK ' + check);
  }
}
