#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/validate-yipex-page-composition.mjs <page-composition.json>');
  process.exit(2);
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const specPath = resolve(process.cwd(), file);
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const compositionDir = dirname(specPath);
const registry = JSON.parse(readFileSync(resolve(projectRoot, 'modules/yipex/execution/capability-model/capability-registry.json'), 'utf8'));
const rules = JSON.parse(readFileSync(resolve(projectRoot, 'modules/yipex/execution/capability-model/composition-rules.json'), 'utf8'));
const errors = [];

if (spec.schemaVersion !== 1) errors.push('schemaVersion must be 1');
if (!spec.metadata?.changeId || !/^[0-9]{8}-[a-z0-9-]+$/.test(spec.metadata.changeId)) errors.push('metadata.changeId must use YYYYMMDD-slug');
if (!spec.metadata?.pageName) errors.push('metadata.pageName is required');
if (spec.ui?.system !== 'yipex' || spec.ui?.runtime !== 'yipex-composition') errors.push('ui must declare yipex-composition runtime');
if (!spec.skeleton) errors.push('skeleton is required');
if (!spec.entryHtml) errors.push('entryHtml is required for reliable multi-page preview navigation');
else if (!existsSync(resolve(compositionDir, spec.entryHtml))) errors.push(`entryHtml does not exist: ${spec.entryHtml}`);

const rule = rules.skeletonRules.find((item) => item.skeleton === spec.skeleton);
if (!rule) errors.push(`unknown skeleton: ${spec.skeleton}`);
if (!Array.isArray(spec.regions) || spec.regions.length === 0) {
  errors.push('regions must contain at least one region');
} else {
  const ids = new Set();
  const knownCapabilities = new Map((registry.capabilities || []).map((item) => [item.id, item.runtimeStatus]));
  for (const region of spec.regions) {
    if (!region?.id || !region?.type || !Array.isArray(region?.capabilities) || region.capabilities.length === 0) {
      errors.push(`each region requires id, type, and capabilities: ${region?.id || 'unknown'}`);
      continue;
    }
    if (ids.has(region.id)) errors.push(`duplicate region id: ${region.id}`);
    ids.add(region.id);
    if (rule && !rule.allowedRegions.includes(region.type)) errors.push(`region type is not allowed by skeleton: ${region.type}`);
    for (const capability of region.capabilities) {
      if (!knownCapabilities.has(capability)) errors.push(`capability is not registered: ${capability}`);
    }
  }
  for (const required of rule?.requiredRegions || []) {
    if (!spec.regions.some((region) => region.type === required)) errors.push(`missing required region: ${required}`);
  }
}

if (errors.length) {
  console.error(`yipex-page-composition: fail\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`yipex-page-composition: pass (${spec.regions.length} regions)`);
