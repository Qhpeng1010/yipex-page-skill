export const FORM_COMPONENT_ALLOWLIST = Object.freeze([
  'Input',
  'Input.TextArea',
  'Input.Password',
  'Input.Search',
  'InputNumber',
  'Select',
  'Cascader',
  'Checkbox',
  'Checkbox.Group',
  'Switch',
  'TreeSelect',
  'Upload',
  'DatePicker',
  'DatePicker.RangePicker',
  'TimePicker',
  'TimePicker.RangePicker',
  'Radio.Group',
  'AutoComplete',
  'Mentions',
  'Rate',
  'Slider',
  'Transfer',
  'ColorPicker',
  'Segmented'
]);

export const FORM_CONDITION_OPERATORS = Object.freeze([
  'eq', 'neq', 'in', 'notIn', 'contains', 'notContains',
  'empty', 'notEmpty', 'gt', 'gte', 'lt', 'lte'
]);

const BLOCKED_PROP_NAMES = new Set(['children', 'dangerouslySetInnerHTML']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateCondition(condition, label, errors) {
  if (condition == null || typeof condition === 'boolean') return;
  if (Array.isArray(condition)) {
    condition.forEach((item, index) => validateCondition(item, `${label}[${index}]`, errors));
    return;
  }
  if (!isPlainObject(condition)) {
    errors.push(`${label} must be a condition object`);
    return;
  }
  const groups = ['all', 'any'].filter((key) => condition[key] !== undefined);
  if (condition.not !== undefined) validateCondition(condition.not, `${label}.not`, errors);
  for (const key of groups) {
    if (!Array.isArray(condition[key]) || condition[key].length === 0) errors.push(`${label}.${key} must be a non-empty array`);
    else condition[key].forEach((item, index) => validateCondition(item, `${label}.${key}[${index}]`, errors));
  }
  if (groups.length || condition.not !== undefined) return;
  if (typeof condition.field !== 'string' || !condition.field.trim()) errors.push(`${label}.field is required`);
  const operator = condition.operator || condition.op || 'eq';
  if (!FORM_CONDITION_OPERATORS.includes(operator)) errors.push(`${label}.operator is not supported: ${operator}`);
}

export function validateFormFieldDefinitions(fields, { scope = 'form fields' } = {}) {
  const errors = [];
  const keys = new Set();
  for (const [index, field] of (fields || []).entries()) {
    const label = `${scope}[${index}]`;
    if (!isPlainObject(field)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (typeof field.key !== 'string' || !field.key.trim()) errors.push(`${label}.key is required`);
    else if (keys.has(field.key)) errors.push(`${scope} contains duplicate key: ${field.key}`);
    else keys.add(field.key);
    if (field.component !== undefined && !FORM_COMPONENT_ALLOWLIST.includes(field.component)) {
      errors.push(`${label}.component is not allowed: ${field.component}`);
    }
    if (field.props !== undefined && !isPlainObject(field.props)) errors.push(`${label}.props must be an object`);
    for (const key of Object.keys(field.props || {})) {
      if (/^on[A-Z]/.test(key) || BLOCKED_PROP_NAMES.has(key)) errors.push(`${label}.props.${key} is not allowed`);
    }
    for (const conditionKey of ['visibleWhen', 'disabledWhen', 'requiredWhen']) {
      if (field[conditionKey] !== undefined) validateCondition(field[conditionKey], `${label}.${conditionKey}`, errors);
    }
    if (field.selectionMode !== undefined && !['multiple', 'tags'].includes(field.selectionMode)) errors.push(`${label}.selectionMode must be multiple or tags`);
    if (field.minSelected !== undefined && (!Number.isInteger(field.minSelected) || field.minSelected < 0)) errors.push(`${label}.minSelected must be a non-negative integer`);
    if (field.maxSelected !== undefined && (!Number.isInteger(field.maxSelected) || field.maxSelected < 1)) errors.push(`${label}.maxSelected must be a positive integer`);
    if (Number.isInteger(field.minSelected) && Number.isInteger(field.maxSelected) && field.minSelected > field.maxSelected) errors.push(`${label}.minSelected must not exceed maxSelected`);
    for (const booleanKey of ['clearWhenHidden', 'preserveWhenHidden', 'allowCustomValue', 'disablePast']) {
      if (field[booleanKey] !== undefined && typeof field[booleanKey] !== 'boolean') errors.push(`${label}.${booleanKey} must be boolean`);
    }
    if (field.optionsSource !== undefined && typeof field.optionsSource !== 'string' && !isPlainObject(field.optionsSource)) {
      errors.push(`${label}.optionsSource must be a string or object`);
    } else if (isPlainObject(field.optionsSource)) {
      if (typeof field.optionsSource.source !== 'string' || !field.optionsSource.source.trim()) errors.push(`${label}.optionsSource.source is required`);
      if (field.optionsSource.dependsOn !== undefined && (!Array.isArray(field.optionsSource.dependsOn) || field.optionsSource.dependsOn.some((item) => typeof item !== 'string' || !item.trim()))) errors.push(`${label}.optionsSource.dependsOn must be an array of field paths`);
      if (field.optionsSource.fallback !== undefined && !Array.isArray(field.optionsSource.fallback)) errors.push(`${label}.optionsSource.fallback must be an array`);
    }
  }
  return errors;
}

export function createYiPexFormRuntime({ React, antd, dayjs, supportedComponents }) {
  const h = React?.createElement;
  const allowedComponents = new Set(supportedComponents || []);
  const blockedPropNames = new Set(['children', 'dangerouslySetInnerHTML']);
  const optionComponents = new Set(['Select', 'Cascader', 'Checkbox.Group', 'Radio.Group', 'TreeSelect', 'AutoComplete', 'Transfer', 'Segmented']);

  const legacyComponents = {
    input: 'Input', textarea: 'Input.TextArea', password: 'Input.Password', number: 'InputNumber', amount: 'InputNumber',
    select: 'Select', cascader: 'Cascader', checkbox: 'Checkbox', 'checkbox-group': 'Checkbox.Group', switch: 'Switch',
    'tree-select': 'TreeSelect', upload: 'Upload', date: 'DatePicker', 'date-time': 'DatePicker',
    'date-range': 'DatePicker.RangePicker', 'date-time-range': 'DatePicker.RangePicker', time: 'TimePicker',
    'time-range': 'TimePicker.RangePicker', radio: 'Radio.Group', 'radio-group': 'Radio.Group', autocomplete: 'AutoComplete',
    mentions: 'Mentions', rate: 'Rate', slider: 'Slider', transfer: 'Transfer', color: 'ColorPicker', segmented: 'Segmented'
  };

  function getByPath(source, path) {
    return String(path || '').split('.').filter(Boolean).reduce((value, key) => value == null ? undefined : value[key], source);
  }

  function isEmpty(value) {
    return value == null || value === '' || (Array.isArray(value) && value.length === 0);
  }

  function includesValue(source, expected) {
    if (Array.isArray(source)) return source.includes(expected);
    if (typeof source === 'string') return source.includes(String(expected));
    return false;
  }

  function evaluateCondition(condition, values = {}) {
    if (condition == null) return true;
    if (typeof condition === 'boolean') return condition;
    if (Array.isArray(condition)) return condition.every((item) => evaluateCondition(item, values));
    if (typeof condition !== 'object') return false;
    if (Array.isArray(condition.all)) return condition.all.every((item) => evaluateCondition(item, values));
    if (Array.isArray(condition.any)) return condition.any.some((item) => evaluateCondition(item, values));
    if (condition.not !== undefined) return !evaluateCondition(condition.not, values);
    const actual = getByPath(values, condition.field);
    const expected = condition.value;
    switch (condition.operator || condition.op || 'eq') {
      case 'eq': return actual === expected;
      case 'neq': return actual !== expected;
      case 'in': return Array.isArray(expected) && expected.includes(actual);
      case 'notIn': return !Array.isArray(expected) || !expected.includes(actual);
      case 'contains': return includesValue(actual, expected);
      case 'notContains': return !includesValue(actual, expected);
      case 'empty': return isEmpty(actual);
      case 'notEmpty': return !isEmpty(actual);
      case 'gt': return Number(actual) > Number(expected);
      case 'gte': return Number(actual) >= Number(expected);
      case 'lt': return Number(actual) < Number(expected);
      case 'lte': return Number(actual) <= Number(expected);
      default: return false;
    }
  }

  function componentName(field = {}) {
    const name = field.component || legacyComponents[field.type || 'input'] || 'Input';
    return allowedComponents.has(name) ? name : 'Input';
  }

  function componentAtPath(name) {
    return name.split('.').reduce((value, key) => value?.[key], antd);
  }

  function safeProps(props = {}) {
    return Object.fromEntries(Object.entries(props).filter(([key, value]) => {
      if (/^on[A-Z]/.test(key) || blockedPropNames.has(key)) return false;
      return typeof value !== 'function';
    }));
  }

  function optionsFromSource(field, values = {}, optionSets = {}) {
    const definition = field.optionsSource;
    if (!definition) return Array.isArray(field.options) ? field.options : [];
    const sourceName = typeof definition === 'string' ? definition : definition.source;
    let result = optionSets?.[sourceName];
    const dependencies = typeof definition === 'object' && Array.isArray(definition.dependsOn) ? definition.dependsOn : [];
    for (const dependency of dependencies) {
      const key = getByPath(values, dependency);
      if (key == null || key === '') { result = []; break; }
      result = result?.[key];
    }
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.options)) return result.options;
    const fallback = typeof definition === 'object' ? definition.fallback : undefined;
    return Array.isArray(fallback) ? fallback : (Array.isArray(field.options) ? field.options : []);
  }

  function resolveFieldState(field, values = {}, optionSets = {}) {
    const visible = field.visibleWhen === undefined ? field.hidden !== true : evaluateCondition(field.visibleWhen, values);
    const disabled = Boolean(field.disabled || (field.disabledWhen !== undefined && evaluateCondition(field.disabledWhen, values)));
    const required = Boolean(field.required || (field.requiredWhen !== undefined && evaluateCondition(field.requiredWhen, values)));
    return { visible, disabled, required, options: optionsFromSource(field, values, optionSets) };
  }

  function collectOptionValues(options, target = new Set()) {
    for (const option of options || []) {
      if (option?.value !== undefined) target.add(option.value);
      if (Array.isArray(option?.children)) collectOptionValues(option.children, target);
    }
    return target;
  }

  function validCascaderPath(value, options) {
    if (!Array.isArray(value) || !value.length) return false;
    let current = options || [];
    for (const segment of value) {
      const option = current.find((item) => item?.value === segment);
      if (!option) return false;
      current = option.children || [];
    }
    return true;
  }

  function sameValue(left, right) {
    if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((item, index) => item === right[index]);
    return left === right;
  }

  function reconcileFields(fields, values = {}, optionSets = {}) {
    const next = { ...values };
    const changedKeys = new Set();
    for (let pass = 0; pass <= (fields || []).length; pass += 1) {
      let changed = false;
      for (const field of fields || []) {
        const state = resolveFieldState(field, next, optionSets);
        const current = next[field.key];
        if (!state.visible && field.clearWhenHidden !== false && field.preserveWhenHidden !== true && !isEmpty(current)) {
          next[field.key] = undefined; changedKeys.add(field.key); changed = true; continue;
        }
        const name = componentName(field);
        if (!state.visible || !optionComponents.has(name) || isEmpty(current)) continue;
        const mode = field.selectionMode || field.props?.mode;
        if (name === 'Select' && (mode === 'tags' || field.allowCustomValue === true)) continue;
        let reconciled = current;
        if (name === 'Cascader') {
          const multiple = field.props?.multiple === true;
          reconciled = multiple && Array.isArray(current)
            ? current.filter((path) => validCascaderPath(path, state.options))
            : validCascaderPath(current, state.options) ? current : undefined;
        }
        else {
          const allowed = collectOptionValues(state.options);
          if (Array.isArray(current)) reconciled = current.filter((item) => allowed.has(item));
          else if (!allowed.has(current)) reconciled = undefined;
        }
        if (!sameValue(current, reconciled)) {
          next[field.key] = reconciled; changedKeys.add(field.key); changed = true;
        }
      }
      if (!changed) break;
    }
    return {
      values: next,
      changedKeys: [...changedKeys],
      patch: Object.fromEntries([...changedKeys].map((key) => [key, next[key]]))
    };
  }

  function fieldValueProps(field) {
    const name = componentName(field);
    if (name === 'Switch' || name === 'Checkbox') return { valuePropName: 'checked' };
    if (name === 'Upload') return { valuePropName: 'fileList', getValueFromEvent: (event) => Array.isArray(event) ? event : event?.fileList || [] };
    if (name === 'Transfer') return { valuePropName: 'targetKeys' };
    return { valuePropName: 'value' };
  }

  function buildRules(field, state) {
    const rules = [];
    const choose = ['Select', 'Cascader', 'Checkbox.Group', 'TreeSelect', 'Upload', 'DatePicker', 'DatePicker.RangePicker', 'TimePicker', 'TimePicker.RangePicker'].includes(componentName(field));
    if (state.required) rules.push({ required: true, message: field.requiredMessage || ((choose ? '请选择' : '请输入') + field.label) });
    const mode = field.selectionMode || field.props?.mode;
    if (field.minSelected !== undefined) rules.push({ type: 'array', min: Number(field.minSelected), message: field.minSelectedMessage || ('请至少选择 ' + field.minSelected + ' 项') });
    if (field.maxSelected !== undefined) rules.push({ type: 'array', max: Number(field.maxSelected), message: field.maxSelectedMessage || ('最多选择 ' + field.maxSelected + ' 项') });
    if (field.min !== undefined && componentName(field) !== 'InputNumber' && mode !== 'multiple' && mode !== 'tags') rules.push({ min: Number(field.min), message: field.minMessage || (field.label + '至少为 ' + field.min + ' 个字符') });
    if (field.maxLength !== undefined) rules.push({ max: Number(field.maxLength), message: field.maxLengthMessage || (field.label + '不能超过 ' + field.maxLength + ' 个字符') });
    if (field.pattern) {
      try { rules.push({ pattern: new RegExp(field.pattern), message: field.patternMessage || (field.label + '格式不正确'), validateTrigger: 'onBlur' }); } catch (_) {}
    }
    const validation = field.validation || {};
    if (componentName(field) === 'InputNumber' && validation.min !== undefined) rules.push({ type: 'number', min: Number(validation.min), message: validation.minMessage || (field.label + '不能小于 ' + validation.min) });
    if (componentName(field) === 'InputNumber' && validation.max !== undefined) rules.push({ type: 'number', max: Number(validation.max), message: validation.maxMessage || (field.label + '不能大于 ' + validation.max) });
    if (componentName(field) === 'DatePicker' && field.disablePast === true) {
      rules.push({
        validator: (_, value) => !value || !dayjs || !value.startOf('day').isBefore(dayjs().startOf('day'))
          ? Promise.resolve()
          : Promise.reject(new Error(field.disablePastMessage || (field.label + '不能早于当天')))
      });
    }
    return rules;
  }

  function commonProps(field, state) {
    const props = { ...safeProps(field.props || {}), disabled: state.disabled };
    for (const key of ['placeholder', 'allowClear', 'showSearch', 'maxLength', 'min', 'max', 'precision', 'prefix', 'suffix', 'rows', 'format', 'accept', 'listType', 'maxCount']) {
      if (field[key] !== undefined && props[key] === undefined) props[key] = field[key];
    }
    if (props.style === undefined && ['InputNumber', 'Select', 'Cascader', 'TreeSelect', 'DatePicker', 'DatePicker.RangePicker', 'TimePicker', 'TimePicker.RangePicker', 'AutoComplete', 'Mentions'].includes(componentName(field))) props.style = { width: '100%' };
    return props;
  }

  function renderControl(field, values = {}, optionSets = {}, state = resolveFieldState(field, values, optionSets)) {
    if (!h) throw new Error('React.createElement is required to render form controls');
    const name = componentName(field);
    const Component = componentAtPath(name);
    if (!Component) throw new Error('Ant Design component is unavailable: ' + name);
    const props = commonProps(field, state);
    if (field.selectionMode && name === 'Select') props.mode = field.selectionMode;
    if (field.searchable !== undefined && props.showSearch === undefined) props.showSearch = Boolean(field.searchable);
    if (props.placeholder === undefined && ['Select', 'Cascader', 'TreeSelect', 'DatePicker', 'DatePicker.RangePicker', 'TimePicker', 'TimePicker.RangePicker'].includes(name)) props.placeholder = name.endsWith('RangePicker') ? ['开始时间', '结束时间'] : '请选择';
    if (props.placeholder === undefined && ['Input', 'Input.TextArea', 'Input.Password', 'Input.Search', 'InputNumber', 'AutoComplete', 'Mentions'].includes(name)) props.placeholder = '请输入';
    if (props.showSearch && name === 'Select' && props.optionFilterProp === undefined) props.optionFilterProp = 'label';
    if (name === 'Switch') {
      if (props.checkedChildren === undefined) props.checkedChildren = field.checkedLabel || '开启';
      if (props.unCheckedChildren === undefined) props.unCheckedChildren = field.uncheckedLabel || '关闭';
    }
    if (name === 'DatePicker' && field.type === 'date-time') props.showTime = field.showTime || true;
    if (name === 'DatePicker.RangePicker' && field.type === 'date-time-range') props.showTime = field.showTime || true;
    if (name === 'DatePicker' && field.disablePast === true && dayjs) props.disabledDate = (current) => Boolean(current && current.startOf('day').isBefore(dayjs().startOf('day')));
    if (name === 'Upload') {
      if (props.beforeUpload === undefined) props.beforeUpload = () => false;
      const trigger = props.listType === 'picture-card'
        ? h('div', { className: 'standard-upload-trigger' }, [h('span', { key: 'icon', className: 'standard-upload-plus', 'aria-hidden': true }, '+'), h('span', { key: 'label' }, field.uploadLabel || '上传文件')])
        : h(antd.Button, { disabled: state.disabled }, field.uploadLabel || '选择文件');
      return h(Component, props, trigger);
    }
    if (name === 'Checkbox') return h(Component, props, field.checkboxLabel || field.optionLabel || field.label);
    if (name === 'Radio.Group' && state.options.some((option) => option?.description)) {
      return h(Component, props, h('div', { className: 'standard-create-radio-list' }, state.options.map((option) => h(antd.Radio, { key: option.value, value: option.value, className: 'standard-create-radio-option' }, h('span', { className: 'standard-create-radio-copy' }, [h('strong', { key: 'label' }, option.label), option.description ? h('small', { key: 'description' }, option.description) : null])))));
    }
    if (optionComponents.has(name)) {
      if (name === 'TreeSelect') props.treeData = state.options;
      else if (name === 'Transfer') props.dataSource = state.options;
      else props.options = state.options;
    }
    return h(Component, props);
  }

  function toFormValues(fields, values = {}) {
    const normalized = { ...values };
    for (const field of fields || []) {
      const value = normalized[field.key];
      if (isEmpty(value)) continue;
      const name = componentName(field);
      if (['DatePicker', 'TimePicker'].includes(name) && !value?.format && dayjs) normalized[field.key] = dayjs(value);
      if (['DatePicker.RangePicker', 'TimePicker.RangePicker'].includes(name) && Array.isArray(value) && dayjs) normalized[field.key] = value.map((item) => item?.format ? item : dayjs(item));
      if (name === 'Upload' && !Array.isArray(value)) {
        const text = String(value);
        normalized[field.key] = [{ uid: 'persisted-' + text, name: text.split('/').pop() || text, status: 'done', ...(text.startsWith('http') || text.startsWith('data:') ? { url: text } : {}) }];
      }
    }
    return normalized;
  }

  function serializeValues(fields, values = {}) {
    const normalized = { ...values };
    for (const field of fields || []) {
      const value = normalized[field.key];
      if (value?.format) normalized[field.key] = value.format(field.format || (field.type?.includes('time') ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'));
      else if (Array.isArray(value) && value.some((item) => item?.format)) normalized[field.key] = value.map((item) => item?.format ? item.format(field.format || (field.type?.includes('time') ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD')) : item);
      else if (componentName(field) === 'Upload' && Array.isArray(value)) {
        const files = value.map((file) => file?.url || file?.name || file).filter(Boolean);
        normalized[field.key] = Number(field.maxCount ?? field.props?.maxCount ?? 1) === 1 ? files[0] : files;
      }
    }
    return normalized;
  }

  function displayValue(field, value, values = {}, optionSets = {}) {
    if (isEmpty(value)) return '-';
    const state = resolveFieldState(field, values, optionSets);
    const labels = new Map();
    const collect = (options) => (options || []).forEach((option) => { labels.set(option.value, option.label ?? option.title ?? option.value); collect(option.children); });
    collect(state.options);
    if (Array.isArray(value)) {
      if (value.some((item) => item?.format)) return value.map((item) => item?.format ? item.format(field.format || 'YYYY-MM-DD') : item).join(' 至 ');
      return value.map((item) => labels.get(item) ?? item?.name ?? item).join('、');
    }
    if (value?.format) return value.format(field.format || 'YYYY-MM-DD');
    if (typeof value === 'boolean') return value ? (field.checkedLabel || '是') : (field.uncheckedLabel || '否');
    return String(labels.get(value) ?? value);
  }

  return {
    buildRules, componentName, displayValue, evaluateCondition, fieldValueProps,
    isEmpty, reconcileFields, renderControl, resolveFieldState, serializeValues, toFormValues
  };
}

export function formRuntimeBootstrapSource(variableName = 'formRuntime') {
  return `const ${variableName} = (${createYiPexFormRuntime.toString()})({ React, antd, dayjs, supportedComponents: ${JSON.stringify(FORM_COMPONENT_ALLOWLIST)} });`;
}
