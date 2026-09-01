#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRendererScaffold, listRendererDefinitions } from './lib/yipex-renderer-registry.mjs';
import { renderStandardDashboardOverview } from './renderers/yipex-standard-dashboard-overview.mjs';
import { renderStandardQueryTable } from './renderers/yipex-standard-query-table.mjs';

const projectRoot = resolve(new URL('.', import.meta.url).pathname, '..');
const validator = resolve(projectRoot, 'scripts/validate-yipex-page-spec.mjs');
const bannedKeys = ['subtitle', 'description', 'pageDescription', 'intro'];
const errors = [];
const testDir = mkdtempSync(join(tmpdir(), 'yipex-page-header-copy-'));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createPageSpec({ rendererId, recipeId, skeleton, pageFamily, pageName, capabilities }) {
  const scaffold = createRendererScaffold(rendererId, { recipeId, capabilities });
  const generation = { mode: 'auto', strategy: 'standard', recipeId, skeleton, capabilities, rendererId };
  return {
    schemaVersion: 2,
    metadata: {
      changeId: '20990101-page-header-copy-test',
      pageName,
      pageType: pageFamily,
      componentLibrary: { name: 'antd', source: 'official' },
      ruleRefs: ['modules/yipex/design-system/director-rules/01-visual-constitution.md'],
      generation
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
      shell: { id: 'yipex-default', navigation: [{ id: 'home', label: '首页', icon: 'HomeOutlined', active: true }] },
      root: scaffold.root,
      data: scaffold.data,
      states: scaffold.states,
      interactions: scaffold.interactions,
      extensions: { renderer: rendererId, generation }
    }
  };
}

function validate(spec, name) {
  const file = resolve(testDir, `${name}.json`);
  writeFileSync(file, JSON.stringify(spec));
  return spawnSync(process.execPath, [validator, file], { cwd: projectRoot, encoding: 'utf8' });
}

function stripEmbeddedJson(html) {
  return html.replace(/<script[^>]*type=["']application\/json["'][^>]*>[\s\S]*?<\/script>/gi, '');
}

try {
  for (const renderer of listRendererDefinitions()) {
    const scaffold = createRendererScaffold(renderer.id, { capabilities: [] });
    for (const key of bannedKeys) {
      if (Object.hasOwn(scaffold.root?.props || {}, key)) errors.push(`${renderer.id} scaffold defines root.props.${key}`);
    }
  }

  const querySpec = createPageSpec({
    rendererId: 'yipex-standard-query-table-v1',
    recipeId: 'list.query-table',
    skeleton: 'query-workbench',
    pageFamily: 'list',
    pageName: '标题区文案测试',
    capabilities: ['query.basic', 'table.flat', 'table.pagination']
  });
  querySpec.page.root.children.push({ id: 'result-reason', type: 'result', props: { description: '必要的业务结果原因' } });
  const nestedResult = validate(querySpec, 'nested-result-description');
  if (nestedResult.status !== 0) errors.push(`nested business description should remain valid: ${nestedResult.stderr || nestedResult.stdout}`);

  for (const key of bannedKeys) {
    const invalid = clone(querySpec);
    invalid.page.root.props[key] = '不应出现的标题区描述';
    const result = validate(invalid, `root-${key}`);
    if (result.status === 0 || !`${result.stderr}${result.stdout}`.includes(`page.root.props.${key} is not allowed`)) errors.push(`validator did not reject page.root.props.${key}`);
  }

  const invalidHeader = clone(querySpec);
  invalidHeader.page.root.children.push({ id: 'page-header-copy', type: 'page-header', props: { description: '不应出现的标题区描述' } });
  const headerResult = validate(invalidHeader, 'page-header-description');
  if (headerResult.status === 0 || !`${headerResult.stderr}${headerResult.stdout}`.includes('.props.description is not allowed')) errors.push('validator did not reject page-header props.description');

  const forbiddenCopy = 'FORBIDDEN_PAGE_HEADER_COPY';
  const dashboardRenderSpec = createPageSpec({
    rendererId: 'yipex-standard-dashboard-overview-v1',
    recipeId: 'dashboard.overview',
    skeleton: 'dashboard-overview',
    pageFamily: 'dashboard',
    pageName: '经营概览',
    capabilities: ['dashboard.metrics', 'dashboard.trend', 'dashboard.distribution']
  });
  dashboardRenderSpec.page.root.props.subtitle = forbiddenCopy;
  const dashboardHtml = renderStandardDashboardOverview(dashboardRenderSpec, { projectRoot, specPath: resolve(testDir, 'dashboard-spec.json') });
  if (stripEmbeddedJson(dashboardHtml).includes(forbiddenCopy)) errors.push('dashboard renderer displays root subtitle when validation is bypassed');

  querySpec.page.root.props.subtitle = forbiddenCopy;
  const queryHtml = renderStandardQueryTable(querySpec, { projectRoot, specPath: resolve(testDir, 'query-spec.json') });
  if (stripEmbeddedJson(queryHtml).includes(forbiddenCopy)) errors.push('query renderer displays root subtitle when validation is bypassed');
} finally {
  rmSync(testDir, { recursive: true, force: true });
}

if (errors.length) {
  console.error(`yipex-page-header-copy: fail\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('yipex-page-header-copy: pass (scaffolds, validator, renderers)');
