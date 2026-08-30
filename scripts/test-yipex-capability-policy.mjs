#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolvePageStrategy } from './lib/yipex-capability-policy.mjs';
import { readRules } from './read-yipex-rules.mjs';

const cases = [
  ['订单查询列表', {}, 'standard', 'list.query-table'],
  ['账户查询并展示余额汇总', {}, 'standard', 'list.query-summary-table'],
  ['审批工作台', {}, 'open', null],
  ['审批工作台', { mode: 'open' }, 'open', null],
  ['结果页', { mode: 'standard' }, 'standard', 'result.workflow'],
  ['Dashboard 经营概览', {}, 'standard', 'dashboard.overview'],
  ['新增表单提交', {}, 'standard', 'form.grouped-submit'],
  ['新增客户分步表单', {}, 'standard', 'form.stepped-submit'],
  ['分步表单向导', {}, 'standard', 'form.stepped-submit'],
  ['记录详情', {}, 'standard', 'detail.grouped'],
  ['查询列表详情', {}, 'standard', 'list.query-detail-overlay']
];
const errors = [];
for (const [request, options, strategy, recipeId] of cases) {
  const result = resolvePageStrategy(request, options, process.cwd());
  if (result.strategy !== strategy || result.recipeId !== recipeId) {
    errors.push(`${request}: expected ${strategy}/${recipeId}, got ${result.strategy}/${result.recipeId}`);
  }
}

const mixedList = resolvePageStrategy('订单查询列表，需要日期范围、导出、批量选择', {}, process.cwd());
for (const capability of ['query.dateRange', 'table.export', 'table.selection']) {
  if (!mixedList.capabilities.includes(capability)) errors.push(`mixed list is missing ${capability}`);
}
if (mixedList.strategy !== 'standard') errors.push(`mixed list expected standard, got ${mixedList.strategy}`);

const naturalLanguageCases = [
  ['创建客户列表，支持按客户名称和状态筛选、分页', 'list.query-table'],
  ['创建订单查询页，提供订单号、商户名称、状态和时间范围查询，支持导出', 'list.query-table'],
  ['创建用户列表，支持新增、编辑和查看详情', 'list.query-detail-overlay'],
  ['创建经营分析看板，展示核心指标、趋势和分布', 'dashboard.overview']
];
for (const [request, recipeId] of naturalLanguageCases) {
  const result = resolvePageStrategy(request, {}, process.cwd());
  if (result.strategy !== 'standard' || result.recipeId !== recipeId) {
    errors.push(`${request}: expected semantic standard/${recipeId}, got ${result.strategy}/${result.recipeId}`);
  }
  if (result.unregisteredFeatureEvidence.length) errors.push(`${request}: field parameters were treated as unregistered features: ${result.unregisteredFeatureEvidence.join(', ')}`);
}

const queryWithNovelBehavior = resolvePageStrategy('创建客户查询列表，支持按客户名称查询和拖拽节点', {}, process.cwd());
if (queryWithNovelBehavior.strategy !== 'open' || !queryWithNovelBehavior.unregisteredFeatureEvidence.includes('拖拽节点')) {
  errors.push('query field semantics must not hide genuinely novel behavior');
}

const summaryDetail = resolvePageStrategy('客户查询列表，需要详情和汇总指标', {}, process.cwd());
for (const capability of ['detail.overlay', 'summary.metrics', 'summary.aggregate']) {
  if (!summaryDetail.capabilities.includes(capability)) errors.push(`summary detail list is missing ${capability}`);
}

const groupedCreateInList = resolvePageStrategy('生成员工管理流程，包含员工查询列表和员工信息分组表单，点击新增员工进入分组表单，包含姓名、工号、手机号、部门、岗位和状态', {}, process.cwd());
if (groupedCreateInList.family !== 'list') errors.push(`grouped create in list expected list family, got ${groupedCreateInList.family}`);
if (groupedCreateInList.presentationIntent.mode !== 'field-count' || groupedCreateInList.presentationIntent.explicit) errors.push('grouped create in list must use field-count presentation routing');
if (!groupedCreateInList.capabilities.includes('form.overlay')) errors.push('grouped create in list must keep form.overlay available');

const plainList = resolvePageStrategy('创建员工列表', {}, process.cwd());
if (plainList.recipeId !== 'list.query-table') errors.push(`plain list must use base query recipe, got ${plainList.recipeId}`);
if (plainList.capabilities.includes('detail.overlay') || plainList.capabilities.includes('form.overlay')) errors.push('creating a list page must not imply in-page detail or create operations');
if (plainList.presentationIntent.applicable) errors.push('creating a list page must not trigger carrier routing');

const novelList = resolvePageStrategy('创建资金路径列表，支持拖拽节点、条件分支和实时校验', {}, process.cwd());
if (novelList.strategy !== 'open') errors.push(`novel capability inside known list family must use open, got ${novelList.strategy}`);
if (novelList.recipeId || novelList.rendererId) errors.push('open list must not declare a fixed recipe or renderer');
if (novelList.referenceRecipeId !== 'list.query-table') errors.push(`open list should retain only a reference recipe, got ${novelList.referenceRecipeId}`);
for (const evidence of ['拖拽节点', '条件分支']) {
  if (!novelList.unregisteredFeatureEvidence.includes(evidence)) errors.push(`novel list did not preserve unregistered evidence: ${evidence}`);
}

const advancedDashboard = resolvePageStrategy('创建一个经营分析看板，支持全局筛选和下钻', {}, process.cwd());
if (advancedDashboard.strategy !== 'open') errors.push(`dashboard with unimplemented filter/drilldown must use open, got ${advancedDashboard.strategy}`);
for (const capability of ['dashboard.filter', 'dashboard.drilldown']) {
  if (!advancedDashboard.missingCapabilities.includes(capability)) errors.push(`advanced dashboard must report ${capability} as not yet standard`);
}

const explicitCreatePage = resolvePageStrategy('员工查询列表，点击新增员工进入新增员工页面', {}, process.cwd());
if (explicitCreatePage.presentationIntent.mode !== 'page' || !explicitCreatePage.presentationIntent.explicit) errors.push('explicit create page was not recognized as page presentation');
if (explicitCreatePage.presentationIntent.pageComposition !== 'required') errors.push('explicit create page must require Page Composition');

const explicitCreateModal = resolvePageStrategy('员工查询列表，点击新增后使用弹窗录入', {}, process.cwd());
if (explicitCreateModal.presentationIntent.mode !== 'modal' || !explicitCreateModal.presentationIntent.explicit) errors.push('explicit create modal was not recognized as modal presentation');

const returnToListPage = resolvePageStrategy('员工查询列表，点击新增进入分组表单，保存后返回列表页', {}, process.cwd());
if (returnToListPage.presentationIntent.mode !== 'field-count' || returnToListPage.presentationIntent.explicit) errors.push('returning to list page must not imply a standalone create page');

const conflictingPresentation = resolvePageStrategy('员工查询列表，新增员工页面使用弹窗展示', {}, process.cwd());
if (conflictingPresentation.presentationIntent.mode !== 'conflict' || !conflictingPresentation.presentationIntent.requiresClarification) errors.push('conflicting explicit presentation must require clarification');

const explicitOpen = resolvePageStrategy('订单查询列表', { mode: 'open' }, process.cwd());
if (explicitOpen.strategy !== 'open' || !explicitOpen.reason.includes('显式选择开放模式')) errors.push('explicit open mode does not report its selected mode');

const reviewAuto = resolvePageStrategy('新增表单并在提交前确认预览', {}, process.cwd());
if (reviewAuto.strategy !== 'open' || !reviewAuto.missingCapabilities.includes('form.review')) errors.push('declared-only form.review must use open mode in auto');
const reviewStrict = resolvePageStrategy('新增表单并在提交前确认预览', { mode: 'strict' }, process.cwd());
if (reviewStrict.strategy !== 'capability-gap') errors.push(`strict form.review expected capability-gap, got ${reviewStrict.strategy}`);

const simpleRules = readRules('订单查询列表');
const directorFiles = [
  'design-system/director-rules/01-visual-constitution.md',
  'design-system/director-rules/02-template-application-rules.md',
  'design-system/director-rules/03-interaction-acceptance-rules.md'
];
for (const file of directorFiles) {
  if (!simpleRules.contextFiles.includes(file)) errors.push(`simple list must always load ${file}`);
}
if (simpleRules.contextFiles.some((file) => file.endsWith('DESIGN.md'))) errors.push('simple list should use concise director rules instead of always loading DESIGN.md');
if (simpleRules.contextFiles.filter((file) => file.includes('design-system/director-rules/')).length !== 3) errors.push('simple list must load exactly three director rule files');
if (simpleRules.referenceFiles.filter((file) => file.includes('design-system/page-patterns/')).length !== 1) errors.push('simple list must load exactly one page pattern');
if (simpleRules.missing.length) errors.push(`simple list has missing rule files: ${simpleRules.missing.join(', ')}`);
const visualRules = readRules('订单查询列表，调整字体和颜色');
if (!visualRules.contextFiles.includes('design-system/director-rules/01-visual-constitution.md')) errors.push('visual request did not load visual constitution');
if (visualRules.contextFiles.some((file) => file !== 'execution/context-packs/core.md' && !file.includes('design-system/director-rules/'))) errors.push('visual request loaded a duplicate design context pack');
const componentRules = readRules('新增表单，需要输入框、下拉和弹窗组件');
if (componentRules.referenceFiles.some((file) => file.includes('design-system/director-rules/'))) errors.push('component request should not load an extra director rule file');
for (const legacyFile of ['modules/yipex/design-system/01-foundations.md', 'modules/yipex/design-system/02-components.md', 'modules/yipex/design-system/director-rules/04-foundations.md', 'modules/yipex/design-system/director-rules/05-components.md']) {
  if (existsSync(resolve(process.cwd(), legacyFile))) errors.push(`legacy design rule still exists: ${legacyFile}`);
}
const novelRequest = '创建一个资金路径编排画布，支持拖拽节点、条件分支和实时校验';
const novelStrategy = resolvePageStrategy(novelRequest, {}, process.cwd());
const novelRules = readRules(novelRequest, { pageFamily: novelStrategy.family });
if (novelStrategy.family !== 'custom' || novelStrategy.strategy !== 'open') {
  errors.push(`novel natural-language request expected custom/open, got ${novelStrategy.family}/${novelStrategy.strategy}`);
}
if (novelRules.referenceFiles.some((file) => file.includes('design-system/page-patterns/'))) errors.push('custom request must not force an existing page pattern');
for (const file of directorFiles) {
  if (!novelRules.contextFiles.includes(file)) errors.push(`custom request must load ${file}`);
}
for (const file of [...simpleRules.files, ...visualRules.files, ...componentRules.files, ...novelRules.files]) {
  if (!existsSync(resolve(process.cwd(), 'modules/yipex', file))) errors.push(`rule file does not exist: ${file}`);
}
const rulesIndex = JSON.parse(readFileSync(resolve(process.cwd(), 'modules/yipex/rules-index.json'), 'utf8'));
const templateRules = readFileSync(resolve(process.cwd(), 'modules/yipex/design-system/director-rules/02-template-application-rules.md'), 'utf8');
if (rulesIndex.presentationRouting.automaticThresholds.modalMax !== 6 || rulesIndex.presentationRouting.automaticThresholds.drawerMax !== 16) errors.push('machine carrier thresholds must stay 6/16');
for (const text of ['`1–6`', '`7–16`', '`>16`']) {
  if (!templateRules.includes(text)) errors.push(`director rule 02 is missing carrier threshold ${text}`);
}
if (simpleRules.presentationIntent !== 'design-system/director-rules/02-template-application-rules.md') errors.push('presentation intent must resolve to director rule 02');
if (!existsSync(resolve(process.cwd(), 'references/legacy/yipex-design-system-v0.4.md'))) errors.push('retired DESIGN.md snapshot is missing');
if (errors.length) {
  console.error(`yipex-capability-policy: fail\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`yipex-capability-policy: pass (${cases.length} routing cases)`);
