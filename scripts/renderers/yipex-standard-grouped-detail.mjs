import { readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { deriveStandardBreadcrumb, standardBreadcrumbCss } from './yipex-standard-breadcrumb.mjs';
import { normalizeUnitPresentationData } from '../lib/yipex-unit-presentation.mjs';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function renderNavigation(items) {
  return (items || []).map((item) => `<a class="yipex-shell-nav-item${item.active ? ' active' : ''}" data-antd-component="Menu.Item" data-menu-key="${escape(item.id)}" href="#${escape(item.id)}" title="${escape(item.label || item.id)}" ${item.active ? 'aria-current="page"' : ''}><span class="nav-icon anticon" data-antd-icon="${escape(item.icon || 'AppstoreOutlined')}" aria-hidden="true"></span><span>${escape(item.label || item.id)}</span></a>`).join('');
}

export function renderStandardGroupedDetail(pageSpec, { projectRoot, specPath }) {
  const { metadata, page } = pageSpec;
  const root = page.root || {};
  const data = normalizeUnitPresentationData(page.data || {});
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
    content: '<div id="yipex-standard-grouped-detail-app" data-component="standard-grouped-detail"></div>'
  };
  const body = Object.entries(values).reduce((source, [key, value]) => source.replaceAll(`{{${key}}}`, value), template);
  const appScript = `
(() => {
  const h = React.createElement;
  const { ConfigProvider, Breadcrumb, Card, Statistic, Descriptions, Tag, Table, Empty, Button, Result, Space } = antd;
  const payload = JSON.parse(document.getElementById('yipex-standard-grouped-detail-data').textContent);
  const source = payload.data || {};
  const props = payload.props || {};
  const safe = (value) => String(value == null ? '' : value);
  const statusColor = { ACTIVE: 'green', INACTIVE: 'default', ENABLED: 'green', DISABLED: 'default', SUCCESS: 'green', FAILED: 'red', PROCESSING: 'blue', PENDING: 'orange', OPERATING: 'green', PAUSED: 'orange', CLOSED: 'default', COMPLETED: 'green', CANCELLED: 'default' };
  const money = (value, unit) => value == null || value === '' ? '-' : Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (unit ? ' ' + unit : '');
  function formatValue(value, field, record) {
    if (field.format === 'amount' || field.format === 'currency') return money(value, field.unitPlacement === 'value' && field.unitKey ? record[field.unitKey] : undefined);
    if (field.format === 'integer') return value == null ? '-' : Number(value).toLocaleString('zh-CN');
    if (field.format === 'status') return h(Tag, { color: statusColor[value] || field.color || 'default' }, record[field.labelKey || 'statusLabel'] || value || '-');
    return safe(value) || '-';
  }
  function App() {
    const returnHref = new URLSearchParams(window.location.search).get(source.returnParam || 'return') || source.entryHref || '';
    const recordId = new URLSearchParams(window.location.search).get(source.recordIdParam || 'id');
    let record = source.record || {};
    if (recordId) {
      try {
        const saved = source.persistenceKey ? JSON.parse(window.localStorage.getItem(source.persistenceKey) || '[]') : [];
        const candidates = [...(Array.isArray(saved) ? saved : []), ...(Array.isArray(source.records) ? source.records : [])];
        record = candidates.find((item) => safe(item.id) === safe(recordId)) || record;
      } catch (_) { /* local demo persistence is best effort */ }
    }
    const sections = Array.isArray(source.sections) ? source.sections : [];
    const metrics = Array.isArray(source.metrics) ? source.metrics : [];
    const relatedTables = Array.isArray(source.relatedTables) ? source.relatedTables : [];
    if (source.permissionDenied) return h(Result, { status: '403', title: '暂无访问权限', subTitle: '请联系管理员开通当前页面的访问权限。' });
    const metricNodes = metrics.length ? h('div', { className: 'standard-detail-metrics' }, metrics.map((metric) => h(Card, { key: metric.id || metric.label, className: 'standard-detail-metric', bordered: false }, h(Statistic, { title: metric.displayLabel || metric.label, value: metric.value, precision: metric.format === 'amount' || metric.format === 'currency' ? 2 : metric.format === 'integer' ? 0 : undefined })))) : null;
    const sectionNodes = sections.map((section) => h(Card, { key: section.id, className: 'standard-detail-section standard-detail-group', bordered: false, title: h('div', { className: 'standard-detail-section-title' }, [h('span', { key: 'title' }, section.title), section.description ? h('small', { key: 'description' }, section.description) : null]) }, h(Descriptions, { column: section.columns || { xs: 1, sm: 2, md: 3 }, bordered: false }, (section.fields || []).map((field) => h(Descriptions.Item, { key: field.key, label: field.displayLabel || field.label, span: field.span || 1 }, formatValue(record[field.key], field, record))))));
    const detailGroups = sectionNodes.length ? h('div', { className: 'standard-detail-groups' + (sectionNodes.length >= 2 ? ' standard-detail-groups-divided' : '') }, sectionNodes) : null;
    const tableNodes = relatedTables.map((table) => h(Card, { key: table.id, className: 'standard-detail-section', bordered: false, title: h('div', { className: 'standard-detail-section-title' }, [h('span', { key: 'title' }, table.title), table.description ? h('small', { key: 'description' }, table.description) : null]) }, h(Table, { columns: (table.columns || []).map((column) => ({ title: column.displayLabel || column.label || column.key, dataIndex: column.key, key: column.key, align: column.format === 'amount' || column.format === 'currency' || column.format === 'integer' ? 'right' : 'left', render: (value, row) => formatValue(value, column, row) })), dataSource: table.records || [], rowKey: (row) => row.id || JSON.stringify(row), pagination: false, size: 'middle', scroll: { x: Math.max(640, (table.columns || []).length * 140) }, locale: { emptyText: h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: '暂无记录' }) } })));
    return h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { fontFamily: 'Roboto, "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 14, fontSizeSM: 12, fontSizeLG: 16, fontSizeXL: 20, lineHeight: 22 / 14, lineHeightSM: 20 / 12, lineHeightLG: 24 / 16, fontWeightStrong: 500, borderRadius: 8, controlHeight: 32, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' } } }, h('div', { className: 'standard-grouped-detail-page' }, [
      h(Breadcrumb, { key: 'breadcrumb', className: 'standard-page-breadcrumb', items: payload.breadcrumb || [] }),
      h('div', { key: 'content', className: 'standard-detail-content' }, [
        metricNodes,
        detailGroups,
        tableNodes,
        props.footerActionLabel ? h('div', { key: 'actions', className: 'standard-detail-actions' }, h(Button, { type: 'primary', onClick: () => returnHref && (window.location.href = returnHref) }, props.footerActionLabel)) : null
      ])
    ]));
  }
  ReactDOM.createRoot(document.getElementById('yipex-standard-grouped-detail-app')).render(h(App));
})();
  `;
  const pageCss = `
    ${standardBreadcrumbCss}#yipex-page.yipex-shell-content{padding:0;background:transparent;border-radius:0}.standard-grouped-detail-page{width:100%;min-width:0;margin:0;padding-top:8px;letter-spacing:0}.standard-detail-content{padding:24px;background:#fff;border-radius:10px}.standard-detail-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:20px}.standard-detail-metric{border:0!important;box-shadow:none!important;background:#fafafa}.standard-detail-metric .ant-card-body{padding:16px}.standard-detail-groups{margin-bottom:20px}.standard-detail-section{margin-bottom:20px;border:0!important;box-shadow:none!important}.standard-detail-group{margin-bottom:0}.standard-detail-groups-divided .standard-detail-group:not(:last-child){padding-bottom:20px;border-bottom:1px solid #F0F0F0!important}.standard-detail-groups-divided .standard-detail-group+.standard-detail-group{padding-top:20px}.standard-detail-section .ant-card-head{padding:0;min-height:40px;border-bottom:0}.standard-detail-section .ant-card-head-title{padding:0}.standard-detail-section .ant-card-body{padding:0}.standard-detail-section-title{display:flex;align-items:baseline;gap:10px}.standard-detail-section-title span{font-size:16px;font-weight:500;line-height:24px;color:#222}.standard-detail-section-title small{font-size:12px;color:rgba(0,0,0,.45);font-weight:400;line-height:20px}.standard-detail-actions{display:flex;justify-content:flex-end;padding-top:4px;border-top:1px solid #f0f0f0}@media(max-width:1200px){.standard-detail-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.standard-detail-content{padding:16px}.standard-detail-metrics{grid-template-columns:1fr}.standard-detail-section .ant-descriptions-view{overflow-x:auto}.standard-detail-section .ant-descriptions-item-label{white-space:nowrap}}
  `;
  const runtimeAssets = ['react.production.min.js', 'react-dom.production.min.js', 'dayjs.min.js', 'dayjs-zh-cn.js', 'antd.min.js', 'ant-design-icons.umd.js'];
  const preloads = runtimeAssets.map((asset) => `<link rel="preload" as="script" href="${vendorPath(asset)}">`).join('');
  const scripts = runtimeAssets.map((asset) => `<script defer src="${vendorPath(asset)}"><\/script>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${vendorPath('antd-reset.css')}">${preloads}<title>${escape(metadata.pageName)} | YiPex</title><style>${shellCss}${pageCss}</style></head><body>${body}<script id="yipex-standard-grouped-detail-data" type="application/json">${embedded}</script>${scripts}<script>${shellRuntime}</script><script>(() => { const start = () => { if (window.React && window.ReactDOM && window.antd && window.dayjs) { ${appScript} } else { window.requestAnimationFrame(start); } }; start(); })();</script></body></html>`;
}
