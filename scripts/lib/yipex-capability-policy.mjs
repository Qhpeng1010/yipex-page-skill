import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { matchingSignals, resolvePageFamily } from './yipex-routing.mjs';

const POLICY_PATH = 'modules/yipex/execution/generation-policy.json';
const REGISTRY_PATH = 'modules/yipex/execution/capability-model/capability-registry.json';
const RULES_PATH = 'modules/yipex/execution/capability-model/composition-rules.json';
const RULE_INDEX_PATH = 'modules/yipex/rules-index.json';
const policyCache = new Map();

function projectRoot(root = process.cwd()) {
  return existsSync(resolve(root, 'modules/yipex')) ? root : resolve(root, 'yipex-page-skill');
}

function readJson(root, file) {
  return JSON.parse(readFileSync(resolve(root, file), 'utf8'));
}

export function readCapabilityPolicy(root = process.cwd()) {
  const base = projectRoot(root);
  if (policyCache.has(base)) return structuredClone(policyCache.get(base));
  const result = {
    root: base,
    policy: readJson(base, POLICY_PATH),
    registry: readJson(base, REGISTRY_PATH),
    rules: readJson(base, RULES_PATH),
    rulesIndex: readJson(base, RULE_INDEX_PATH)
  };
  policyCache.set(base, result);
  return structuredClone(result);
}

export function clearCapabilityPolicyCache() { policyCache.clear(); }

function definitionEvidence(definition, source) {
  const evidence = matchingSignals(source, definition.signals || []);
  for (const pattern of definition.patterns || []) {
    try {
      const match = source.match(new RegExp(pattern, 'i'));
      if (match?.[0]) evidence.push(match[0]);
    } catch (_) {}
  }
  return [...new Set(evidence)];
}

function recipeScore(recipe, source, family, requestedIds) {
  if (recipe.pageFamily !== family && recipe.pageFamily !== 'custom') return -1;
  if (matchingSignals(source, recipe.negativeSignals || []).length) return -1;
  if (recipe.requiresAnyCapabilities?.length && !recipe.requiresAnyCapabilities.some((id) => requestedIds.has(id))) return -1;
  const strongMatches = matchingSignals(source, recipe.strongSignals || []);
  const signalMatches = matchingSignals(source, recipe.signals || []);
  if (!strongMatches.length && !signalMatches.length) return -1;
  const strongScore = strongMatches.reduce((score, signal) => score + 1000 + signal.length * 20, 0);
  const signalScore = signalMatches.reduce((score, signal) => score + signal.length, 0);
  return strongScore + signalScore + Number(recipe.priority || 0);
}

function findRecipe(rules, source, family, requested) {
  const requestedIds = new Set(requested.map((item) => item.id));
  return [...(rules.recipes || [])]
    .map((recipe) => ({ recipe, score: recipeScore(recipe, source, family, requestedIds) }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => right.score - left.score)[0]?.recipe || null;
}

function missingCapabilities(registry, capabilityIds) {
  const statuses = new Map((registry.capabilities || []).map((item) => [item.id, item.runtimeStatus]));
  return capabilityIds.filter((id) => statuses.get(id) !== 'implemented');
}

function requestedCapabilities(rules, source, family) {
  return (rules.capabilitySignals || [])
    .filter((definition) => !definition.pageFamilies?.length || definition.pageFamilies.includes(family))
    .map((definition) => ({ id: definition.id, evidence: definitionEvidence(definition, source) }))
    .filter((definition) => definition.evidence.length);
}

function unregisteredFeatureEvidence(rules, source, family, rulesIndex) {
  const routing = rulesIndex.presentationRouting || {};
  const markers = routing.featureMarkers || ['支持', '可以', '能够', '允许', '提供'];
  const behaviorSignals = routing.featureBehaviorSignals || [];
  // Form recipes already own the ordinary submit/edit lifecycle. Those verbs
  // are page actions, not evidence of an unregistered capability; preserve
  // genuinely new behaviors such as import, drag-and-drop or branching.
  const formLifecycleSignals = ['新增', '新建', '创建', '编辑', '提交', '保存', '取消', '校验'];
  const escaped = markers.map((marker) => marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const markerPattern = new RegExp(`(?:${escaped.join('|')})([^。；;\\n]+)`, 'gi');
  const definitions = (rules.capabilitySignals || []).filter((definition) => !definition.pageFamilies?.length || definition.pageFamilies.includes(family));
  const items = [];
  for (const match of source.matchAll(markerPattern)) {
    const parts = match[1]
      .split(/[，,、]|(?:以及|并且|同时|并|和)/)
      .map((part) => part.trim().replace(/^(进行|实现|使用)/, ''))
      .filter((item) => item.length >= 2);
    const matchedDefinitions = parts.map((item) => definitions.filter((definition) => definitionEvidence(definition, item).length));
    const hasQueryContext = matchedDefinitions.some((matches) => matches.some((definition) => definition.id === 'query.basic' || definition.id === 'query.dateRange'));
    for (let index = 0; index < parts.length; index += 1) {
      if (matchedDefinitions[index].length) continue;
      const item = parts[index];
      if (family === 'form' && matchingSignals(item, formLifecycleSignals).length && !matchingSignals(item, behaviorSignals.filter((signal) => !formLifecycleSignals.includes(signal))).length) continue;
      // In a query clause, noun-only siblings describe fields or filter
      // parameters. Keep behavior/structure phrases as capability evidence.
      if (hasQueryContext && !matchingSignals(item, behaviorSignals).length) continue;
      items.push(item);
    }
  }
  return [...new Set(items)];
}

export function resolvePresentationIntent(request, family, rulesIndex = {}, capabilityIds = []) {
  const source = String(request || '').trim();
  const routing = rulesIndex.presentationRouting || {};
  const contextFamilies = routing.contextFamilies || ['list', 'dashboard'];
  const pagePatternMatches = (routing.pagePatterns || [])
    .filter((pattern) => {
      try { return new RegExp(pattern, 'i').test(source); } catch (_) { return false; }
    });
  const evidence = {
    modal: matchingSignals(source, routing.modalSignals || []),
    drawer: matchingSignals(source, routing.drawerSignals || []),
    page: [...matchingSignals(source, routing.pageSignals || []), ...pagePatternMatches],
    nonPage: matchingSignals(source, routing.nonPageSignals || [])
  };
  const operationEvidence = matchingSignals(source, routing.operationSignals || []);
  const contextOperation = capabilityIds.some((id) => id === 'detail.overlay' || id === 'form.overlay');
  const explicitCarrier = evidence.modal.length > 0 || evidence.drawer.length > 0 || evidence.page.length > 0;
  const applicable = contextFamilies.includes(family) && (contextOperation || explicitCarrier);
  if (!applicable) {
    return { applicable: false, mode: 'none', explicit: false, evidence, operationEvidence };
  }
  const explicitModes = ['modal', 'drawer', 'page'].filter((mode) => evidence[mode].length > 0);
  const thresholds = routing.automaticThresholds || { modalMax: 6, drawerMax: 16 };
  if (explicitModes.length > 1) {
    return {
      applicable: true,
      mode: 'conflict',
      explicit: true,
      requiresClarification: routing.conflictMode === 'clarify',
      evidence,
      operationEvidence,
      thresholds,
      pageComposition: 'undetermined'
    };
  }
  if (explicitModes.length === 1) {
    const mode = explicitModes[0];
    return {
      applicable: true,
      mode,
      explicit: true,
      requiresClarification: false,
      evidence,
      operationEvidence,
      thresholds,
      pageComposition: mode === 'page' ? 'required' : 'not-needed'
    };
  }
  return {
    applicable: true,
    mode: 'field-count',
    explicit: false,
    requiresClarification: false,
    evidence,
    operationEvidence,
    thresholds,
    pageComposition: 'only-when-field-count-exceeds-drawer-max'
  };
}

export function resolvePageStrategy(request, options = {}, root = process.cwd()) {
  const source = String(request || '').trim();
  const model = readCapabilityPolicy(root);
  const mode = options.mode || model.policy.defaultMode || 'auto';
  if (!['auto', 'standard', 'open', 'strict'].includes(mode)) {
    throw new Error(`Unsupported YiPex generation mode: ${mode}`);
  }
  const family = resolvePageFamily(model.rulesIndex, source, options.pageFamily).pageFamily;
  const requested = requestedCapabilities(model.rules, source, family);
  const presentationIntent = resolvePresentationIntent(source, family, model.rulesIndex, requested.map((item) => item.id));
  const recipe = findRecipe(model.rules, source, family, requested);
  const unregisteredFeatures = unregisteredFeatureEvidence(model.rules, source, family, model.rulesIndex);
  const allowedCapabilities = new Set([...(recipe?.capabilities || []), ...(recipe?.optionalCapabilities || [])]);
  const selectedOptional = requested.filter((item) => allowedCapabilities.has(item.id) && !(recipe?.capabilities || []).includes(item.id));
  const unsupportedRequested = requested.filter((item) => recipe && !allowedCapabilities.has(item.id));
  const capabilities = [...new Set([...(recipe?.capabilities || []), ...selectedOptional.map((item) => item.id)])];
  const missing = recipe ? missingCapabilities(model.registry, capabilities) : [];
  const strict = mode === 'standard' || mode === 'strict';
  const recipeReady = Boolean(recipe && recipe.runtimeStatus === 'implemented' && missing.length === 0 && unsupportedRequested.length === 0 && unregisteredFeatures.length === 0);
  const useStandard = Boolean(recipeReady && mode !== 'open');
  const capabilityGap = strict && !recipeReady;
  return {
    mode,
    strategy: capabilityGap ? 'capability-gap' : useStandard ? 'standard' : 'open',
    family,
    recipeId: useStandard || capabilityGap ? recipe?.id || null : null,
    rendererId: useStandard ? recipe?.rendererId || null : null,
    referenceRecipeId: !useStandard && !capabilityGap ? recipe?.id || null : null,
    skeleton: recipe?.skeleton || (family === 'custom' ? 'custom-composition' : null),
    baseCapabilities: recipe?.capabilities || [],
    optionalCapabilities: selectedOptional.map((item) => item.id),
    capabilities,
    capabilityEvidence: Object.fromEntries(requested.map((item) => [item.id, item.evidence])),
    missingCapabilities: missing,
    unsupportedRequestedCapabilities: unsupportedRequested.map((item) => item.id),
    unregisteredFeatureEvidence: unregisteredFeatures,
    availability: recipe?.runtimeStatus || 'unregistered',
    presentationIntent,
    reason: mode === 'open'
      ? recipe
        ? `已显式选择开放模式；仅将 Recipe ${recipe.id} 记录为结构参考，不使用固定渲染器`
        : '已显式选择开放模式，使用开放式 Page Contract'
      : capabilityGap
      ? recipe
        ? `Recipe ${recipe.id} 尚未满足可交付能力：${[...missing, ...unsupportedRequested.map((item) => item.id), ...unregisteredFeatures.map((item) => `unregistered:${item}`)].join(', ') || recipe.runtimeStatus}`
        : `未找到 ${family} 的已验证 Recipe`
      : useStandard
        ? `命中已实现 Recipe ${recipe.id}${selectedOptional.length ? `，并装配 ${selectedOptional.map((item) => item.id).join(', ')}` : ''}`
        : recipe && !recipeReady
        ? `Recipe ${recipe.id} 无法覆盖全部需求${unregisteredFeatures.length ? `（未登记：${unregisteredFeatures.join('、')}）` : ''}，使用开放式 Page Contract`
          : '需求未命中标准 Recipe，使用开放式 Page Contract',
    policyVersion: model.policy.policyVersion || model.policy.strategyVersion,
    modelVersion: model.registry.modelVersion
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const requestIndex = args.indexOf('--request');
  const modeIndex = args.indexOf('--mode');
  const familyIndex = args.indexOf('--page-family');
  const request = requestIndex >= 0 ? args[requestIndex + 1] || '' : '';
  const mode = modeIndex >= 0 ? args[modeIndex + 1] || undefined : undefined;
  const pageFamily = familyIndex >= 0 ? args[familyIndex + 1] || undefined : undefined;
  if (!request) {
    console.error('Usage: node scripts/lib/yipex-capability-policy.mjs --request "<request>" [--mode auto|standard|open|strict]');
    process.exit(2);
  }
  console.log(JSON.stringify(resolvePageStrategy(request, { mode, pageFamily }), null, 2));
}
