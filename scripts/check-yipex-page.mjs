#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { derivePageDesign } from './derive-yipex-page-design.mjs';

const changeDir = process.argv[2];
const withDesignRecord = process.argv.includes('--with-design-record');
if (!changeDir) { console.error('Usage: node scripts/check-yipex-page.mjs changes/{change-id} [--with-design-record]'); process.exit(2); }
const target = resolve(process.cwd(), changeDir);
const spec = resolve(target, 'page-spec.json');
const preview = resolve(target, 'preview.html');
const result = spawnSync(process.execPath, [resolve(process.cwd(), 'scripts/validate-yipex-page-spec.mjs'), spec], { encoding: 'utf8' });
const errors = [];
if (result.status !== 0) errors.push(result.stderr || result.stdout);
if (result.status === 0 && withDesignRecord) {
  try {
    derivePageDesign(spec);
  } catch (error) {
    errors.push(`page-design.md derivation failed: ${error.message}`);
  }
}
if (!existsSync(preview)) errors.push('preview.html is missing; run build-yipex-page.mjs');
if (existsSync(preview)) {
  const html = readFileSync(preview, 'utf8');
  if (!html.includes('id="yipex-page"')) errors.push('preview.html has no yipex page root');
  const scripts = [...html.matchAll(/<script(?![^>]*type=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [index, match] of scripts.entries()) {
    try {
      new Function(match[1]);
    } catch (error) {
      errors.push(`preview.html script ${index + 1} has invalid JavaScript: ${error.message}`);
    }
  }
}
if (errors.length) { console.error(`yipex-page-check: fail\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('yipex-page-check: pass (lightweight static checks only; visual and interaction acceptance is manual)');
