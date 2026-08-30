#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { getRendererDefinition } from './lib/yipex-renderer-registry.mjs';

const startedAt = performance.now();
const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/validate-yipex-page-spec.mjs <page-spec.json>');
  process.exit(2);
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rulesIndex = JSON.parse(readFileSync(resolve(projectRoot, 'modules/yipex/rules-index.json'), 'utf8'));
const retiredRuleRefs = rulesIndex.retiredRuleRefs || {};
const spec = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'));
const errors = [];
const components = new Map();

if (![1, 2].includes(spec.schemaVersion)) errors.push('schemaVersion must be 1 or 2');
if (!spec.metadata?.changeId || !/^[0-9]{8}-[a-z0-9-]+$/.test(spec.metadata.changeId)) errors.push('metadata.changeId must use YYYYMMDD-slug');
if (!spec.metadata?.pageName) errors.push('metadata.pageName is required');
if (!spec.metadata?.pageType) errors.push('metadata.pageType is required');
if (!spec.page?.root || typeof spec.page.root !== 'object') errors.push('page.root is required');

function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (!node.id) errors.push('every component needs id');
  else if (components.has(node.id)) errors.push(`duplicate component id: ${node.id}`);
  else components.set(node.id, node);
  if (node.children && !Array.isArray(node.children)) errors.push(`children must be an array: ${node.id || 'unknown'}`);
  for (const child of node.children || []) visit(child);
}
visit(spec.page?.root);

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateRuleRef(ruleRef) {
  if (!hasText(ruleRef)) return false;
  const alias = retiredRuleRefs[ruleRef] || retiredRuleRefs[basename(ruleRef)];
  const refs = [ruleRef, alias].filter(Boolean);
  const candidates = refs.flatMap((ref) => ref.startsWith('modules/') || ref.startsWith('references/')
    ? [resolve(projectRoot, ref)]
    : ref.includes('/')
      ? [resolve(projectRoot, 'modules/yipex', ref)]
      : [resolve(projectRoot, 'modules/yipex/design-system', ref)]);
  return candidates.some((candidate) => existsSync(candidate));
}

function eventTargets(node) {
  return Object.values(node?.events || {}).filter((value) => typeof value === 'string');
}

function validateV2() {
  const contract = spec.contract;
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    errors.push('contract is required for schemaVersion 2');
    return;
  }

  if (spec.metadata?.componentLibrary?.name !== 'antd' || spec.metadata?.componentLibrary?.source !== 'official') {
    errors.push('metadata.componentLibrary must declare official antd for schemaVersion 2');
  }
  if (!hasText(contract.pageFamily)) errors.push('contract.pageFamily is required');
  if (!hasText(contract.shell)) errors.push('contract.shell is required');
  if (!['comfortable', 'standard', 'compact'].includes(contract.density)) errors.push('contract.density must be comfortable, standard, or compact');
  if (spec.page?.shell?.id !== contract.shell) errors.push('contract.shell must match page.shell.id');

  if (!Array.isArray(contract.regions) || contract.regions.length === 0) {
    errors.push('contract.regions must contain at least one region');
  } else {
    const regionIds = new Set();
    for (const [index, region] of contract.regions.entries()) {
      const label = `contract.regions[${index}]`;
      if (!hasText(region?.id) || !hasText(region?.role) || !hasText(region?.purpose)) errors.push(`${label} requires id, role, and purpose`);
      if (region?.id && regionIds.has(region.id)) errors.push(`duplicate contract region id: ${region.id}`);
      if (region?.id) regionIds.add(region.id);
      if (region?.id && !components.has(region.id)) errors.push(`contract region has no matching component: ${region.id}`);
    }
  }

  if (!hasText(contract.hierarchy?.primary) || !Array.isArray(contract.hierarchy?.secondary)) {
    errors.push('contract.hierarchy requires primary text and secondary array');
  }

  const interactions = Array.isArray(spec.page?.interactions) ? spec.page.interactions : [];
  const interactionIds = new Set();
  for (const interaction of interactions) {
    if (!hasText(interaction?.id)) errors.push('every interaction needs id');
    else if (interactionIds.has(interaction.id)) errors.push(`duplicate interaction id: ${interaction.id}`);
    else interactionIds.add(interaction.id);
  }

  function validateOperation(operation, label) {
    if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
      errors.push(`${label} must be an operation object or primary may be null`);
      return;
    }
    for (const field of ['id', 'label', 'placement', 'outcome']) {
      if (!hasText(operation[field])) errors.push(`${label}.${field} is required`);
    }
    if (!hasText(operation.id)) return;
    const component = components.get(operation.id);
    if (!component) {
      errors.push(`${label} has no matching component: ${operation.id}`);
      return;
    }
    const targets = eventTargets(component);
    if (!targets.length || !targets.some((target) => interactionIds.has(target))) {
      errors.push(`${label} component must map an event to page.interactions: ${operation.id}`);
    }
  }

  if (!contract.operations || typeof contract.operations !== 'object') {
    errors.push('contract.operations is required');
  } else {
    if (!Object.hasOwn(contract.operations, 'primary')) errors.push('contract.operations.primary must be declared, using null when absent');
    else if (contract.operations.primary !== null) validateOperation(contract.operations.primary, 'contract.operations.primary');
    if (!Array.isArray(contract.operations.secondary)) errors.push('contract.operations.secondary must be an array');
    else contract.operations.secondary.forEach((operation, index) => validateOperation(operation, `contract.operations.secondary[${index}]`));
  }

  if (!Array.isArray(contract.stateCoverage)) {
    errors.push('contract.stateCoverage must be an array');
  } else {
    for (const state of contract.stateCoverage) {
      if (!hasText(state)) errors.push('contract.stateCoverage entries must be non-empty strings');
      else if (!Object.hasOwn(spec.page?.states || {}, state)) errors.push(`contract state is missing from page.states: ${state}`);
    }
  }

  if (!hasText(contract.responsive?.desktop) || !hasText(contract.responsive?.narrow)) {
    errors.push('contract.responsive requires desktop and narrow strategies');
  }

  if (!Array.isArray(contract.deviations)) {
    errors.push('contract.deviations must be an array');
  } else {
    contract.deviations.forEach((deviation, index) => {
      for (const field of ['ruleRef', 'change', 'reason', 'scope']) {
        if (!hasText(deviation?.[field])) errors.push(`contract.deviations[${index}].${field} is required`);
      }
    });
  }

  const presentationDecisions = spec.page?.extensions?.presentationDecisions;
  if (presentationDecisions !== undefined) {
    if (!presentationDecisions || typeof presentationDecisions !== 'object' || Array.isArray(presentationDecisions)) {
      errors.push('page.extensions.presentationDecisions must be an object');
    } else {
      for (const [scope, decision] of Object.entries(presentationDecisions)) {
        const label = `page.extensions.presentationDecisions.${scope}`;
        if (!hasText(scope)) errors.push('presentation decision scope must be a non-empty key');
        if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
          errors.push(`${label} must be an object`);
          continue;
        }
        if (!hasText(decision.mode)) errors.push(`${label}.mode is required`);
        if (!['explicit', 'inferred-high', 'pattern-default'].includes(decision.confidence)) errors.push(`${label}.confidence must be explicit, inferred-high, or pattern-default`);
        if (!Array.isArray(decision.evidence) || decision.evidence.length === 0 || decision.evidence.some((item) => !hasText(item))) errors.push(`${label}.evidence must contain non-empty requirement evidence`);
        if (!hasText(decision.baseComponent)) errors.push(`${label}.baseComponent is required`);
        if (typeof decision.requiresDeviation !== 'boolean') errors.push(`${label}.requiresDeviation must be boolean`);
        if (decision.requiresDeviation === true && (!Array.isArray(contract.deviations) || contract.deviations.length === 0)) errors.push(`${label} requires a matching contract.deviations entry`);
      }
    }
  }

  if (!Array.isArray(spec.metadata?.ruleRefs) || spec.metadata.ruleRefs.length === 0) {
    errors.push('metadata.ruleRefs must contain the rules used by schemaVersion 2');
  } else {
    for (const ruleRef of spec.metadata.ruleRefs) {
      if (!validateRuleRef(ruleRef)) errors.push(`metadata.ruleRefs file does not exist: ${ruleRef}`);
    }
  }

  validateGenerationMetadata();
}

function validateGenerationMetadata() {
  const contract = spec.contract || {};
  const generation = spec.metadata?.generation || spec.page?.extensions?.generation;
  if (generation === undefined) return;
  if (!generation || typeof generation !== 'object' || Array.isArray(generation)) {
    errors.push('generation metadata must be an object');
    return;
  }
  if (generation.mode !== undefined && !['auto', 'standard', 'open', 'strict'].includes(generation.mode)) {
    errors.push('generation.mode must be auto, standard, open, or strict');
  }
  if (generation.strategy !== undefined && !['standard', 'open', 'capability-gap'].includes(generation.strategy)) {
    errors.push('generation.strategy must be standard, open, or capability-gap');
  }
  if (generation.capabilities !== undefined && (!Array.isArray(generation.capabilities) || generation.capabilities.some((id) => typeof id !== 'string' || !id.trim()))) {
    errors.push('generation.capabilities must be an array of non-empty strings');
  }
  if (generation.strategy === 'standard' && !hasText(generation.recipeId)) {
    errors.push('standard generation requires generation.recipeId');
  }
  if (generation.rendererId !== undefined && !hasText(generation.rendererId)) {
    errors.push('generation.rendererId must be a non-empty string when declared');
  }
  if (generation.strategy === 'open' && generation.rendererId !== undefined) {
    errors.push('open generation must not declare a fixed standard renderer');
  }
  const registryPath = resolve(projectRoot, 'modules/yipex/execution/capability-model/capability-registry.json');
  if (existsSync(registryPath) && Array.isArray(generation.capabilities)) {
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    const known = new Set((registry.capabilities || []).map((item) => item.id));
    for (const capability of generation.capabilities) {
      if (!known.has(capability)) errors.push(`generation capability is not registered: ${capability}`);
    }
  }
  const rulesPath = resolve(projectRoot, 'modules/yipex/execution/capability-model/composition-rules.json');
  if (existsSync(rulesPath) && generation.recipeId) {
    const rules = JSON.parse(readFileSync(rulesPath, 'utf8'));
    const recipe = (rules.recipes || []).find((item) => item.id === generation.recipeId);
    if (!recipe) {
      errors.push(`generation recipe is not registered: ${generation.recipeId}`);
      return;
    }
    if (generation.strategy === 'standard') {
      if (recipe.runtimeStatus !== 'implemented') errors.push(`standard generation recipe is not implemented: ${generation.recipeId}`);
      const componentTypes = new Set([...components.values()].map((component) => component.type));
      for (const type of recipe.requiredComponentTypes || []) {
        if (!componentTypes.has(type)) errors.push(`recipe ${generation.recipeId} requires component type: ${type}`);
      }
      for (const key of recipe.requiredData || []) {
        if (!Array.isArray(spec.page?.data?.[key])) errors.push(`recipe ${generation.recipeId} requires page.data.${key} array`);
      }
      if (recipe.rendererId && spec.page?.extensions?.renderer !== recipe.rendererId) {
        errors.push(`recipe ${generation.recipeId} requires renderer ${recipe.rendererId}`);
      }
      if (generation.rendererId && generation.rendererId !== recipe.rendererId) {
        errors.push(`generation.rendererId must match recipe ${generation.recipeId}: ${recipe.rendererId}`);
      }
      if (recipe.rendererId) {
        const renderer = getRendererDefinition(recipe.rendererId);
        if (!renderer) errors.push(`recipe ${generation.recipeId} references unregistered renderer ${recipe.rendererId}`);
        else if (renderer.pageFamily !== contract.pageFamily) errors.push(`renderer ${recipe.rendererId} belongs to page family ${renderer.pageFamily}, not ${contract.pageFamily}`);
      }
      if (contract.pageFamily !== recipe.pageFamily) {
        errors.push(`recipe ${generation.recipeId} requires contract.pageFamily ${recipe.pageFamily}`);
      }
      for (const capability of recipe.capabilities || []) {
        if (!generation.capabilities?.includes(capability)) errors.push(`recipe ${generation.recipeId} requires capability ${capability}`);
      }
      const roles = (contract.regions || []).map((region) => region.role);
      let previousRoleIndex = -1;
      for (const role of recipe.requiredRegionRoles || []) {
        const roleIndex = roles.indexOf(role);
        if (roleIndex < 0) errors.push(`recipe ${generation.recipeId} requires contract region role ${role}`);
        else if (roleIndex < previousRoleIndex) errors.push(`recipe ${generation.recipeId} requires contract region role ${role} after ${recipe.requiredRegionRoles[recipe.requiredRegionRoles.indexOf(role) - 1]}`);
        previousRoleIndex = Math.max(previousRoleIndex, roleIndex);
      }
    }
  }
}

if (spec.schemaVersion === 2) validateV2();

if (errors.length) {
  console.error(`yipex-page-spec: fail\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
const elapsed = Math.max(1, Math.round(performance.now() - startedAt));
console.log(`yipex-page-spec: pass (${components.size} components, ${elapsed}ms)`);
