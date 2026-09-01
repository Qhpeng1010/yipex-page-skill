#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { readRules } from './read-yipex-rules.mjs';
import { resolvePageStrategy } from './lib/yipex-capability-policy.mjs';
import { createRendererScaffold } from './lib/yipex-renderer-registry.mjs';
import { createDemandScopedNavigation } from './lib/yipex-navigation.mjs';

const args = process.argv.slice(2);
const changeDir = args[0];
if (!changeDir) {
  console.error('Usage: node scripts/scaffold-yipex-page.mjs changes/{change-id} [--request "<request>"] [--page-family <family>] [--mode auto|standard|open|strict]');
  process.exit(2);
}
const requestIndex = args.indexOf('--request');
const familyIndex = args.indexOf('--page-family');
const modeIndex = args.indexOf('--mode');
const request = requestIndex >= 0 ? args[requestIndex + 1] || '' : '';
const requestedFamily = familyIndex >= 0 ? args[familyIndex + 1] || '' : '';
const mode = modeIndex >= 0 ? args[modeIndex + 1] || undefined : undefined;
const target = resolve(process.cwd(), changeDir);
mkdirSync(target, { recursive: true });
const changeId = basename(target);
const rules = readRules(request, { pageFamily: requestedFamily || undefined });
if (rules.missing.length) {
  console.error(`Cannot scaffold because routed rules are missing:\n- ${rules.missing.join('\n- ')}`);
  process.exit(1);
}
const pageFamily = rules.pageFamily;
const strategy = resolvePageStrategy(request, { mode, pageFamily });
if (strategy.strategy === 'capability-gap') {
  writeFileSync(resolve(target, 'capability-gap.md'), `# YiPex 能力缺口\n\n- 请求：${request || '[未提供]'}\n- 模式：${strategy.mode}\n- 页面族：${strategy.family}\n- 原因：${strategy.reason}\n- 建议：使用 --mode open 探索新组合，或先登记并实现对应 Recipe。\n`);
  console.log(`yipex-page-scaffold: gap (${changeDir}, ${strategy.reason})`);
  process.exit(0);
}
const rendererId = strategy.strategy === 'standard' ? strategy.rendererId : null;
const scaffold = rendererId
  ? createRendererScaffold(rendererId, { recipeId: strategy.recipeId, capabilities: strategy.capabilities })
  : {
      pageName: 'YiPex 页面',
      density: pageFamily === 'dashboard' || pageFamily === 'list' ? 'compact' : 'standard',
      regions: [{ id: 'page-content', role: 'main-content', purpose: '承载本页核心任务与信息' }],
      hierarchy: { primary: '本页核心任务', secondary: [] },
      operations: { primary: null, secondary: [] },
      stateCoverage: ['loading', 'empty', 'error', 'permission-denied'],
      responsive: { desktop: '在固定 Shell 内容区内呈现完整页面结构', narrow: '改为单列并保留核心任务的可读性与可操作性' },
      root: { id: 'page-root', type: 'page', props: { title: 'YiPex 页面' }, children: [{ id: 'page-content', type: 'content-region', label: '页面内容', children: [] }] },
      data: { demo: true },
      states: { loading: false, empty: false, error: false, 'permission-denied': false, success: false },
      interactions: []
    };
const navigation = createDemandScopedNavigation({ request, pageName: scaffold.pageName, changeId });
const spec = {
  schemaVersion: 2,
  metadata: {
    changeId,
    pageName: scaffold.pageName,
    pageType: pageFamily,
    componentLibrary: { name: 'antd', source: 'official' },
    request,
    assumptions: [],
    ruleRefs: [...new Set([...rules.files, rules.presentationIntent, 'execution/page-contract-v2.md', 'execution/capability-model/capability-model.md'])],
    generation: {
      mode: strategy.mode,
      strategy: strategy.strategy,
      recipeId: strategy.recipeId,
      referenceRecipeId: strategy.referenceRecipeId || undefined,
      skeleton: strategy.skeleton,
      capabilities: strategy.capabilities,
      policyVersion: strategy.policyVersion,
      modelVersion: strategy.modelVersion,
      rendererId: rendererId || undefined
    }
  },
  contract: {
    pageFamily,
    shell: 'yipex-default',
    density: scaffold.density,
    regions: scaffold.regions,
    hierarchy: scaffold.hierarchy,
    operations: scaffold.operations,
    stateCoverage: scaffold.stateCoverage,
    responsive: scaffold.responsive,
    deviations: []
  },
  page: {
    shell: {
      id: 'yipex-default',
      sidebar: { width: 200, background: '#F0F0F0', showCollapseControl: true },
      navigation,
      header: { welcome: '欢迎回来', userName: '用户', email: 'user@yipex.tech' },
      footer: { copyright: 'Copyright Somei E-Commerce Limited 2025. All rights reserved' },
      floatingTools: { show: false }
    },
    root: scaffold.root,
    data: scaffold.data,
    states: scaffold.states,
    interactions: scaffold.interactions,
    extensions: {
      presentationDecisions: {},
      ...(rendererId ? { renderer: rendererId } : {}),
      generation: {
        strategy: strategy.strategy,
        recipeId: strategy.recipeId,
        referenceRecipeId: strategy.referenceRecipeId || undefined,
        skeleton: strategy.skeleton,
        capabilities: strategy.capabilities,
        rendererId: rendererId || undefined
      }
    }
  }
};
const specPath = resolve(target, 'page-spec.json');
writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
writeFileSync(resolve(target, 'proposal.md'), '# Proposal\n\n- 需求原文：\n- 页面目标：\n- 使用角色：\n- 关键操作：\n');
console.log(`yipex-page-scaffold: pass (${changeDir}, schema v2, family ${pageFamily}, strategy ${strategy.strategy})`);
