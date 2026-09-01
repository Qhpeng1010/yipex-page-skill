#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRendererScaffold, getRendererDefinition, listRendererDefinitions } from './lib/yipex-renderer-registry.mjs';
import { resolveContextPresentation, resolveDetailOverlayMode, resolveCreateOverlayMode, resolveDrawerSize } from './renderers/yipex-standard-query-table.mjs';
import { normalizeUnitItem } from './lib/yipex-unit-presentation.mjs';

const root = resolve(new URL('.', import.meta.url).pathname, '..');
const read = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const registry = read('modules/yipex/execution/capability-model/capability-registry.json');
const rules = read('modules/yipex/execution/capability-model/composition-rules.json');
const policy = read('modules/yipex/execution/generation-policy.json');
const errors = [];
if (registry.modelVersion !== rules.modelVersion) errors.push(`capability model version mismatch: registry ${registry.modelVersion}, rules ${rules.modelVersion}`);
for (const rendererFile of [
  'scripts/build-yipex-page.mjs',
  'scripts/renderers/yipex-standard-dashboard-overview.mjs',
  'scripts/renderers/yipex-standard-grouped-detail.mjs',
  'scripts/renderers/yipex-standard-grouped-form.mjs',
  'scripts/renderers/yipex-standard-query-table.mjs',
  'scripts/renderers/yipex-standard-result-workflow.mjs',
  'scripts/renderers/yipex-standard-stepped-form.mjs'
]) {
  const source = readFileSync(resolve(root, rendererFile), 'utf8');
  if (source.includes('autoInsertSpaceInButton: false')) errors.push(`${rendererFile} disables Chinese two-character button spacing`);
}

const unitCases = [
  [{ label: '交易金额', format: 'currency' }, '交易金额 (元)', 'title'],
  [{ label: '订单数', unit: '笔' }, '订单数 (笔)', 'title'],
  [{ label: '成功率', suffix: '%' }, '成功率 (%)', 'title'],
  [{ label: '金额', format: 'amount', unitKey: 'currency' }, '金额', 'value']
];
for (const [input, expectedLabel, expectedPlacement] of unitCases) {
  const actual = normalizeUnitItem(input);
  if (actual.displayLabel !== expectedLabel || actual.unitPlacement !== expectedPlacement) {
    errors.push(`unit presentation ${input.label}: expected ${expectedLabel}/${expectedPlacement}, got ${actual.displayLabel}/${actual.unitPlacement}`);
  }
}

const detailOverlayCases = [
  [6, 'auto', 'modal'],
  [7, 'auto', 'drawer'],
  [16, 'auto', 'drawer'],
  [17, 'auto', 'page'],
  [7, 'modal', 'modal']
];
for (const [fieldCount, preference, expected] of detailOverlayCases) {
  const fields = Array.from({ length: fieldCount }, (_, index) => ({ key: `field-${index + 1}` }));
  const actual = resolveDetailOverlayMode(fields, preference);
  if (actual !== expected) errors.push(`detail overlay ${fieldCount}/${preference}: expected ${expected}, got ${actual}`);
}
const createOverlayCases = [
  [6, 'auto', 'modal'],
  [7, 'auto', 'drawer'],
  [16, 'auto', 'drawer'],
  [17, 'auto', 'page'],
  [7, 'drawer', 'drawer']
];
for (const [fieldCount, preference, expected] of createOverlayCases) {
  const fields = Array.from({ length: fieldCount }, (_, index) => ({ key: `field-${index + 1}` }));
  const actual = resolveCreateOverlayMode(fields, preference);
  if (actual !== expected) errors.push(`create overlay ${fieldCount}/${preference}: expected ${expected}, got ${actual}`);
}
const preservedModal = resolveCreateOverlayMode(Array.from({ length: 18 }, (_, index) => ({ key: `field-${index + 1}` })), 'auto', { preserveStructure: true });
if (preservedModal !== 'modal') errors.push(`preserveStructure should keep Modal, got ${preservedModal}`);
for (const [fieldCount, expected] of [[6, 'modal'], [7, 'drawer'], [16, 'drawer'], [17, 'page']]) {
  const actual = resolveContextPresentation(fieldCount);
  if (actual !== expected) errors.push(`context presentation ${fieldCount}: expected ${expected}, got ${actual}`);
}
const drawerSizeCases = [
  [8, 'auto', 'default'],
  [9, 'auto', 'large'],
  [4, 'large', 'large'],
  [20, 'default', 'default']
];
for (const [fieldCount, preference, expected] of drawerSizeCases) {
  const actual = resolveDrawerSize(fieldCount, preference);
  if (actual !== expected) errors.push(`drawer size ${fieldCount}/${preference}: expected ${expected}, got ${actual}`);
}
const capabilityDefinitions = new Map((registry.capabilities || []).map((item) => [item.id, item]));
const capabilities = new Map([...capabilityDefinitions].map(([id, item]) => [id, item.runtimeStatus]));
const skeletonDefinitions = new Map((registry.skeletons || []).map((item) => [item.id, item]));
const skeletons = new Set(skeletonDefinitions.keys());
const regions = new Map((registry.regions || []).map((item) => [item.id, item]));
const rendererIds = listRendererDefinitions().map((item) => item.id);
if (rendererIds.length !== new Set(rendererIds).size) errors.push('renderer registry contains duplicate ids');
for (const renderer of listRendererDefinitions()) {
  if (typeof renderer.render !== 'function') errors.push(`renderer ${renderer.id} has no render function`);
  if (typeof renderer.createScaffold !== 'function') errors.push(`renderer ${renderer.id} has no scaffold factory`);
}

function componentTypes(rootNode) {
  const types = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type) types.add(node.type);
    for (const child of node.children || []) visit(child);
  };
  visit(rootNode);
  return types;
}

for (const recipe of rules.recipes || []) {
  if (!skeletons.has(recipe.skeleton)) errors.push(`recipe ${recipe.id} references unknown skeleton ${recipe.skeleton}`);
  if (recipe.runtimeStatus === 'implemented' && skeletonDefinitions.get(recipe.skeleton)?.runtimeStatus !== 'implemented') errors.push(`implemented recipe ${recipe.id} uses non-implemented skeleton ${recipe.skeleton}`);
  for (const capability of [...(recipe.capabilities || []), ...(recipe.optionalCapabilities || [])]) {
    if (!capabilities.has(capability)) errors.push(`recipe ${recipe.id} references unknown capability ${capability}`);
    if ((recipe.capabilities || []).includes(capability) && recipe.runtimeStatus === 'implemented' && capabilities.get(capability) !== 'implemented') errors.push(`implemented recipe ${recipe.id} uses non-implemented capability ${capability}`);
  }
  if (recipe.runtimeStatus === 'implemented' && !recipe.rendererId) errors.push(`implemented recipe ${recipe.id} has no rendererId`);
  const renderer = getRendererDefinition(recipe.rendererId);
  if (recipe.rendererId && !renderer) errors.push(`recipe ${recipe.id} references unregistered renderer ${recipe.rendererId}`);
  if (renderer && renderer.pageFamily !== recipe.pageFamily) errors.push(`recipe ${recipe.id} and renderer ${recipe.rendererId} use different page families`);
  if (renderer) {
    const scaffold = createRendererScaffold(recipe.rendererId, { recipeId: recipe.id, capabilities: recipe.capabilities || [] });
    const types = componentTypes(scaffold.root);
    const roles = (scaffold.regions || []).map((region) => region.role);
    let previousRoleIndex = -1;
    for (const role of recipe.requiredRegionRoles || []) {
      const roleIndex = roles.indexOf(role);
      if (roleIndex < 0) errors.push(`renderer ${recipe.rendererId} scaffold for ${recipe.id} is missing region role ${role}`);
      else if (roleIndex < previousRoleIndex) errors.push(`renderer ${recipe.rendererId} scaffold for ${recipe.id} has region role ${role} out of order`);
      previousRoleIndex = Math.max(previousRoleIndex, roleIndex);
    }
    for (const type of recipe.requiredComponentTypes || []) {
      if (!types.has(type)) errors.push(`renderer ${recipe.rendererId} scaffold for ${recipe.id} is missing component type ${type}`);
    }
    for (const key of recipe.requiredData || []) {
      if (!Array.isArray(scaffold.data?.[key])) errors.push(`renderer ${recipe.rendererId} scaffold for ${recipe.id} is missing data array ${key}`);
    }
  }
}
for (const region of registry.regions || []) {
  for (const capability of region.capabilities || []) {
    const definition = capabilityDefinitions.get(capability);
    if (!definition) errors.push(`region ${region.id} references unknown capability ${capability}`);
    else if (definition.region !== region.id) errors.push(`capability ${capability} points to ${definition.region}, not region ${region.id}`);
  }
}
for (const definition of registry.capabilities || []) {
  if (!regions.has(definition.region)) errors.push(`capability ${definition.id} references unknown region ${definition.region}`);
  else if (!(regions.get(definition.region).capabilities || []).includes(definition.id)) errors.push(`region ${definition.region} does not list capability ${definition.id}`);
}
for (const transition of rules.transitions || []) {
  for (const capability of transition.requires || []) if (!capabilities.has(capability)) errors.push(`transition ${transition.id} references unknown capability ${capability}`);
}
for (const signal of rules.capabilitySignals || []) if (!capabilities.has(signal.id)) errors.push(`capability signal references unknown capability ${signal.id}`);

const mixedScaffold = createRendererScaffold('yipex-standard-query-table-v1', { capabilities: ['query.basic', 'table.flat', 'table.pagination', 'summary.metrics', 'summary.aggregate', 'detail.overlay', 'form.overlay', 'query.dateRange', 'table.selection', 'table.export'] });
const mixedTypes = componentTypes(mixedScaffold.root);
for (const type of ['metrics', 'detail-overlay', 'date-range']) if (!mixedTypes.has(type)) errors.push(`mixed query scaffold is missing component type ${type}`);
const mixedTable = mixedScaffold.root.children.find((node) => node.id === 'result-region');
if (!mixedTable?.props?.rowSelection) errors.push('mixed query scaffold does not enable row selection');
if (!mixedTable?.children?.some((node) => node.id === 'export-results')) errors.push('mixed query scaffold does not include export action');
if (!mixedScaffold.root.children.some((node) => node.id === 'form-overlay-region')) errors.push('mixed query scaffold is missing form overlay');
const referencedRendererIds = new Set((rules.recipes || []).map((recipe) => recipe.rendererId).filter(Boolean));
for (const rendererId of rendererIds) {
  if (!referencedRendererIds.has(rendererId)) errors.push(`registered renderer ${rendererId} is not referenced by any recipe`);
}
for (const mode of ['auto', 'standard', 'open', 'strict']) {
  if (!policy.modes?.[mode]) errors.push(`missing policy mode ${mode}`);
}
if (policy.defaultMode !== 'auto') errors.push('defaultMode must remain auto to preserve open generation');
if (errors.length) {
  console.error(`yipex-capability-model: fail\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`yipex-capability-model: pass (${registry.skeletons.length} skeletons, ${registry.capabilities.length} capabilities, ${rules.recipes.length} recipes, ${rendererIds.length} renderers)`);
