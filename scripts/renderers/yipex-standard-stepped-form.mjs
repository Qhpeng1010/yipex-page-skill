import { readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { deriveStandardBreadcrumb, standardBreadcrumbCss } from './yipex-standard-breadcrumb.mjs';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function renderNavigation(items) {
  return (items || []).map((item) => `<a class="yipex-shell-nav-item${item.active ? ' active' : ''}" data-antd-component="Menu.Item" data-menu-key="${escape(item.id)}" href="#${escape(item.id)}" title="${escape(item.label || item.id)}" ${item.active ? 'aria-current="page"' : ''}><span class="nav-icon anticon" data-antd-icon="${escape(item.icon || 'AppstoreOutlined')}" aria-hidden="true"></span><span>${escape(item.label || item.id)}</span></a>`).join('');
}

export function renderStandardSteppedForm(pageSpec, { projectRoot, specPath }) {
  const { metadata, page } = pageSpec;
  const root = page.root || {};
  const data = page.data || {};
  const shellDir = resolve(projectRoot, 'modules/yipex/shell');
  const template = readFileSync(resolve(shellDir, 'shell.template.html'), 'utf8');
  const shellCss = readFileSync(resolve(shellDir, 'shell.css'), 'utf8');
  const shellRuntime = readFileSync(resolve(shellDir, 'shell-runtime.js'), 'utf8');
  const logo = readFileSync(resolve(shellDir, 'logo.svg')).toString('base64');
  const vendorPath = (file) => relative(dirname(specPath), resolve(shellDir, 'vendor', file)).split(sep).join('/');
  const shell = page.shell || {};
  const header = shell.header || {};
  const brand = shell.brand || {};
  const footer = shell.footer || {};
  const props = root.props || {};
  const steppedFormWidth = Math.max(320, Math.min(Number(data.formWidth) || 640, 1200));
  const breadcrumb = deriveStandardBreadcrumb(shell, metadata.pageName, data.entryHref || '');
  const embedded = JSON.stringify({ pageName: metadata.pageName, breadcrumb, props, data, initialState: page.states || {} }).replace(/</g, '\\u003c');
  const values = { brandMark: brand.mark || 'Y', brandLogo: logo, brandName: brand.name || 'Yipex', welcome: header.welcome || '欢迎回来', userName: header.userName || '用户', email: header.email || 'user@yipex.tech', avatar: header.avatar || (header.userName || '用').slice(0, 1), copyright: footer.copyright || 'Copyright Somei E-Commerce Limited 2025. All rights reserved', navigation: renderNavigation(shell.navigation), content: '<div id="yipex-standard-stepped-form-app" data-component="standard-stepped-form"></div>' };
  const body = Object.entries(values).reduce((source, [key, value]) => source.replaceAll(`{{${key}}}`, value), template);
  const appScript = `
(() => {
  const h = React.createElement;
  const { ConfigProvider, Breadcrumb, Card, Form, Input, InputNumber, Select, DatePicker, Switch, Button, Descriptions, Result, Steps, Upload, Modal, message } = antd;
  const payload = JSON.parse(document.getElementById('yipex-standard-stepped-form-data').textContent);
  const source = payload.data || {}; const props = payload.props || {}; const initial = payload.initialState || {}; const steps = Array.isArray(source.steps) ? source.steps : [];
  const safe = (value) => String(value == null ? '' : value);
  const allFields = steps.flatMap((item) => item.fields || []);
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || source.mode || 'create';
  const createConfig = source.create || {};
  const idField = createConfig.idField || source.idField || 'id';
  const recordId = urlParams.get(source.recordIdParam || 'id');
  const baseRecords = Array.isArray(source.records) ? source.records : [];
  let storedRecords = [];
  if (source.persistenceKey) {
    try { const saved = JSON.parse(window.localStorage.getItem(source.persistenceKey) || '[]'); storedRecords = Array.isArray(saved) ? saved : []; } catch (_) { storedRecords = []; }
  }
  const editingRecord = mode === 'edit' && recordId ? (() => {
    const base = baseRecords.find((item) => safe(item[idField]) === safe(recordId));
    const saved = storedRecords.find((item) => safe(item[idField]) === safe(recordId));
    const savedOverlay = Object.fromEntries(Object.entries(saved || {}).filter(([, value]) => value != null && value !== '' && (!Array.isArray(value) || value.length > 0)));
    return base || saved ? { ...(base || {}), ...savedOverlay } : null;
  })() : null;
  const toUploadValue = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    const text = safe(value);
    return [{ uid: 'persisted-' + text, name: text.split('/').pop() || text, status: 'done', ...(text.startsWith('http') || text.startsWith('data:') ? { url: text } : {}) }];
  };
  const toFormValues = (values) => {
    const normalized = { ...(values || {}) };
    for (const field of allFields) {
      let value = normalized[field.key];
      if ((field.type === 'date-range' || field.type === 'date-time-range') && !value && (field.startKey || field.endKey)) {
        value = [normalized[field.startKey], normalized[field.endKey]].filter((item) => item != null && item !== '');
        if (value.length) normalized[field.key] = value;
      }
      if (value == null || value === '') continue;
      if ((field.type === 'date' || field.type === 'date-time') && !value?.format) normalized[field.key] = dayjs(value);
      if ((field.type === 'date-range' || field.type === 'date-time-range') && Array.isArray(value)) normalized[field.key] = value.map((item) => item?.format ? item : dayjs(item));
      if (field.type === 'upload') normalized[field.key] = toUploadValue(value);
    }
    return normalized;
  };
  const formInitialValues = toFormValues({ ...(source.initialValues || {}), ...(editingRecord || {}) });
  function UploadField({ value, onChange, field }) {
    const fileList = Array.isArray(value) ? value : toUploadValue(value);
    return h(Upload, {
      accept: field.accept || 'image/*',
      listType: field.listType || 'picture-card',
      maxCount: Number(field.maxCount || 1),
      fileList,
      beforeUpload: () => false,
      onChange: (info) => onChange?.(info.fileList.slice(-Number(field.maxCount || 1)))
    }, fileList.length >= Number(field.maxCount || 1) ? null : h('div', { className: 'standard-upload-trigger' }, [h('span', { key: 'icon', className: 'standard-upload-plus', 'aria-hidden': true }, '+'), h('span', { key: 'label' }, field.uploadLabel || '上传图片')]));
  }
  function control(field) {
    if (field.type === 'select') return h(Select, { allowClear: true, placeholder: field.placeholder || '请选择', options: (field.options || []).map((option) => ({ label: option.label, value: option.value })) });
    if (field.type === 'number' || field.type === 'amount') return h(InputNumber, { style: { width: '100%' }, min: field.min, max: field.max, precision: field.precision, prefix: field.prefix, suffix: field.suffix, placeholder: field.placeholder || '请输入' });
    if (field.type === 'date-range' || field.type === 'date-time-range') return h(DatePicker.RangePicker, { showTime: field.type === 'date-time-range', format: field.format || (field.type === 'date-time-range' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'), style: { width: '100%' }, placeholder: field.placeholder || ['开始时间', '结束时间'] });
    if (field.type === 'date' || field.type === 'date-time') return h(DatePicker, { showTime: field.type === 'date-time', format: field.format || (field.type === 'date-time' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'), style: { width: '100%' }, placeholder: field.placeholder || '请选择' });
    if (field.type === 'upload') return h(UploadField, { field });
    if (field.type === 'switch') return h(Switch, { checkedChildren: field.checkedLabel || '开启', unCheckedChildren: field.uncheckedLabel || '关闭' });
    if (field.type === 'textarea') return h(Input.TextArea, { rows: field.rows || 4, maxLength: field.maxLength, showCount: Boolean(field.maxLength), placeholder: field.placeholder || '请输入' });
    return h(Input, { allowClear: true, maxLength: field.maxLength, placeholder: field.placeholder || '请输入' });
  }
  function displayValue(field, value) {
    if (value === undefined || value === null || value === '') return '-';
    if (field.type === 'select') return (field.options || []).find((option) => option.value === value)?.label || String(value);
    if (field.type === 'switch') return value ? (field.checkedLabel || '是') : (field.uncheckedLabel || '否');
    if (field.type === 'upload') return Array.isArray(value) ? (value[0]?.name || value[0]?.url || '-') : String(value);
    if ((field.type === 'date-range' || field.type === 'date-time-range') && Array.isArray(value)) return value.map((item) => item?.format ? item.format(field.format || (field.type === 'date-time-range' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD')) : safe(item)).join(' 至 ');
    if ((field.type === 'date' || field.type === 'date-time') && value?.format) return value.format(field.format || (field.type === 'date-time' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'));
    return String(value);
  }
  function App() {
    const [form] = Form.useForm(); const [current, setCurrent] = React.useState(Number(initial.step || 0)); const [submitting, setSubmitting] = React.useState(false);
    const [drafting, setDrafting] = React.useState(false); const [previewOpen, setPreviewOpen] = React.useState(false); const [draftRecordId, setDraftRecordId] = React.useState(editingRecord?.[idField] || null);
    const step = steps[current] || {}; const fields = step.fields || []; const requestedColumns = [1, 2, 3].includes(Number(step.columns)) ? Number(step.columns) : 1;
    const validateCurrent = async () => { try { await form.validateFields(fields.filter((field) => field.required).map((field) => field.key)); return true; } catch { return false; } };
    const next = async () => { if (await validateCurrent()) setCurrent((value) => Math.min(value + 1, steps.length - 1)); };
    const previous = () => setCurrent((value) => Math.max(value - 1, 0));
    const isEmpty = (value) => value == null || value === '' || (Array.isArray(value) && value.length === 0);
    const normalizeSubmissionValues = (values, { draft = false } = {}) => {
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 16).replace('T', ' ');
      const timestampField = createConfig.timestampField || source.timestampField || 'createdAt';
      const id = editingRecord?.[idField] || draftRecordId || values[idField] || ((createConfig.idPrefix || source.createIdPrefix || 'REC') + now.getTime().toString().slice(-12));
      const normalized = { ...(createConfig.defaults || {}), ...(source.initialValues || {}), ...(editingRecord || {}), ...values, [idField]: id };
      if (!normalized[timestampField]) normalized[timestampField] = timestamp;
      normalized.updatedAt = timestamp;
      for (const field of allFields) {
        const value = normalized[field.key];
        if ((field.type === 'date' || field.type === 'date-time') && value?.format) normalized[field.key] = value.format(field.format || (field.type === 'date-time' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'));
        if ((field.type === 'date-range' || field.type === 'date-time-range') && Array.isArray(value)) {
          const range = value.map((item) => item?.format ? item.format(field.format || (field.type === 'date-time-range' ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD')) : safe(item));
          normalized[field.key] = range;
          if (field.startKey) normalized[field.startKey] = range[0] || '';
          if (field.endKey) normalized[field.endKey] = range[1] || '';
          if (field.labelKey) normalized[field.labelKey] = range.filter(Boolean).join(' 至 ');
        }
        if (field.type === 'upload') {
          const file = Array.isArray(value) ? value[0] : value;
          normalized[field.key] = file?.url || file?.name || safe(file);
        }
        const option = (field.options || []).find((item) => item.value === normalized[field.key]);
        if (option && field.labelKey) normalized[field.labelKey] = option.label;
      }
      const stateConfig = draft ? source.draftSubmission : source.publishAction;
      if (stateConfig?.statusField) normalized[stateConfig.statusField] = stateConfig.statusValue;
      if (stateConfig?.statusLabelField) normalized[stateConfig.statusLabelField] = stateConfig.statusLabel;
      for (const [key, definition] of Object.entries(createConfig.derived || {})) {
        const value = normalized[definition.sourceKey];
        if (value != null && definition.map && definition.map[value] != null) normalized[key] = definition.map[value];
      }
      return normalized;
    };
    const persistRecord = (values, options) => {
      const normalized = normalizeSubmissionValues(values, options);
      if (source.persistenceKey) {
        try {
          const currentRecords = JSON.parse(window.localStorage.getItem(source.persistenceKey) || '[]');
          const existing = Array.isArray(currentRecords) ? currentRecords : [];
          window.localStorage.setItem(source.persistenceKey, JSON.stringify([normalized, ...existing.filter((item) => safe(item[idField]) !== safe(normalized[idField]))]));
        } catch (_) { /* local demo persistence is best effort */ }
      }
      return normalized;
    };
    const saveDraft = () => {
      setDrafting(true);
      window.setTimeout(() => {
        const saved = persistRecord(form.getFieldsValue(true), { draft: true });
        setDraftRecordId(saved[idField]);
        setDrafting(false);
        message.success(source.draftSubmission?.successMessage || '草稿已保存');
      }, Number(source.draftSubmission?.latencyMs || 320));
    };
    const validateAll = async () => {
      const values = form.getFieldsValue(true);
      for (const [stepIndex, item] of steps.entries()) {
        const missing = (item.fields || []).find((field) => field.required && isEmpty(values[field.key]));
        if (missing) { setCurrent(stepIndex); message.warning(missing.requiredMessage || ('请填写' + missing.label)); return false; }
      }
      try { await form.validateFields(allFields.filter((field) => field.required).map((field) => field.key)); return true; } catch { return false; }
    };
    const submit = (values) => {
      setSubmitting(true);
      window.setTimeout(() => {
        setSubmitting(false);
        if (source.demoSubmission?.mode === 'error') { message.error(source.demoSubmission.errorMessage || '提交失败'); return; }
        persistRecord(values, { draft: false });
        if (source.demoSubmission?.returnHref) { window.location.href = source.demoSubmission.returnHref + '?saved=1'; return; }
        message.success(source.demoSubmission?.successMessage || '已提交');
      }, Number(source.demoSubmission?.latencyMs || 650));
    };
    const publish = async () => { if (await validateAll()) submit(form.getFieldsValue(true)); };
    const cancel = () => { const returnHref = source.cancelHref || source.entryHref; if (returnHref) { window.location.href = returnHref; return; } form.resetFields(); };
    if (initial['permission-denied']) return h(Result, { status: '403', title: '暂无访问权限', subTitle: '请联系管理员开通当前页面的访问权限。' });
    const stepItems = steps.map((item) => ({ title: item.title, description: item.description }));
    const fieldNodes = steps.flatMap((item, stepIndex) => (item.fields || []).map((field) => ({ field, stepIndex }))).map(({ field, stepIndex }) => {
      const rules = [];
      if (field.required) rules.push({ required: true, message: field.requiredMessage || ((field.type === 'select' || String(field.type).includes('date') || field.type === 'upload') ? ('请选择' + field.label) : ('请输入' + field.label)) });
      if (field.pattern) rules.push({ pattern: field.pattern, message: field.patternMessage || (field.label + '格式不正确'), validateTrigger: 'onBlur' });
      return h(Form.Item, { key: field.key, className: [field.span === 'full' ? 'standard-stepped-span-full' : '', stepIndex === current ? '' : 'standard-stepped-hidden-field'].filter(Boolean).join(' '), label: field.label + '：', name: field.key, valuePropName: field.type === 'switch' ? 'checked' : 'value', extra: field.help, rules }, control(field));
    });
    const values = { ...formInitialValues, ...form.getFieldsValue(true) };
    const previewItems = current === steps.length - 1 ? steps.slice(0, current).flatMap((item) => item.fields || []).map((field) => ({ key: field.key, label: field.label, children: displayValue(field, values[field.key]) })) : [];
    const detailColumns = window.innerWidth <= 680 ? 1 : 2;
    const confirmationPreview = previewItems.length ? h('section', { key: 'preview', className: 'standard-stepped-preview', 'aria-label': '已填信息预览' }, [h('h2', { key: 'title' }, source.confirmationTitle || '已填信息'), h(Descriptions, { key: 'details', column: detailColumns, size: 'small', bordered: false, items: previewItems })]) : null;
    const previewModal = source.previewAction ? h(Modal, { key: 'previewModal', className: 'standard-stepped-preview-modal', title: source.previewTitle || '活动预览', open: previewOpen, centered: true, width: window.innerWidth <= 680 ? 'calc(100vw - 32px)' : 760, onCancel: () => setPreviewOpen(false), footer: h(Button, { onClick: () => setPreviewOpen(false) }, '关闭'), destroyOnHidden: true }, h(Descriptions, { bordered: false, column: detailColumns, size: 'middle', items: previewItems })) : null;
    const actionNodes = [
      current > 0 ? h(Button, { key: 'prev', onClick: previous }, '上一步') : h(Button, { key: 'cancel', onClick: cancel }, props.secondaryActionLabel || '取消'),
      source.draftSubmission ? h(Button, { key: 'draft', loading: drafting, onClick: saveDraft }, drafting ? (source.draftSubmission.loadingLabel || '保存中') : (source.draftSubmission.actionLabel || '保存草稿')) : null,
      current === steps.length - 1 && source.previewAction ? h(Button, { key: 'preview', onClick: () => setPreviewOpen(true) }, source.previewAction.label || '预览') : null,
      current < steps.length - 1
        ? h(Button, { key: 'next', type: 'primary', onClick: next }, source.nextActionLabel || '下一步')
        : h(Button, { key: 'submit', type: 'primary', loading: submitting, onClick: publish }, submitting ? (source.publishAction?.loadingLabel || '提交中') : (source.publishAction?.label || props.primaryActionLabel || '提交'))
    ].filter(Boolean);
    return h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { fontFamily: 'Roboto, "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 14, fontSizeSM: 12, fontSizeLG: 16, fontSizeXL: 20, lineHeight: 22 / 14, lineHeightSM: 20 / 12, lineHeightLG: 24 / 16, fontWeightStrong: 500, borderRadius: 8, controlHeight: 32, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' } } }, h('div', { className: 'standard-stepped-form-page' }, [
      h(Breadcrumb, { key: 'breadcrumb', className: 'standard-page-breadcrumb', items: payload.breadcrumb || [] }),
      h('div', { key: 'content', className: 'standard-stepped-content' }, [
        h(Card, { key: 'steps', className: 'standard-stepped-card', bordered: false }, h(Steps, { current, items: stepItems, responsive: true })),
        confirmationPreview,
        h(Card, { key: 'formCard', className: 'standard-stepped-card', bordered: false }, h(Form, { form, layout: 'vertical', colon: false, initialValues: formInitialValues, className: 'standard-stepped-form' }, h('div', { className: 'standard-stepped-grid', style: { '--standard-stepped-columns': requestedColumns }, 'data-columns': requestedColumns }, fieldNodes))),
        h('div', { key: 'actions', className: 'standard-stepped-actions' }, actionNodes),
        previewModal
      ])
    ]));
  }
  ReactDOM.createRoot(document.getElementById('yipex-standard-stepped-form-app')).render(h(App));
})();
  `;
  const pageCss = `${standardBreadcrumbCss}#yipex-page.yipex-shell-content{padding:0;background:transparent;border-radius:0;display:flex;flex-direction:column}#yipex-standard-stepped-form-app{display:flex;flex:1;min-height:0}.standard-stepped-form-page{width:100%;min-height:100%;margin:0;padding:8px 0 0;letter-spacing:0;display:flex;flex:1;flex-direction:column}.standard-stepped-content{width:100%;min-height:0;padding:24px 24px 80px;background:#fff;border-radius:8px;display:flex;flex:1;flex-direction:column}.standard-stepped-card{margin-bottom:24px;border:0!important;box-shadow:none!important}.standard-stepped-card .ant-card-body{padding:0}.standard-stepped-grid{width:min(100%,${steppedFormWidth}px);display:grid;grid-template-columns:repeat(var(--standard-stepped-columns,1),minmax(0,1fr));gap:16px;margin:0 auto}.standard-stepped-grid[data-columns='2'],.standard-stepped-grid[data-columns='3']{width:100%}.standard-stepped-span-full{grid-column:1 / -1}.standard-stepped-grid[data-columns='1'] .standard-stepped-span-full{grid-column:auto}.standard-stepped-hidden-field{display:none!important}.standard-stepped-form .ant-form-item-label>label{color:rgba(0,0,0,.85);font-size:14px;font-weight:400;line-height:22px}.standard-stepped-form .ant-form-item-extra{font-size:12px;font-weight:400;line-height:20px}.standard-stepped-grid .ant-form-item{margin-bottom:0}.standard-upload-trigger{display:grid;gap:4px;place-items:center;color:rgba(0,0,0,.65);font-size:12px;line-height:20px}.standard-upload-plus{color:rgba(0,0,0,.45);font-size:22px;line-height:22px}.standard-stepped-preview{width:100%;margin:0 auto 24px;padding-bottom:24px;border-bottom:1px solid #f0f0f0}.standard-stepped-preview h2{margin:0 0 12px;color:#222;font-size:16px;font-weight:500;line-height:24px}.standard-stepped-preview .ant-descriptions-item-label,.standard-stepped-preview .ant-descriptions-item-content,.standard-stepped-preview-modal .ant-descriptions-item-label,.standard-stepped-preview-modal .ant-descriptions-item-content{font-size:14px;font-weight:400;line-height:22px}.standard-stepped-preview-modal .ant-modal-body{padding-top:24px;padding-bottom:24px}.standard-stepped-preview-modal .ant-modal-footer{padding-top:12px;border-top:1px solid #f0f0f0}.standard-stepped-actions{position:fixed;left:var(--yipex-shell-sidebar);right:0;bottom:0;z-index:20;display:flex;justify-content:flex-end;gap:8px;min-height:56px;padding:12px 24px;background:#fff;border-top:1px solid #f0f0f0}@media(max-width:760px){.standard-stepped-content{padding:16px 16px 72px}.standard-stepped-grid{width:100%;grid-template-columns:1fr}.standard-stepped-span-full{grid-column:auto}.standard-stepped-actions{left:0;right:0;padding-right:16px;padding-left:16px}}`;
  const runtimeAssets = ['react.production.min.js', 'react-dom.production.min.js', 'dayjs.min.js', 'dayjs-zh-cn.js', 'antd.min.js', 'ant-design-icons.umd.js'];
  const preloads = runtimeAssets.map((asset) => `<link rel="preload" as="script" href="${vendorPath(asset)}">`).join(''); const scripts = runtimeAssets.map((asset) => `<script defer src="${vendorPath(asset)}"><\/script>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${vendorPath('antd-reset.css')}">${preloads}<title>${escape(metadata.pageName)} | YiPex</title><style>${shellCss}${pageCss}</style></head><body>${body}<script id="yipex-standard-stepped-form-data" type="application/json">${embedded}</script>${scripts}<script>${shellRuntime}</script><script>(() => { const start = () => { if (window.React && window.ReactDOM && window.antd && window.dayjs) { ${appScript} } else { window.requestAnimationFrame(start); } }; start(); })();</script></body></html>`;
}
