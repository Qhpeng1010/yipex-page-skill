#!/usr/bin/env node
import { resolve } from 'node:path';
import { renderStandardGroupedForm } from './renderers/yipex-standard-grouped-form.mjs';
import { renderStandardSteppedForm } from './renderers/yipex-standard-stepped-form.mjs';
import { renderStandardQueryTable } from './renderers/yipex-standard-query-table.mjs';

const projectRoot = resolve(new URL('.', import.meta.url).pathname, '..');
const context = { projectRoot, specPath: resolve(projectRoot, 'changes/20990101-form-runtime-test/page-spec.json') };
const errors = [];
const shell = { id: 'yipex-default', navigation: [] };
const contract = { pageFamily: 'form' };
const fields = [
  { key: 'enabled', label: '启用', component: 'Switch' },
  { key: 'countries', label: '国家', component: 'Select', selectionMode: 'multiple', options: [{ value: 'CN', label: '中国' }] },
  { key: 'city', label: '城市', component: 'Cascader', visibleWhen: { field: 'enabled', operator: 'eq', value: true }, options: [{ value: 'CN', label: '中国', children: [{ value: 'SHA', label: '上海' }] }] },
  { key: 'permissions', label: '权限', component: 'TreeSelect', requiredWhen: { field: 'enabled', operator: 'eq', value: true }, options: [{ value: 'ADMIN', title: '管理员' }] },
  { key: 'files', label: '附件', component: 'Upload', props: { maxCount: 2 } },
  { key: 'effectiveDate', label: '生效日期', component: 'DatePicker', disablePast: true }
];

function baseSpec(pageName, pageFamily, data, rootType) {
  return {
    schemaVersion: 2,
    metadata: { changeId: '20990101-form-runtime-test', pageName, pageType: pageFamily, componentLibrary: { name: 'antd', source: 'official' }, generation: { capabilities: [] } },
    contract: { ...contract, pageFamily },
    page: { shell, root: { id: 'page-root', type: rootType, props: { title: pageName } }, data, states: {}, interactions: [], extensions: {} }
  };
}

const specs = [
  ['grouped', renderStandardGroupedForm, baseSpec('高级分组表单', 'form', { sections: [{ id: 'advanced', title: '高级字段', fields }], optionSets: {} }, 'form')],
  ['stepped', renderStandardSteppedForm, baseSpec('高级分步表单', 'form', { steps: [{ id: 'advanced', title: '高级字段', fields }], optionSets: {} }, 'steps-form')],
  ['modal', renderStandardQueryTable, (() => {
    const spec = baseSpec('高级弹窗表单', 'list', { records: [], columns: [{ key: 'id', label: '编号' }, { key: 'status', label: '状态', format: 'status-tag' }], detailFields: [{ key: 'id', label: '编号' }, { key: 'status', label: '状态', format: 'status-tag' }], detailSections: [{ id: 'basic', title: '基本信息', fieldKeys: ['id'] }, { id: 'status', title: '状态信息', fieldKeys: ['status'] }], filters: [], createFields: fields, createPlacement: 'page-header', preserveStructure: true, createOverlay: 'auto', optionSets: {} }, 'query-form');
    spec.metadata.generation.capabilities = ['query.basic', 'table.flat', 'table.pagination', 'form.overlay', 'form.advancedFields', 'form.dependencies', 'form.preserveStructure'];
    return spec;
  })()]
];

for (const [name, render, spec] of specs) {
  const html = render(spec, context);
  if (!html.includes('createYiPexFormRuntime')) errors.push(`${name} renderer does not embed the shared form runtime`);
  const scripts = [...html.matchAll(/<script(?![^>]*type=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [index, match] of scripts.entries()) {
    try { new Function(match[1]); } catch (error) { errors.push(`${name} inline script ${index + 1} is invalid: ${error.message}`); }
  }
  if (name === 'modal' && (!html.includes('yipex-preserve-structure') || !html.includes('max-height:min(70vh,720px)'))) errors.push('preserveStructure Modal contract is missing');
  if (name === 'modal' && (!html.includes("column.format === 'status-tag'") || !html.includes('standard-detail-sections') || !html.includes("source.createPlacement === 'page-header'"))) errors.push('query renderer declarative Tag, detail sections, or page header action support is missing');
  if (!html.includes('field.disablePast === true')) errors.push(`${name} renderer does not embed disablePast support`);
}

if (errors.length) {
  console.error(`yipex-form-renderers: fail\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('yipex-form-renderers: pass (grouped, stepped, preserved Modal)');
