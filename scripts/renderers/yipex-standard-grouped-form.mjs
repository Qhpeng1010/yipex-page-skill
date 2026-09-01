import { readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { deriveStandardBreadcrumb, standardBreadcrumbCss } from './yipex-standard-breadcrumb.mjs';
import { formRuntimeBootstrapSource } from '../lib/yipex-form-runtime.mjs';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function renderNavigation(items) {
  return (items || []).map((item) => `<a class="yipex-shell-nav-item${item.active ? ' active' : ''}" data-antd-component="Menu.Item" data-menu-key="${escape(item.id)}" href="#${escape(item.id)}" title="${escape(item.label || item.id)}" ${item.active ? 'aria-current="page"' : ''}><span class="nav-icon anticon" data-antd-icon="${escape(item.icon || 'AppstoreOutlined')}" aria-hidden="true"></span><span>${escape(item.label || item.id)}</span></a>`).join('');
}

export function renderStandardGroupedForm(pageSpec, { projectRoot, specPath }) {
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
  const breadcrumb = deriveStandardBreadcrumb(shell, metadata.pageName, data.entryHref || '');
  const embedded = JSON.stringify({ pageName: metadata.pageName, breadcrumb, props, data, initialState: page.states || {}, generation: metadata.generation || page.extensions?.generation || {} }).replace(/</g, '\\u003c');
  const values = {
    brandMark: brand.mark || 'Y', brandLogo: logo, brandName: brand.name || 'Yipex',
    welcome: header.welcome || '欢迎回来', userName: header.userName || '用户',
    email: header.email || 'user@yipex.tech', avatar: header.avatar || (header.userName || '用').slice(0, 1),
    copyright: footer.copyright || 'Copyright Somei E-Commerce Limited 2025. All rights reserved',
    navigation: renderNavigation(shell.navigation),
    content: '<div id="yipex-standard-grouped-form-app" data-component="standard-grouped-form"></div>'
  };
  const body = Object.entries(values).reduce((source, [key, value]) => source.replaceAll(`{{${key}}}`, value), template);
  const appScript = `
(() => {
  const h = React.createElement;
  const { ConfigProvider, Breadcrumb, Card, Form, Input, InputNumber, Select, DatePicker, Switch, Button, Alert, Result, Tooltip, message } = antd;
  ${formRuntimeBootstrapSource()}
  const { QuestionCircleOutlined } = window.icons;
  const payload = JSON.parse(document.getElementById('yipex-standard-grouped-form-data').textContent);
  const source = payload.data || {};
  const initial = payload.initialState || {};
  const props = payload.props || {};
  const sections = Array.isArray(source.sections) ? source.sections : [];
  const allFields = sections.flatMap((section) => section.fields || []);
  const optionSets = source.optionSets || {};
  const initialValues = source.initialValues || {};
  const safe = (value) => String(value == null ? '' : value);
  const recordIdParam = source.recordIdParam || 'id';
  const recordId = new URLSearchParams(window.location.search).get(recordIdParam);
  const baseRecords = Array.isArray(source.records) ? source.records : [];
  const storedRecords = (() => { if (!source.persistenceKey) return []; try { const value = JSON.parse(window.localStorage.getItem(source.persistenceKey) || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return []; } })();
  const editingRecord = source.mode === 'edit' && recordId ? [...storedRecords, ...baseRecords].find((item) => safe(item.id) === safe(recordId)) : null;
  const formInitialValues = formRuntime.reconcileFields(allFields, formRuntime.toFormValues(allFields, { ...initialValues, ...(editingRecord || {}) }), optionSets).values;
  const navigationEntry = performance.getEntriesByType('navigation')[0];
  const navigationType = navigationEntry?.type || (performance.navigation?.type === 1 ? 'reload' : 'navigate');
  if (source.resetOnRefresh && navigationType === 'reload' && source.entryHref) { window.location.replace(source.entryHref); return; }
  function fieldLabel(field) {
    const label = h('span', { className: 'standard-form-label-text' }, field.label + '：');
    if (!field.help) return label;
    const helpLabel = field.label + '说明：' + field.help;
    return h('span', { className: 'standard-form-label' }, [
      label,
      h(Tooltip, { key: 'help', title: field.help, trigger: ['hover', 'focus'] }, h('span', { className: 'standard-form-help-icon', tabIndex: 0, role: 'img', 'aria-label': helpLabel }, h(QuestionCircleOutlined)))
    ]);
  }
  function App() {
    const [form] = Form.useForm();
    const [runtimeValues, setRuntimeValues] = React.useState(formInitialValues);
    const [submitting, setSubmitting] = React.useState(Boolean(initial.submitting));
    const [submitted, setSubmitted] = React.useState(Boolean(initial.success));
    const [error, setError] = React.useState(Boolean(initial.error));
    const submit = (rawValues) => {
      const values = formRuntime.serializeValues(allFields, rawValues);
      setSubmitting(true); setError(false); setSubmitted(false);
      window.setTimeout(() => { setSubmitting(false); if (source.demoSubmission?.mode === 'error') { setError(true); message.error(source.demoSubmission.errorMessage || '保存失败'); return; }
        const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const createConfig = source.create || {};
        const idField = createConfig.idField || source.idField || 'id';
        const id = editingRecord?.[idField] || values[idField] || ((createConfig.idPrefix || source.createIdPrefix || 'REC') + now.replace(/[^0-9]/g, '').slice(-12));
        const normalized = { ...(editingRecord || {}), ...values, [idField]: id };
        const timestampField = createConfig.timestampField || source.timestampField || 'createdAt';
        if (!editingRecord && !normalized[timestampField]) normalized[timestampField] = now;
        for (const field of sections.flatMap((section) => section.fields || [])) {
          if (field.labelKey && !formRuntime.isEmpty(normalized[field.key])) normalized[field.labelKey] = formRuntime.displayValue(field, normalized[field.key], normalized, optionSets);
        }
        for (const [key, definition] of Object.entries(createConfig.derived || {})) {
          const value = normalized[definition.sourceKey];
          if (value != null && definition.map && definition.map[value] != null) normalized[key] = definition.map[value];
        }
        if (source.persistenceKey) {
          try { const current = JSON.parse(window.localStorage.getItem(source.persistenceKey) || '[]'); const existing = Array.isArray(current) ? current : []; window.localStorage.setItem(source.persistenceKey, JSON.stringify([normalized, ...existing.filter((item) => safe(item[idField]) !== safe(id))])); } catch (_) { /* local demo persistence is best effort */ }
        }
        if (source.demoSubmission?.returnHref) { window.setTimeout(() => { window.location.href = source.demoSubmission.returnHref + '?saved=1'; }, 250); return; }
        setSubmitted(true); message.success(source.demoSubmission?.successMessage || '已保存');
      }, Number(source.demoSubmission?.latencyMs || 500));
    };
    const onValuesChange = (_, values) => {
      const reconciled = formRuntime.reconcileFields(allFields, values, optionSets);
      if (reconciled.changedKeys.length) form.setFields(reconciled.changedKeys.map((key) => ({ name: key, value: reconciled.values[key], errors: [] })));
      setRuntimeValues(reconciled.values);
    };
    const reset = () => { if (source.demoSubmission?.returnHref) { window.location.href = source.demoSubmission.returnHref; return; } form.resetFields(); setRuntimeValues(formInitialValues); setSubmitted(false); setError(false); message.info('已重置表单'); };
    if (initial['permission-denied']) return h(Result, { status: '403', title: '暂无访问权限', subTitle: '请联系管理员开通当前页面的访问权限。' });
    const sectionNodes = sections.map((section) => {
      const visibleFields = (section.fields || []).filter((field) => formRuntime.resolveFieldState(field, runtimeValues, optionSets).visible);
      const fieldCount = Math.max(1, visibleFields.length);
      const gridStyle = {
        '--standard-form-columns': Math.min(3, fieldCount),
        '--standard-form-wide-columns': Math.min(4, fieldCount)
      };
      return h(Card, { key: section.id, className: 'standard-form-section', bordered: false, title: h('div', { className: 'standard-form-section-title' }, h('span', null, section.title)) }, h('div', { className: 'standard-form-grid', style: gridStyle }, visibleFields.map((field) => {
        const state = formRuntime.resolveFieldState(field, runtimeValues, optionSets);
        return h(Form.Item, { key: field.key, className: field.span === 'full' ? 'standard-form-span-full' : '', label: fieldLabel(field), name: field.key, ...formRuntime.fieldValueProps(field), rules: formRuntime.buildRules(field, state), extra: field.extra }, formRuntime.renderControl(field, runtimeValues, optionSets, state));
      })));
    });
    return h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { fontFamily: 'Roboto, "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 14, fontSizeSM: 12, fontSizeLG: 16, fontSizeXL: 20, lineHeight: 22 / 14, lineHeightSM: 20 / 12, lineHeightLG: 24 / 16, fontWeightStrong: 500, borderRadius: 8, controlHeight: 32, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' } } }, h('div', { className: 'standard-grouped-form-page' }, [
      h(Breadcrumb, { key: 'breadcrumb', className: 'standard-page-breadcrumb', items: payload.breadcrumb || [] }),
      submitted ? h(Alert, { key: 'success', className: 'standard-form-feedback', type: 'success', showIcon: true, message: source.demoSubmission?.successMessage || '保存成功', description: props.successDescription || '演示数据已更新，表单可以继续编辑。', closable: true, onClose: () => setSubmitted(false) }) : null,
      error ? h(Alert, { key: 'error', className: 'standard-form-feedback', type: 'error', showIcon: true, message: source.demoSubmission?.errorMessage || '保存失败', description: '请检查字段后重试。', closable: true, onClose: () => setError(false) }) : null,
      h(Form, { key: 'form', form, layout: 'vertical', colon: false, initialValues: formInitialValues, onValuesChange, onFinish: submit, requiredMark: true, className: 'standard-grouped-form' }, [sectionNodes, h('div', { key: 'actions', className: 'standard-form-actions' }, [h(Button, { key: 'reset', onClick: reset, disabled: submitting }, props.secondaryActionLabel || '取消'), h(Button, { key: 'submit', type: 'primary', htmlType: 'submit', loading: submitting }, submitting ? '保存中' : (props.primaryActionLabel || '保存'))])])
    ]));
  }
  ReactDOM.createRoot(document.getElementById('yipex-standard-grouped-form-app')).render(h(App));
})();
  `;
  const pageCss = `
    ${standardBreadcrumbCss}#yipex-page.yipex-shell-content{padding:0;background:transparent;border-radius:0}.standard-grouped-form-page{width:100%;margin:0;padding:8px 0 56px;letter-spacing:0}.standard-form-feedback{margin-bottom:16px}.standard-form-section{margin-bottom:16px;border:0!important;border-radius:8px!important;background:#fff;box-shadow:none!important}.standard-form-section .ant-card-head{min-height:56px;padding:0 24px;background:#fff;border-bottom:0!important}.standard-form-section .ant-card-head-title{padding:16px 0}.standard-form-section .ant-card-body{padding:20px 24px 24px;background:#fff;border-top:1px solid #f0f0f0!important}.standard-form-section-title{display:flex;align-items:center}.standard-form-section-title span{font-size:16px;font-weight:500;line-height:24px;color:#222}.standard-form-grid{display:grid;grid-template-columns:repeat(var(--standard-form-columns,3),minmax(0,1fr));column-gap:16px;row-gap:16px}.standard-form-span-full{grid-column:1 / -1}.standard-grouped-form .ant-form-item-label>label{color:rgba(0,0,0,.85);font-size:14px;font-weight:400;line-height:22px}.standard-form-label{display:inline-flex;align-items:center;gap:4px}.standard-form-help-icon{display:inline-flex;color:rgba(0,0,0,.45);font-size:14px;line-height:1;cursor:help;border-radius:2px}.standard-form-help-icon:focus-visible{outline:2px solid #4aa52e;outline-offset:2px}.standard-form-grid .ant-form-item{margin-bottom:0}.standard-form-actions{position:fixed;left:var(--yipex-shell-sidebar);right:0;bottom:0;z-index:20;display:flex;justify-content:flex-end;gap:8px;min-height:56px;padding:12px 24px;background:#fff;border-top:1px solid #f0f0f0}@media(min-width:1920px){.standard-form-grid{grid-template-columns:repeat(var(--standard-form-wide-columns,4),minmax(0,1fr))}}@media(max-width:760px){.standard-form-section .ant-card-head{padding:0 16px}.standard-form-section .ant-card-body{padding:16px}.standard-form-grid{grid-template-columns:1fr}.standard-form-span-full{grid-column:auto}.standard-form-actions{left:0;right:0;padding-right:16px;padding-left:16px}}
  `;
  const runtimeAssets = ['react.production.min.js', 'react-dom.production.min.js', 'dayjs.min.js', 'dayjs-zh-cn.js', 'antd.min.js', 'ant-design-icons.umd.js'];
  const preloads = runtimeAssets.map((asset) => `<link rel="preload" as="script" href="${vendorPath(asset)}">`).join('');
  const scripts = runtimeAssets.map((asset) => `<script defer src="${vendorPath(asset)}"><\/script>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${vendorPath('antd-reset.css')}">${preloads}<title>${escape(metadata.pageName)} | YiPex</title><style>${shellCss}${pageCss}</style></head><body>${body}<script id="yipex-standard-grouped-form-data" type="application/json">${embedded}</script>${scripts}<script>${shellRuntime}</script><script>(() => { const start = () => { if (window.React && window.ReactDOM && window.antd && window.dayjs && window.icons) { ${appScript} } else { window.requestAnimationFrame(start); } }; start(); })();</script></body></html>`;
}
