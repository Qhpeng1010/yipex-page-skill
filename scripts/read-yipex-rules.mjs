#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { matchingSignals, resolvePageFamily } from './lib/yipex-routing.mjs';

const root = existsSync(resolve(process.cwd(), 'modules/yipex'))
  ? process.cwd()
  : resolve(process.cwd(), 'yipex-page-skill');
const indexPath = resolve(root, 'modules/yipex/rules-index.json');
const rulesCache = new Map();

function readRules(request = '', options = {}) {
  const cacheKey = `${request}\u0000${options.pageFamily || ''}`;
  if (rulesCache.has(cacheKey)) return structuredClone(rulesCache.get(cacheKey));
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  const moduleRoot = dirname(indexPath);
  const designRoot = resolve(dirname(indexPath), index.designRoot);
  const source = String(request);
  const family = resolvePageFamily(index, source, options.pageFamily);
  const groups = new Set(['core', ...(index.alwaysGroups || []), ...(family.route.contextGroups || [])]);
  const triggeredGroups = new Set();
  for (const [group, signals] of Object.entries(index.signals || {})) {
    if (matchingSignals(source, signals).length) {
      groups.add(group);
      triggeredGroups.add(group);
    }
  }
  const contextFiles = [...new Set([...groups].flatMap((group) => index.loading[group] || []))];
  const referenceFiles = [...new Set([
    ...[...triggeredGroups].flatMap((group) => index.deepLoading?.[group] || []),
    ...(family.route.files || [])
  ])];
  const files = [...contextFiles, ...referenceFiles];
  const presentationIntent = index.contract?.presentationIntent || 'design-system/director-rules/02-template-application-rules.md';
  const missing = [
    ...files.filter((file) => !existsSync(resolve(moduleRoot, file))),
    ...(!existsSync(resolve(moduleRoot, presentationIntent)) ? [presentationIntent] : [])
  ];
  const result = {
    designRoot,
    groups: [...groups],
    triggeredGroups: [...triggeredGroups],
    pageFamily: family.pageFamily,
    pageFamilySource: family.source,
    contextFiles,
    referenceFiles,
    files,
    presentationIntent,
    missing
  };
  rulesCache.set(cacheKey, result);
  return structuredClone(result);
}

function clearRulesCache() { rulesCache.clear(); }

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const familyIndex = args.indexOf('--page-family');
  const pageFamily = familyIndex >= 0 ? args[familyIndex + 1] : undefined;
  const request = args
    .filter((_, index) => familyIndex < 0 || (index !== familyIndex && index !== familyIndex + 1))
    .join(' ');
  console.log(JSON.stringify(readRules(request, { pageFamily }), null, 2));
}

export { clearRulesCache, readRules };
