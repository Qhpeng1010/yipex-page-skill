#!/usr/bin/env node
import {
  FORM_COMPONENT_ALLOWLIST,
  createYiPexFormRuntime,
  validateFormFieldDefinitions
} from './lib/yipex-form-runtime.mjs';

const runtime = createYiPexFormRuntime({ React: null, antd: {}, dayjs: null, supportedComponents: FORM_COMPONENT_ALLOWLIST });
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

const values = { enabled: true, region: 'GLOBAL', channel: 'SWIFT', count: 3, tags: ['A', 'B'] };
expect(runtime.evaluateCondition({ all: [{ field: 'enabled', operator: 'eq', value: true }, { any: [{ field: 'region', operator: 'eq', value: 'GLOBAL' }, { field: 'channel', operator: 'eq', value: 'SEPA' }] }] }, values), 'nested all/any condition should match');
expect(runtime.evaluateCondition({ field: 'tags', operator: 'contains', value: 'B' }, values), 'contains condition should match arrays');
expect(runtime.evaluateCondition({ not: { field: 'count', operator: 'lt', value: 2 } }, values), 'not condition should invert the nested result');

const optionSets = {
  citiesByCountry: {
    CN: [{ value: 'SHA', label: '上海' }, { value: 'SZX', label: '深圳' }],
    SG: [{ value: 'SIN', label: '新加坡' }]
  }
};
const fields = [
  { key: 'secret', label: '隐藏值', visibleWhen: { field: 'enabled', operator: 'eq', value: true } },
  { key: 'city', label: '城市', component: 'Select', optionsSource: { source: 'citiesByCountry', dependsOn: ['country'] } },
  { key: 'cities', label: '多个城市', component: 'Select', selectionMode: 'multiple', optionsSource: { source: 'citiesByCountry', dependsOn: ['country'] } },
  { key: 'customTags', label: '自定义标签', component: 'Select', selectionMode: 'tags', options: [] }
];
const reconciled = runtime.reconcileFields(fields, { enabled: false, secret: 'old', country: 'CN', city: 'SIN', cities: ['SHA', 'SIN'], customTags: ['new'] }, optionSets);
expect(reconciled.values.secret === undefined, 'hidden field value should be cleared');
expect(reconciled.values.city === undefined, 'invalid single-select value should be cleared');
expect(JSON.stringify(reconciled.values.cities) === JSON.stringify(['SHA']), 'invalid multi-select values should be removed');
expect(JSON.stringify(reconciled.values.customTags) === JSON.stringify(['new']), 'tags mode should preserve custom values');

const conditional = runtime.resolveFieldState({ key: 'reason', requiredWhen: { field: 'enabled', operator: 'eq', value: true }, disabledWhen: { field: 'count', operator: 'gte', value: 3 } }, values);
expect(conditional.required === true && conditional.disabled === true, 'conditional required and disabled state should resolve');

const invalidFields = validateFormFieldDefinitions([
  { key: 'unsafe', label: '不安全组件', component: 'Script', props: { onClick: 'run' }, disablePast: 'yes' }
]);
expect(invalidFields.some((item) => item.includes('component is not allowed')), 'component allowlist should reject unknown components');
expect(invalidFields.some((item) => item.includes('props.onClick is not allowed')), 'props should reject event handlers');
expect(invalidFields.some((item) => item.includes('disablePast must be boolean')), 'disablePast should require a boolean');

const today = {
  startOf: () => ({ isBefore: () => false })
};
const dateRuntime = createYiPexFormRuntime({ React: null, antd: {}, dayjs: () => today, supportedComponents: FORM_COMPONENT_ALLOWLIST });
const dateRules = dateRuntime.buildRules({ key: 'effectiveDate', label: '生效日期', component: 'DatePicker', disablePast: true }, { required: false });
expect(dateRules.some((rule) => typeof rule.validator === 'function'), 'disablePast should add a DatePicker validator');

if (errors.length) {
  console.error(`yipex-form-runtime: fail\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`yipex-form-runtime: pass (${FORM_COMPONENT_ALLOWLIST.length} components)`);
