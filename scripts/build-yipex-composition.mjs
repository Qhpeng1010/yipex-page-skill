#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const input = process.argv[2];
const withDesignRecord = process.argv.includes('--with-design-record');
if (!input) {
  console.error('Usage: node scripts/build-yipex-composition.mjs changes/{composition-dir} [--with-design-record]');
  process.exit(2);
}
const projectRoot = process.cwd();
const compositionDir = resolve(projectRoot, input);
const compositionPath = resolve(compositionDir, 'page-composition.json');
if (!existsSync(compositionPath)) {
  console.error(`yipex-composition-build: fail\n- page-composition.json is missing: ${compositionPath}`);
  process.exit(1);
}
const composition = JSON.parse(readFileSync(compositionPath, 'utf8'));
const scriptsDir = resolve(projectRoot, 'scripts');

function runNode(script, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [resolve(scriptsDir, script), ...args], { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolvePromise({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() }));
  });
}

async function buildRegion(region) {
  const specPath = region?.config?.pageSpec;
  // Action-only regions describe cross-page transitions and do not produce a page artifact.
  if (!specPath) return { id: region?.id || 'unknown', code: 0, output: 'action-only region skipped' };
  const childDir = dirname(resolve(compositionDir, specPath));
  const childRelDir = childDir.slice(projectRoot.length + 1);
  const buildArgs = [resolve(compositionDir, specPath), ...(withDesignRecord ? ['--with-design-record'] : [])];
  const built = await runNode('build-yipex-page.mjs', buildArgs);
  const checked = built.code === 0
    ? await runNode('check-yipex-page.mjs', [childRelDir, ...(withDesignRecord ? ['--with-design-record'] : [])])
    : { code: 1, stdout: '', stderr: 'page build failed' };
  return { id: region.id, code: built.code || checked.code, output: [built.stdout, checked.stdout, built.stderr, checked.stderr].filter(Boolean).join('\n') };
}

const regions = Array.isArray(composition.regions) ? composition.regions : [];
const [regionResults, compositionResult] = await Promise.all([
  Promise.all(regions.map(buildRegion)),
  runNode('validate-yipex-page-composition.mjs', [input + '/page-composition.json'])
]);
const failures = regionResults.filter((result) => result.code !== 0);
if (compositionResult.code !== 0 || failures.length) {
  console.error('yipex-composition-build: fail');
  if (compositionResult.stdout || compositionResult.stderr) console.error(compositionResult.stdout || compositionResult.stderr);
  for (const failure of failures) console.error(`- ${failure.id}\n${failure.output}`);
  process.exit(1);
}
console.log(`yipex-composition-build: pass (${regions.length} regions built in parallel)`);
for (const result of regionResults) console.log(`[${result.id}] ${result.output}`);
