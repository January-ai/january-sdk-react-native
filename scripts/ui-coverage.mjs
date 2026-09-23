#!/usr/bin/env node
// UI test coverage for the example app, checked without a device.
//
// Every test ID the example declares under example/src must be exercised by at
// least one Maestro flow that CI runs (tagged `fixture` or `parity`): tapped,
// long-pressed, typed into after a tap, scrolled to, waited for, copied from,
// or asserted visible. Optional commands and assertNotVisible do not count,
// because they pass when the element is missing. Every ID a flow references,
// live flows included, must exist in the app, so a renamed ID cannot leave a
// flow quietly looking for nothing.
//
// Most IDs are string literals. The rest are built from a template:
// - `<name>-${index}` is one row of a list; a flow that uses any row covers
//   the list, and the report shows it as `<name>-0`.
// - A template inside one of the components listed in `components` below is
//   expanded at each place the component is used, from that call's props.
// Any other template fails the check until it is described here.
//
//   node scripts/ui-coverage.mjs            # summary and anything uncovered
//   node scripts/ui-coverage.mjs --verbose  # also every ID and its flows
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(root, 'example', 'src');
const maestroRoot = path.join(root, 'example', '.maestro');
const flowsRoot = path.join(maestroRoot, 'flows');
const ciTags = ['fixture', 'parity'];
const verbose = process.argv.includes('--verbose');

// Props whose value is a test ID, and props whose value is the start of one.
const idProps = new Set(['testID', 'testId', 'backTestID']);
const prefixProps = new Set(['testIDPrefix', 'testPrefix']);

// Components that build test IDs from their props. Each use of one is
// expanded from the string-literal values of the listed props (and, for
// segmented controls, the inline items array), and the templates inside the
// component are then accounted for.
const segments = (prop) => ({
  props: [prop],
  expand: (props, element) =>
    arrayLiteralIds(attribute(element, 'items'), element).map(
      (id) => `${props[prop]}-${id}`
    ),
});
const components = {
  // One segment per item: <prefix>-<item id>.
  SegmentedControl: segments('testIDPrefix'),
  SearchSegmentedControl: segments('testIDPrefix'),
  Segmented: segments('testPrefix'),
  // A Tracking chart: the chart, its loading, error, and empty states, the
  // retry button, and one range button per chart range.
  ChartFrame: {
    props: ['testIDPrefix'],
    expand: ({ testIDPrefix: prefix }) => [
      prefix,
      `${prefix}-loading`,
      `${prefix}-error`,
      `${prefix}-retry`,
      `${prefix}-empty`,
      ...constArrayIds('chartRanges').map(
        (range) => `${prefix}-range-${range}`
      ),
    ],
  },
  // An error card and its retry button.
  SheetError: {
    props: ['testID'],
    expand: ({ testID }) => [testID, `${testID}-retry`],
  },
  RequestError: {
    props: ['testID'],
    expand: ({ testID }) => [testID, `${testID}-retry`],
  },
  // The microphone button and the level meter it shows while recording.
  VoiceInputButton: {
    props: ['testID'],
    expand: ({ testID }) => [testID, `${testID}-meter`],
  },
  CategoryChip: {
    props: ['label'],
    expand: ({ label }) => [`category-${label.toLowerCase()}`],
  },
  SettingsRow: {
    props: ['label'],
    expand: ({ label }) => [
      `settings-row-${label.toLowerCase().replace(/ /g, '-')}`,
    ],
  },
};
// Components whose own templates are expanded through another component's
// entry above: RangeSwitch renders ChartFrame's range buttons.
const expandedBy = { RangeSwitch: 'ChartFrame' };

const problems = [];
const relative = (file) => path.relative(root, file);

// ---------------------------------------------------------------------------
// Test IDs declared by the example app.

const sourceFiles = listFiles(sourceRoot).filter(
  (file) => /\.tsx?$/.test(file) && !file.split(path.sep).includes('__tests__')
);
const parsed = sourceFiles.map((file) =>
  ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )
);

/**
 * Declared IDs: id -> { display, pattern, where }. A list row is stored under
 * its first row's ID, with the pattern every row matches.
 */
const declared = new Map();

function declare(id, node, pattern, display = id) {
  if (!declared.has(id)) {
    declared.set(id, { display, pattern, where: location(node) });
  }
}

for (const source of parsed) visit(source, source);

function visit(node, source) {
  if (
    (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
    components[node.tagName.getText(source)]
  ) {
    componentUse(node);
  } else if (ts.isJsxAttribute(node)) {
    const name = node.name.getText(source);
    if (idProps.has(name) || prefixProps.has(name)) jsxAttribute(node, name);
  } else if (
    ts.isPropertyAssignment(node) &&
    idProps.has(node.name.getText(source))
  ) {
    literalOrTemplate(node.initializer, node);
  } else if (
    ts.isVariableDeclaration(node) &&
    idProps.has(node.name.getText(source)) &&
    node.initializer
  ) {
    literalOrTemplate(node.initializer, node);
  } else if (ts.isParameter(node) && ts.isObjectBindingPattern(node.name)) {
    for (const element of node.name.elements) {
      const name = element.name.getText(source);
      if ((idProps.has(name) || prefixProps.has(name)) && element.initializer) {
        problems.push(
          `${location(element)}: ${name} has a default value; pass it from every caller instead, so the check sees it`
        );
      }
    }
  }
  ts.forEachChild(node, (child) => visit(child, source));
}

function componentUse(element) {
  const tag = element.tagName.getText();
  const { props: needed, expand } = components[tag];
  const props = literalProps(element);
  for (const name of needed) {
    if (props[name] !== undefined) continue;
    // A use that forwards its own caller's value; that caller declares it.
    if (isForwarded(attribute(element, name)?.initializer)) return;
    problems.push(
      `${location(element)}: <${tag}> needs ${name} as a string literal so the check can expand it`
    );
    return;
  }
  for (const id of expand(props, element)) declare(id, element);
}

function jsxAttribute(node, name) {
  const element = node.parent.parent; // JsxAttributes -> element
  const tag = element.tagName.getText();
  if (components[tag]) return; // expanded by componentUse
  if (prefixProps.has(name)) {
    if (isForwarded(node.initializer)) return;
    problems.push(
      `${location(node)}: <${tag} ${name}> builds test IDs; describe <${tag}> in scripts/ui-coverage.mjs`
    );
    return;
  }
  if (!node.initializer) return;
  if (ts.isStringLiteral(node.initializer)) {
    declare(node.initializer.text, node);
    return;
  }
  literalOrTemplate(node.initializer.expression, node);
}

/** A literal, a choice between literals, or a template; forwarding is fine. */
function literalOrTemplate(expression, owner) {
  if (!expression) return;
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    declare(expression.text, owner);
  } else if (ts.isParenthesizedExpression(expression)) {
    literalOrTemplate(expression.expression, owner);
  } else if (ts.isConditionalExpression(expression)) {
    literalOrTemplate(expression.whenTrue, owner);
    literalOrTemplate(expression.whenFalse, owner);
  } else if (ts.isTemplateExpression(expression)) {
    template(expression, owner);
  } else if (!isForwarded(expression)) {
    problems.push(
      `${location(owner)}: unsupported test ID expression ${expression.getText()}`
    );
  }
}

function template(expression, owner) {
  const spans = expression.templateSpans;
  // `<name>-${index}`: one row of a list.
  if (spans.every((span) => span.expression.getText() === 'index')) {
    const parts = [
      expression.head.text,
      ...spans.map((span) => span.literal.text),
    ];
    const pattern = new RegExp(`^${parts.map(escapeRegExp).join('\\d+')}$`);
    declare(parts.join('0'), owner, pattern, parts.join('<n>'));
    return;
  }
  const component = enclosingComponent(expression);
  if (components[component] || components[expandedBy[component]]) return;
  problems.push(
    `${location(owner)}: templated test ID ${expression.getText()} in ${component ?? 'module scope'} is not described in scripts/ui-coverage.mjs`
  );
}

function isForwarded(initializer) {
  const expression =
    initializer && ts.isJsxExpression(initializer)
      ? initializer.expression
      : initializer;
  return (
    expression !== undefined &&
    (ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression))
  );
}

function literalProps(element) {
  const props = {};
  for (const property of element.attributes.properties) {
    if (!ts.isJsxAttribute(property) || !property.initializer) continue;
    const value = property.initializer;
    if (ts.isStringLiteral(value)) props[property.name.getText()] = value.text;
    else if (
      ts.isJsxExpression(value) &&
      value.expression &&
      (ts.isStringLiteral(value.expression) ||
        ts.isNoSubstitutionTemplateLiteral(value.expression))
    ) {
      props[property.name.getText()] = value.expression.text;
    }
  }
  return props;
}

function attribute(element, name) {
  return element.attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) && property.name.getText() === name
  );
}

/** The `id` of every object in an inline array literal prop. */
function arrayLiteralIds(property, element) {
  const expression = property?.initializer?.expression;
  if (!expression || !ts.isArrayLiteralExpression(expression)) {
    problems.push(
      `${location(element)}: <${element.tagName.getText()}> needs an inline items array so the check can list its segments`
    );
    return [];
  }
  return objectIds(expression);
}

/** The `id` of every object in a module-level `const <name> = [...]`. */
function constArrayIds(name) {
  for (const source of parsed) {
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (declaration.name.getText(source) !== name) continue;
        let value = declaration.initializer;
        while (
          value &&
          (ts.isAsExpression(value) || ts.isSatisfiesExpression(value))
        )
          value = value.expression;
        if (value && ts.isArrayLiteralExpression(value))
          return objectIds(value);
      }
    }
  }
  problems.push(`could not find the array ${name} in example/src`);
  return [];
}

function objectIds(array) {
  return array.elements.flatMap((item) => {
    if (!ts.isObjectLiteralExpression(item)) return [];
    const id = item.properties.find(
      (property) =>
        ts.isPropertyAssignment(property) && property.name.getText() === 'id'
    );
    return id && ts.isStringLiteral(id.initializer)
      ? [id.initializer.text]
      : [];
  });
}

function enclosingComponent(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionDeclaration(current) && current.name)
      return current.name.text;
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      ts.isVariableDeclaration(current.parent)
    )
      return current.parent.name.getText();
  }
  return undefined;
}

function location(node) {
  const source = node.getSourceFile();
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
  return `${relative(source.fileName)}:${line + 1}`;
}

// ---------------------------------------------------------------------------
// IDs the Maestro flows reference.

/** id pattern -> { flows, covering: boolean, platforms } */
const references = [];

const flowFiles = readdirSync(flowsRoot)
  .filter((name) => name.endsWith('.yaml'))
  .sort()
  .map((name) => path.join(flowsRoot, name));

const flows = flowFiles.map((file) => {
  const [header, commands] = yaml.loadAll(readFileSync(file, 'utf8'));
  const tags = header?.tags ?? [];
  return {
    file,
    name: path.basename(file),
    ci: tags.some((tag) => ciTags.includes(tag)),
    tags,
    commands: commands ?? [],
  };
});

for (const flow of flows) walk(flow.commands, flow, {}, new Set(), [flow.file]);

function walk(commands, flow, env, platforms, stack) {
  for (const command of commands ?? []) {
    if (typeof command === 'string') continue;
    for (const [name, value] of Object.entries(command)) {
      handle(name, value, flow, env, platforms, stack);
    }
  }
}

function handle(name, value, flow, env, platforms, stack) {
  const optional = typeof value === 'object' && value?.optional === true;
  switch (name) {
    case 'tapOn':
    case 'longPressOn':
    case 'doubleTapOn':
    case 'assertVisible':
    case 'copyTextFrom':
      selector(value, flow, env, platforms, !optional);
      return;
    case 'assertNotVisible':
      selector(value, flow, env, platforms, false);
      return;
    case 'scrollUntilVisible':
      selector(value?.element, flow, env, platforms, !optional);
      return;
    case 'extendedWaitUntil':
      selector(value?.visible, flow, env, platforms, !optional);
      selector(value?.notVisible, flow, env, platforms, false);
      return;
    case 'retry':
    case 'repeat':
      walk(value?.commands, flow, env, platforms, stack);
      return;
    case 'runFlow': {
      const spec = typeof value === 'string' ? { file: value } : value;
      const scoped = new Set(platforms);
      if (spec.when?.platform) scoped.add(spec.when.platform);
      // A subflow's env may use the caller's: substitute it on the way in.
      const nextEnv = { ...env };
      for (const [key, raw] of Object.entries(spec.env ?? {})) {
        nextEnv[key] = substitute(String(raw), env);
      }
      if (spec.commands) walk(spec.commands, flow, nextEnv, scoped, stack);
      if (spec.file) {
        const file = path.resolve(path.dirname(stack.at(-1)), spec.file);
        if (stack.includes(file)) return;
        const documents = yaml.loadAll(readFileSync(file, 'utf8'));
        walk(documents.at(-1), flow, nextEnv, scoped, [...stack, file]);
      }
      return;
    }
    default:
      return;
  }
}

function selector(value, flow, env, platforms, covering) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.id === 'string') {
    const id = substitute(value.id, env);
    references.push({
      id,
      flow: flow.name,
      ci: flow.ci,
      covering,
      platforms: [...platforms],
    });
  }
  for (const relation of [
    'childOf',
    'containsChild',
    'below',
    'above',
    'leftOf',
    'rightOf',
  ]) {
    if (value[relation])
      selector(value[relation], flow, env, platforms, covering);
  }
}

function substitute(text, env) {
  return text.replace(/\$\{(\w+)\}/g, (match, key) =>
    key in env ? String(env[key]) : match
  );
}

// ---------------------------------------------------------------------------
// Compare.

function matches(reference, id, entry) {
  if (entry.pattern) {
    return entry.pattern.test(reference.id) || reference.id === id;
  }
  return reference.id === id || fullMatch(reference.id, id);
}

function fullMatch(pattern, id) {
  if (!/[.*+?^${}()|[\]\\]/.test(pattern)) return false;
  try {
    return new RegExp(`^(?:${pattern})$`).test(id);
  } catch {
    return false;
  }
}

const rows = [...declared.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([id, entry]) => {
    const covering = references.filter(
      (reference) =>
        reference.ci && reference.covering && matches(reference, id, entry)
    );
    return {
      id: entry.display,
      where: entry.where,
      flows: [...new Set(covering.map((reference) => reference.flow))],
      platforms: covering.some((reference) => reference.platforms.length === 0)
        ? ['iOS', 'Android']
        : [...new Set(covering.flatMap((reference) => reference.platforms))],
    };
  });

const stale = [];
for (const reference of references) {
  const known = [...declared.entries()].some(([id, entry]) =>
    matches(reference, id, entry)
  );
  if (!known) stale.push(reference);
}

const covered = rows.filter((row) => row.flows.length > 0);
const uncovered = rows.filter((row) => row.flows.length === 0);
const percent = rows.length === 0 ? 100 : (covered.length / rows.length) * 100;

console.log(
  `UI coverage: ${covered.length}/${rows.length} (${percent.toFixed(1)}%)`
);
console.log(
  `  ${rows.length} test IDs in example/src; ${flows.filter((flow) => flow.ci).length} fixture and parity flows, ${flows.filter((flow) => !flow.ci).length} other flows`
);

if (uncovered.length > 0) {
  console.log('\nNot exercised by any fixture or parity flow:');
  for (const row of uncovered) console.log(`  - ${row.id}  (${row.where})`);
}

const onePlatform = covered.filter((row) => row.platforms.length === 1);
if (onePlatform.length > 0) {
  console.log('\nExercised on one platform only (a `when: platform` block):');
  for (const row of onePlatform)
    console.log(`  - ${row.id}  (${row.platforms[0]})`);
}

if (stale.length > 0) {
  console.log('\nFlows reference IDs the app does not declare:');
  const seen = new Set();
  for (const reference of stale) {
    const key = `${reference.flow} ${reference.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`  - ${reference.id}  (${reference.flow})`);
  }
}

if (problems.length > 0) {
  console.log('\nTest IDs the check cannot read:');
  for (const problem of problems) console.log(`  - ${problem}`);
}

if (verbose) {
  console.log('\nEvery test ID:');
  for (const row of rows)
    console.log(
      `  ${row.flows.length ? '✓' : '✗'} ${row.id}  ${row.flows.join(', ')}`
    );
}

if (uncovered.length > 0 || stale.length > 0 || problems.length > 0) {
  process.exitCode = 1;
}

// ---------------------------------------------------------------------------

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  });
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
