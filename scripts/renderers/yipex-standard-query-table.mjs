import { readFileSync } from 'node:fs';
import { relative, resolve, dirname, sep } from 'node:path';
import { normalizeUnitPresentationData } from '../lib/yipex-unit-presentation.mjs';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function renderNavigation(items) {
  return (items || []).map((item) => `<a class="yipex-shell-nav-item${item.active ? ' active' : ''}" data-antd-component="Menu.Item" data-menu-key="${escape(item.id)}" href="#${escape(item.id)}" title="${escape(item.label || item.id)}" ${item.active ? 'aria-current="page"' : ''}><span class="nav-icon anticon" data-antd-icon="${escape(item.icon || 'AppstoreOutlined')}" aria-hidden="true"></span><span>${escape(item.label || item.id)}</span></a>`).join('');
}

export function resolveContextPresentation(fieldCount, preference = 'auto') {
  if (['modal', 'drawer', 'page'].includes(preference)) return preference;
  const count = Number(fieldCount) || 0;
  if (count > 16) return 'page';
  if (count > 6) return 'drawer';
  return 'modal';
}

export function resolveDetailOverlayMode(fields, preference = 'auto') {
  return resolveContextPresentation(Array.isArray(fields) ? fields.length : 0, preference);
}

export function resolveCreateOverlayMode(fields, preference = 'auto') {
  return resolveContextPresentation(Array.isArray(fields) ? fields.length : 0, preference);
}

export function resolveDrawerSize(fieldCount, preference = 'auto') {
  if (preference === 'default' || preference === 'large') return preference;
  return Number(fieldCount) > 8 ? 'large' : 'default';
}

export function renderStandardQueryTable(pageSpec, { projectRoot, specPath }) {
  const { metadata, page } = pageSpec;
  const data = normalizeUnitPresentationData(page.data || {});
  const root = page.root || {};
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
  const filters = Array.isArray(data.filters) ? data.filters : [];
  const columns = Array.isArray(data.columns) ? data.columns : [];
  const detailOverlayNode = (root.children || []).find((node) => node?.type === 'detail-overlay');
  const detailFields = Array.isArray(data.detailFields) ? data.detailFields : columns;
  const detailOverlayMode = resolveDetailOverlayMode(detailFields, detailOverlayNode?.props?.mode || data.detailOverlay || props.detailOverlay);
  const createOverlayMode = resolveCreateOverlayMode(data.createFields, data.createOverlay || props.createOverlay);
  const embedded = JSON.stringify({
    pageName: metadata.pageName,
    props,
    data,
    initialState: page.states || {},
    filters,
    columns,
    detailOverlay: detailOverlayMode,
    createOverlay: createOverlayMode,
    generation: metadata.generation || page.extensions?.generation || {}
  }).replace(/</g, '\\u003c');
  const navigation = renderNavigation(shell.navigation);
  const content = '<div id="yipex-standard-query-table-app" data-component="standard-query-table"></div>';
  const values = {
    brandMark: brand.mark || 'Y',
    brandLogo: logo,
    brandName: brand.name || 'Yipex',
    welcome: header.welcome || '欢迎回来',
    userName: header.userName || '用户',
    email: header.email || 'user@yipex.tech',
    avatar: header.avatar || (header.userName || '用').slice(0, 1),
    copyright: footer.copyright || 'Copyright Somei E-Commerce Limited 2025. All rights reserved',
    navigation,
    content
  };
  const body = Object.entries(values).reduce((source, [key, value]) => source.replaceAll(`{{${key}}}`, value), template);
  const appScript = `
(() => {
  const h = React.createElement;
  const { ConfigProvider, Card, Input, Select, Radio, Button, Table, Pagination, Empty, Result, Badge, Drawer, Descriptions, DatePicker, Statistic, Modal, Tabs, message } = antd;
  const payload = JSON.parse(document.getElementById('yipex-standard-query-table-data').textContent);
  const source = payload.data || {};
  const filterDefs = payload.filters || [];
  const columnDefs = payload.columns || [];
  const initial = payload.initialState || {};
  const initialFilters = initial.filters || {};
  const tabDefs = Array.isArray(source.tabs) ? source.tabs : [];
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get(source.tabParam || 'tab') || source.defaultTab || tabDefs[0]?.key || 'ALL';
  const urlFilters = filterDefs.reduce((result, definition) => {
    const raw = urlParams.get(definition.key);
    if (raw == null) return result;
    result[definition.key] = definition.type === 'date-range' ? raw.split(',') : raw;
    return result;
  }, {});
  const hydratedInitialFilters = { ...initialFilters, ...urlFilters };
  const capabilities = new Set(payload.generation?.capabilities || []);
  const supportsSelection = capabilities.has('table.selection');
  const supportsExport = capabilities.has('table.export');
  const supportsDetail = capabilities.has('detail.drawer') || capabilities.has('detail.overlay');
  const supportsDateRange = capabilities.has('query.dateRange');
  const supportsSummary = capabilities.has('summary.metrics') || capabilities.has('summary.aggregate');
  const detailFieldDefs = Array.isArray(source.detailFields) ? source.detailFields : columnDefs;
  const detailPresentation = payload.detailOverlay || 'modal';
  const createPresentation = payload.createOverlay || 'modal';
  const supportsCreate = capabilities.has('form.overlay') && Array.isArray(source.createFields) && source.createFields.length > 0 && createPresentation !== 'page';
  const supportsCreatePage = Boolean(source.createPageHref) && (!source.createOverlay || createPresentation === 'page');
  const detailDrawerSize = source.detailDrawerSize === 'large' || source.detailDrawerSize === 'default' ? source.detailDrawerSize : (detailFieldDefs.length > 8 ? 'large' : 'default');
  const createDrawerSize = source.createDrawerSize === 'large' || source.createDrawerSize === 'default' ? source.createDrawerSize : ((source.createFields || []).length > 6 ? 'large' : 'default');
  const actionDefinitions = (column) => Array.isArray(column.actions) ? column.actions : column.format === 'detail-action' ? [{ type: 'detail', label: column.actionLabel || '详情' }] : [];
  const allActions = columnDefs.flatMap(actionDefinitions);
  const safe = (value) => String(value == null ? '' : value);
  const formatMoney = (value, unit) => (value == null || value === '' ? '-' : Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (unit ? ' ' + unit : ''));
  const statusTone = { ACTIVE: 'success', INACTIVE: 'default', ENABLED: 'success', DISABLED: 'default', SUCCESS: 'success', FAILED: 'error', PROCESSING: 'processing', PENDING: 'warning', OPERATING: 'success', PAUSED: 'warning', CLOSED: 'default', ON_SALE: 'success', OFF_SALE: 'default', DRAFT: 'warning', AVAILABLE: 'success', UNAVAILABLE: 'default', COMPLETED: 'success', CANCELLED: 'default', REJECTED: 'error', EXPIRED: 'default' };
  const resolveStatusTone = (value, column) => {
    const key = String(value == null ? '' : value).toUpperCase();
    return column.statusTone?.[value] || column.statusTone?.[key] || source.statusTone?.[value] || source.statusTone?.[key] || statusTone[key] || 'default';
  };
  const isActionColumn = (column) => Array.isArray(column.actions) || column.format === 'detail-action' || column.role === 'action' || column.key === 'action' || column.key === 'actions' || column.label === '操作';
  function formatCell(value, record, column) {
    if (column.format === 'amount' || column.format === 'currency') return formatMoney(value, column.unitPlacement === 'value' && column.unitKey ? record[column.unitKey] : undefined);
    if (column.format === 'integer') return value == null ? '-' : Number(value).toLocaleString('zh-CN');
    if (column.format === 'status') {
      const text = record[column.labelKey || 'statusLabel'] || value || '-';
      const tone = resolveStatusTone(value, column);
      return column.color ? h(Badge, { color: column.color, text }) : h(Badge, { status: tone, text });
    }
    return safe(value) || '-';
  }
  function App() {
    const [draft, setDraft] = React.useState(hydratedInitialFilters);
    const [applied, setApplied] = React.useState(hydratedInitialFilters);
    const [activeTab, setActiveTab] = React.useState(initialTab);
    const [page, setPage] = React.useState(Number(urlParams.get('page') || initial.page || 1));
    const [loading, setLoading] = React.useState(Boolean(initial.loading));
    const [error, setError] = React.useState(Boolean(initial.error));
    const [selectedKeys, setSelectedKeys] = React.useState(initial.selectedMerchantIds || initial.selectedIds || []);
    const [drawerRecord, setDrawerRecord] = React.useState(null);
    const [createOpen, setCreateOpen] = React.useState(false);
    const [createValues, setCreateValues] = React.useState({});
    const [editingRecord, setEditingRecord] = React.useState(null);
    const orderRecords = (items) => {
      const sort = source.defaultSort || { key: 'createdAt', order: 'descend' };
      if (!sort.key) return items;
      return [...items].sort((a, b) => {
        const left = String(a?.[sort.key] ?? '');
        const right = String(b?.[sort.key] ?? '');
        return sort.order === 'ascend' ? left.localeCompare(right) : right.localeCompare(left);
      });
    };
    const [records, setRecords] = React.useState(() => {
      const base = initial.empty ? [] : (Array.isArray(source.records) ? source.records : []);
      if (!source.persistenceKey) return orderRecords(base);
      try { const saved = JSON.parse(window.localStorage.getItem(source.persistenceKey) || '[]'); return orderRecords([...saved, ...base.filter((item) => !saved.some((savedItem) => savedItem.id === item.id))]); } catch (_) { return orderRecords(base); }
    });
    const returned = new URLSearchParams(window.location.search).get('saved');
    React.useEffect(() => {
      if (!returned) return;
      message.success(source.returnMessage || '保存成功');
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, '', cleanUrl);
    }, []);
    const pageSize = Number(source.pageSize || initial.pageSize || 10);
    const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
    const syncLocation = (nextFilters, nextTab, nextPage) => {
      if (!source.syncQueryState) return;
      const params = new URLSearchParams();
      const defaultTab = source.defaultTab || tabDefs[0]?.key || 'ALL';
      if (nextTab && nextTab !== defaultTab) params.set(source.tabParam || 'tab', nextTab);
      for (const definition of filterDefs) {
        const value = nextFilters?.[definition.key];
        if (Array.isArray(value) ? value.some(Boolean) : value != null && value !== '' && value !== 'ALL') params.set(definition.key, Array.isArray(value) ? value.join(',') : value);
      }
      if (nextPage && Number(nextPage) > 1) params.set('page', String(nextPage));
      const query = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
    };
    const apply = () => { setLoading(true); setError(false); window.setTimeout(() => { setApplied({ ...draft }); setPage(1); syncLocation(draft, activeTab, 1); setLoading(false); message.success('查询条件已应用'); }, 180); };
    const reset = () => { setDraft({}); setApplied({}); setPage(1); setSelectedKeys([]); setError(false); syncLocation({}, activeTab, 1); message.info('已重置查询条件'); };
    const changeTab = (key) => { setActiveTab(key); setPage(1); syncLocation(applied, key, 1); };
    const retry = () => { setError(false); setLoading(true); window.setTimeout(() => setLoading(false), 180); };
    const persistRecords = (items) => {
      if (!source.persistenceKey) return;
      try { window.localStorage.setItem(source.persistenceKey, JSON.stringify(items)); } catch (_) { /* local demo persistence is best effort */ }
    };
    const runStatusTransition = (action, record) => {
      const allowed = Array.isArray(action.from) ? action.from.includes(record.status) : action.from == null || record.status === action.from;
      if (!allowed) { message.warning(action.unavailableMessage || '当前状态不可执行此操作'); return; }
      const interpolate = (value) => safe(value).replace(/\{id\}/g, safe(record.id));
      const applyTransition = () => {
        setRecords((current) => { const next = current.map((item) => item.id === record.id ? { ...item, status: action.to || item.status, ...(action.toLabel ? { statusLabel: action.toLabel } : {}) } : item); persistRecords(next); return next; });
        message.success(action.successMessage || '操作成功');
      };
      if (action.confirmTitle || action.confirmContent) {
        const confirmTone = action.confirmTone || (action.type === 'status-transition' ? 'danger' : 'primary');
        Modal.confirm({
          className: 'yipex-confirm-modal',
          title: interpolate(action.confirmTitle || action.label || '确认操作'),
          content: interpolate(action.confirmContent || '确认执行此操作？'),
          okText: action.confirmOkText || '确认',
          cancelText: action.confirmCancelText || '取消',
          okButtonProps: confirmTone === 'danger' ? { danger: true } : { className: 'yipex-confirm-primary' },
          cancelButtonProps: { className: 'yipex-confirm-cancel' },
          onOk: applyTransition
        });
      }
      else applyTransition();
    };
    const runRowAction = (action, record) => {
      if (action.type === 'detail') {
        if (detailPresentation === 'page' && (action.href || source.detailPageHref)) {
          const target = new URL((action.href || source.detailPageHref).replace(/\{id\}/g, encodeURIComponent(safe(record.id))), window.location.href);
          if (action.preserveQuery !== false) target.searchParams.set(action.returnParam || 'return', window.location.href);
          window.location.href = target.href;
        } else setDrawerRecord(record);
      }
      else if (action.type === 'edit') { setEditingRecord(record); setCreateValues(record); setCreateOpen(true); }
      else if (action.type === 'status-transition') runStatusTransition(action, record);
      else if (action.href) {
        const target = new URL(action.href.replace(/\{id\}/g, encodeURIComponent(safe(record.id))), window.location.href);
        if (action.preserveQuery) target.searchParams.set(action.returnParam || 'return', window.location.href);
        window.location.href = target.href;
      }
    };
    const submitCreate = () => {
      const fields = source.createFields || [];
      const missing = fields.find((field) => field.required && (createValues[field.key] == null || String(createValues[field.key]).trim() === ''));
      if (missing) { message.warning(missing.requiredMessage || ('请填写' + missing.label)); return; }
      const normalizedValues = { ...createValues };
      for (const field of fields) {
        const value = createValues[field.key];
        if (value == null || value === '') continue;
        if (field.type === 'number' || field.type === 'amount') {
          const numberValue = Number(value);
          if (!Number.isFinite(numberValue)) { message.warning(field.invalidMessage || ('请输入有效的' + field.label)); return; }
          const validation = field.validation || {};
          if (validation.min !== undefined && numberValue < validation.min) { message.warning(validation.minMessage || (field.label + '不能小于 ' + validation.min)); return; }
          if (validation.max !== undefined && numberValue > validation.max) { message.warning(validation.maxMessage || (field.label + '不能大于 ' + validation.max)); return; }
          normalizedValues[field.key] = numberValue;
        }
        const option = (field.options || []).find((item) => item.value === value);
        if (option) normalizedValues[field.labelKey || (field.key + 'Label')] = option.label;
      }
      const createConfig = source.create || {};
      for (const [key, definition] of Object.entries(createConfig.derived || {})) {
        const value = normalizedValues[definition.sourceKey];
        if (value != null && definition.map && definition.map[value] != null) normalizedValues[key] = definition.map[value];
      }
      const now = new Date();
      const timestampField = createConfig.timestampField || 'createdAt';
      const timestamp = now.toISOString().slice(0, 16).replace('T', ' ');
      if (editingRecord) {
        const updated = { ...editingRecord, ...normalizedValues, id: editingRecord.id };
        setRecords((current) => { const next = orderRecords(current.map((item) => item.id === editingRecord.id ? updated : item)); if (source.persistenceKey) window.localStorage.setItem(source.persistenceKey, JSON.stringify(next.filter((item) => !source.records?.some((base) => base.id === item.id)))); return next; });
        setCreateValues({}); setEditingRecord(null); setCreateOpen(false); message.success(createConfig.editSuccessMessage || source.editSuccessMessage || '记录已更新'); return;
      }
      const prefix = createConfig.idPrefix || source.createIdPrefix || 'REC';
      const id = createValues.id || prefix + now.getTime().toString().slice(-10);
      const record = { ...(createConfig.defaults || {}), ...normalizedValues, id, ...(createConfig.idField || source.createIdField ? { [createConfig.idField || source.createIdField]: id } : {}), [timestampField]: timestamp };
      setRecords((current) => { const next = orderRecords([record, ...current]); if (source.persistenceKey) window.localStorage.setItem(source.persistenceKey, JSON.stringify(next.filter((item) => !source.records?.some((base) => base.id === item.id)))); return next; }); setCreateValues({}); setCreateOpen(false); setPage(1); message.success(createConfig.successMessage || source.createSuccessMessage || '记录已新增');
    };
    const activeTabDef = tabDefs.find((tab) => tab.key === activeTab);
    const filtered = records.filter((record) => {
      const tabMatches = !activeTabDef || activeTabDef.value === 'ALL' || record[activeTabDef.filterKey || 'status'] === activeTabDef.value;
      return tabMatches && filterDefs.every((definition) => {
      const value = applied[definition.key];
      if (value == null || value === '' || value === 'ALL' || (Array.isArray(value) && value.length === 0)) return true;
      if (definition.type === 'date-range') {
        const [start, end] = Array.isArray(value) ? value : [];
        const recordValue = safe(record[definition.recordKey || definition.key]);
        return (!start || recordValue >= start) && (!end || recordValue <= end);
      }
      const recordValue = safe(record[definition.recordKey || definition.key]);
      const compareValue = Array.isArray(definition.matchKeys)
        ? definition.matchKeys.map((key) => safe(record[key])).join(' ')
        : definition.matchKey ? safe(record[definition.matchKey]) : recordValue;
      return compareValue.toLowerCase().includes(safe(value).toLowerCase());
      });
    });
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
    const tableColumns = columnDefs.map((column) => ({
      title: column.displayLabel || column.label || column.key,
      dataIndex: column.key,
      key: column.key,
      width: column.width || (isActionColumn(column) ? 96 : undefined),
      fixed: column.fixed || (isActionColumn(column) ? 'right' : undefined),
      align: column.format === 'amount' || column.format === 'currency' || column.format === 'integer' ? 'right' : 'left',
      render: (value, record) => {
        const actions = actionDefinitions(column);
        if (!actions.length) return formatCell(value, record, column);
        return h('div', { className: 'standard-row-actions' }, actions.map((action) => h(Button, { key: action.id || action.type || action.label, type: 'link', className: 'standard-row-action' + (action.type === 'status-transition' ? ' standard-cancel-action' : ''), disabled: action.from != null && (Array.isArray(action.from) ? !action.from.includes(record.status) : record.status !== action.from), onClick: (event) => { event.stopPropagation(); runRowAction(action, record); } }, action.label || action.type)));
      }
    }));
    const exportRows = selectedKeys.length ? records.filter((record) => selectedKeys.includes(record.id)) : filtered;
    const exportCsv = () => {
      if (!supportsExport) return;
      const exportColumns = columnDefs.filter((column) => !actionDefinitions(column).length);
      const header = exportColumns.map((column) => column.displayLabel || column.label || column.key).join(',');
      const lines = exportRows.map((record) => exportColumns.map((column) => { const value = safe(record[column.key]).replace(/"/g, '""'); return '"' + value + '"'; }).join(','));
      const blob = new Blob(['\\ufeff' + [header, ...lines].join('\\n')], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = (payload.props.exportFileName || payload.pageName || 'yipex-export') + '.csv'; link.click(); URL.revokeObjectURL(link.href);
      message.success('已导出 ' + exportRows.length + ' 条记录');
    };
    if (initial['permission-denied']) return h(Result, { status: '403', title: '暂无访问权限', subTitle: '请联系管理员开通当前页面的访问权限。' });
    if (error) return h(Result, { status: 'error', title: '查询失败', subTitle: '演示数据暂时无法读取，请重试。', extra: h(Button, { type: 'primary', onClick: retry }, '重新查询') });
    const filterNodes = filterDefs.map((definition) => {
      const value = draft[definition.key] || '';
      let control;
      if (definition.type === 'select') control = h(Select, { key: definition.id || definition.key, value: value || undefined, allowClear: true, placeholder: definition.placeholder || '请选择', options: (definition.options || []).map((option) => ({ label: option.label, value: option.value })), onChange: (next) => updateDraft(definition.key, next) });
      else if (definition.type === 'date-range' && supportsDateRange && DatePicker?.RangePicker) control = h(DatePicker.RangePicker, { key: definition.id || definition.key, value: Array.isArray(value) ? value.map((item) => item ? dayjs(item) : null) : undefined, allowEmpty: [true, true], allowClear: true, placeholder: definition.placeholder || ['开始日期', '结束日期'], format: definition.format || 'YYYY-MM-DD', onChange: (dates) => updateDraft(definition.key, dates ? dates.map((item) => item ? item.format('YYYY-MM-DD') : '') : []) });
      else control = h(Input, { key: definition.id || definition.key, value: Array.isArray(value) ? '' : value, allowClear: true, placeholder: definition.placeholder || '请输入', onChange: (event) => updateDraft(definition.key, event.target.value) });
      return h('label', { key: definition.id || definition.key, className: 'standard-query-field' }, [h('span', { key: 'label' }, (definition.label || definition.key) + '：'), control]);
    });
    const actionGridStyle = {
      '--standard-action-row-desktop': Math.ceil((filterDefs.length + 1) / 4),
      '--standard-action-row-tablet': Math.ceil((filterDefs.length + 1) / 2),
      '--standard-action-row-narrow': filterDefs.length + 1
    };
    const filterPanel = h('section', { className: 'standard-query-filter-panel', 'aria-label': '查询条件' }, h('div', { className: 'standard-query-grid' }, [filterNodes, h('div', { key: 'actions', className: 'standard-query-actions', style: actionGridStyle }, [h(Button, { key: 'reset', onClick: reset }, '重置'), h(Button, { key: 'query', type: 'primary', onClick: apply }, '查询')])]));
    const tabsNode = tabDefs.length ? h(Tabs, { key: 'tabs', activeKey: activeTab, items: tabDefs.map((tab) => ({ key: tab.key, label: tab.label })), onChange: changeTab, className: 'standard-query-tabs' }) : null;
    const rowSelection = supportsSelection ? { selectedRowKeys: selectedKeys, onChange: (keys) => setSelectedKeys(keys) } : undefined;
    const detailFields = detailFieldDefs;
    const detailColumnCount = window.innerWidth <= 680 ? 1 : Number(source.detailColumns || 2);
    const detailOverlayMode = detailPresentation === 'drawer' ? 'drawer' : 'modal';
    const detailTitle = drawerRecord ? (drawerRecord.name || drawerRecord.id || '详情') : '详情';
    const detailBody = drawerRecord ? h(Descriptions, { className: 'standard-detail-descriptions', bordered: false, column: detailColumnCount, size: 'middle' }, detailFields.map((field) => h(Descriptions.Item, { key: field.key, label: field.displayLabel || field.label, span: field.span === 'full' ? detailColumnCount : 1 }, formatCell(drawerRecord[field.key], drawerRecord, field)))) : null;
    const detailFooter = h('div', { className: 'standard-detail-overlay-footer' }, h(Button, { onClick: () => setDrawerRecord(null) }, '关闭'));
    const detailOverlay = supportsDetail ? detailOverlayMode === 'drawer'
      ? h(Drawer, { className: 'standard-detail-drawer', title: detailTitle, open: Boolean(drawerRecord), placement: 'right', size: detailDrawerSize, width: window.innerWidth <= 680 ? 'calc(100vw - 16px)' : undefined, onClose: () => setDrawerRecord(null), footer: detailFooter }, detailBody)
      : h(Modal, { className: 'standard-detail-modal', title: detailTitle, open: Boolean(drawerRecord), width: window.innerWidth <= 680 ? 'calc(100vw - 32px)' : 720, onCancel: () => setDrawerRecord(null), footer: detailFooter, centered: true, destroyOnHidden: true }, detailBody)
      : null;
    const renderCreateField = (field) => {
      const value = createValues[field.key] || '';
      const update = (next) => setCreateValues((current) => ({ ...current, [field.key]: next }));
      let control;
      if (field.type === 'select') control = h(Select, { value: value || undefined, placeholder: field.placeholder, options: (field.options || []).map((option) => ({ label: option.label, value: option.value })), onChange: update });
      else if (field.type === 'radio' || field.type === 'radio-group') control = h(Radio.Group, { value: value || undefined, onChange: (event) => update(event.target.value) }, h('div', { className: 'standard-create-radio-list' }, (field.options || []).map((option) => h(Radio, { key: option.value, value: option.value, className: 'standard-create-radio-option' }, h('span', { className: 'standard-create-radio-copy' }, [h('strong', { key: 'label' }, option.label), option.description ? h('small', { key: 'description' }, option.description) : null])))));
      else if (field.type === 'textarea') control = h(Input.TextArea, { value, rows: 3, placeholder: field.placeholder, onChange: (event) => update(event.target.value) });
      else control = h(Input, { value, type: field.type === 'number' ? 'number' : 'text', placeholder: field.placeholder, onChange: (event) => update(event.target.value) });
      return h('label', { key: field.key, className: 'standard-create-field' }, [h('span', { key: 'label' }, field.label + (field.required ? '：' : '：')), control]);
    };
    const createFieldDefs = supportsCreate ? (source.createFields || []) : [];
    const createSections = Array.isArray(source.createSections) ? source.createSections : [];
    const groupedFieldKeys = new Set(createSections.flatMap((section) => section.fieldKeys || []));
    const ungroupedFields = createFieldDefs.filter((field) => !groupedFieldKeys.has(field.key));
    const openCreate = () => { setEditingRecord(null); setCreateValues({}); setCreateOpen(true); };
    const closeCreate = () => { setCreateOpen(false); setCreateValues({}); setEditingRecord(null); };
    const createFooter = h('div', { className: 'standard-drawer-footer' }, [h(Button, { key: 'cancel', onClick: closeCreate }, '取消'), h(Button, { key: 'submit', type: 'primary', onClick: submitCreate }, editingRecord ? '保存' : '提交')]);
    const createBody = createSections.length
      ? h('div', { className: 'standard-create-sections' }, [
          ...createSections.map((section) => h('section', { key: section.id || section.title, className: 'standard-create-section', 'aria-label': section.title }, [
            h('h3', { key: 'title' }, section.title),
            h('div', { key: 'fields', className: 'standard-create-form' }, createFieldDefs.filter((field) => (section.fieldKeys || []).includes(field.key)).map(renderCreateField))
          ])),
          ungroupedFields.length ? h('div', { key: 'ungrouped', className: 'standard-create-form' }, ungroupedFields.map(renderCreateField)) : null
        ])
      : h('div', { className: 'standard-create-form' }, createFieldDefs.map(renderCreateField));
    const createOverlay = supportsCreate
      ? createPresentation === 'drawer'
        ? h(Drawer, { className: 'standard-create-drawer', title: editingRecord ? (source.editLabel || '编辑记录') : (payload.props.createLabel || '新增记录'), open: createOpen, placement: 'right', size: createDrawerSize, width: window.innerWidth <= 680 ? 'calc(100vw - 16px)' : undefined, onClose: closeCreate, footer: createFooter }, createBody)
        : h(Modal, { className: 'standard-create-modal', title: editingRecord ? (source.editLabel || '编辑记录') : (payload.props.createLabel || '新增记录'), open: createOpen, width: window.innerWidth <= 680 ? 'calc(100vw - 32px)' : 720, onCancel: closeCreate, footer: createFooter, centered: true, destroyOnHidden: true }, createBody)
      : null;
    const resultTitle = h('div', { className: 'standard-result-title' }, [h('h2', { key: 'title' }, payload.props.resultTitle || '查询列表'), h('span', { key: 'count', className: 'standard-result-count', 'aria-live': 'polite' }, '共 ' + filtered.length + ' 条')]);
    const summaryMetrics = supportsSummary && Array.isArray(source.metrics) ? h('div', { key: 'metrics', className: 'standard-query-metrics' }, source.metrics.map((metric) => h(Card, { key: metric.id || metric.label, className: 'standard-query-metric', bordered: false }, h(Statistic, { title: metric.displayLabel || metric.label, value: metric.value, precision: metric.format === 'currency' || metric.format === 'amount' ? 2 : undefined })))) : null;
    const resultActions = [supportsCreatePage ? h(Button, { key: 'create-page', type: 'primary', onClick: () => { window.location.href = source.createPageHref; } }, payload.props.createLabel || '新增记录') : null, supportsCreate ? h(Button, { key: 'create', type: 'primary', onClick: openCreate }, payload.props.createLabel || '新增记录') : null, supportsExport ? h(Button, { key: 'export', onClick: exportCsv }, (payload.props.exportLabel || '导出') + (selectedKeys.length ? ' (' + selectedKeys.length + ')' : '')) : null].filter(Boolean);
    const resultExtra = resultActions.length ? h('div', { className: 'standard-result-actions' }, resultActions) : null;
    const resultPanel = h('section', { className: 'standard-result-panel', 'aria-label': payload.props.resultTitle || '查询列表' }, [h('div', { key: 'header', className: 'standard-result-header' }, [resultTitle, resultExtra]), h(Table, { key: 'table', rowKey: (record) => record.id || JSON.stringify(record), rowSelection, columns: tableColumns, dataSource: visible, loading, pagination: false, size: 'middle', scroll: { x: Math.max(720, tableColumns.length * 140) }, onRow: supportsDetail && detailPresentation !== 'page' ? (record) => ({ onClick: () => setDrawerRecord(record), className: 'standard-query-clickable-row' }) : undefined, locale: { emptyText: h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: '暂无数据' }) } }), h('div', { key: 'footer', className: 'standard-query-pagination' }, [h('span', { key: 'summary' }, filtered.length ? '显示 ' + ((page - 1) * pageSize + 1) + '-' + Math.min(page * pageSize, filtered.length) + ' 条，共 ' + filtered.length + ' 条' : '显示 0 条，共 0 条'), h(Pagination, { key: 'pagination', current: page, pageSize, total: filtered.length, showSizeChanger: false, showTotal: false, onChange: (nextPage) => { setPage(nextPage); syncLocation(applied, activeTab, nextPage); } })]), detailOverlay, createOverlay]);
    return h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { fontFamily: 'Roboto, "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 14, fontSizeSM: 12, fontSizeLG: 16, fontSizeXL: 20, lineHeight: 22 / 14, lineHeightSM: 20 / 12, lineHeightLG: 24 / 16, fontWeightStrong: 500, borderRadius: 8, controlHeight: 32, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' } } }, h('div', { className: 'standard-query-page' }, [h('header', { key: 'header', className: 'standard-query-header' }, [h('div', { key: 'titleWrap' }, [h('div', { key: 'titleRow', className: 'standard-query-title-row' }, h('h1', { key: 'title' }, payload.props.title || payload.pageName)), payload.props.subtitle ? h('p', { key: 'subtitle' }, payload.props.subtitle) : null])]), tabsNode, summaryMetrics, filterPanel, resultPanel]));
  }
  ReactDOM.createRoot(document.getElementById('yipex-standard-query-table-app')).render(h(App));
})();
  `;
  const pageCss = `
    .yipex-confirm-modal .yipex-confirm-primary{background:#222222;border-color:#222222;color:#FFFFFF;box-shadow:0 2px 0 rgba(0,0,0,.04)}.yipex-confirm-modal .yipex-confirm-primary:hover,.yipex-confirm-modal .yipex-confirm-primary:focus{background:#3A3A3A;border-color:#3A3A3A;color:#FFFFFF}.yipex-confirm-modal .yipex-confirm-cancel{border-color:#D9D9D9!important;color:#222222!important;background:#FFFFFF!important;box-shadow:none}.yipex-confirm-modal .yipex-confirm-cancel:hover{border-color:#D9D9D9!important;color:#222222!important;background:#F5F5F5!important}.yipex-confirm-modal .yipex-confirm-cancel:focus,.yipex-confirm-modal .yipex-confirm-cancel:focus-visible{border-color:#D9D9D9!important;color:#222222!important;background:#FFFFFF!important;box-shadow:none}
    .standard-query-page{width:100%;min-width:0;margin:0;letter-spacing:0}.standard-query-header{margin-bottom:16px}.standard-query-title-row{display:flex;align-items:center}.standard-query-title-row h1{margin:0;color:#222;font-size:20px;font-weight:500;line-height:28px}.standard-query-header p{margin:6px 0 0;color:rgba(0,0,0,.58);font-size:14px;font-weight:400;line-height:22px}.standard-query-filter-panel{margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #E7E8E8}.standard-query-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:20px}.standard-query-metric{border:0!important;box-shadow:none!important;background:#fafafa}.standard-query-metric .ant-card-body{padding:16px}.standard-query-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:end}.standard-query-field{display:flex;min-width:0;flex-direction:column;gap:6px;color:rgba(0,0,0,.85);font-size:14px;font-weight:400;line-height:22px}.standard-query-field>span:first-child{font-weight:400}.standard-query-field .ant-input,.standard-query-field .ant-select,.standard-query-field .ant-picker{width:100%}.standard-query-actions{grid-column:4;grid-row:var(--standard-action-row-desktop);display:flex;justify-content:flex-end;gap:8px}.standard-result-panel{margin-bottom:16px}.standard-result-header{min-height:32px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:16px}.standard-result-title{display:flex;align-items:baseline;gap:8px}.standard-result-title h2{margin:0;font-size:16px;font-weight:500;line-height:24px}.standard-result-count{color:rgba(0,0,0,.42);font-size:12px;font-weight:400;line-height:20px}.standard-result-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px}.standard-result-panel .ant-table-thead>tr>th{font-weight:500;line-height:22px}.standard-result-panel .ant-table-tbody>tr>td,.standard-result-panel .ant-table-tbody .ant-btn{font-size:14px;font-weight:400;line-height:22px}.standard-result-panel .standard-row-action.ant-btn-link{padding-inline:0}.standard-row-actions{display:flex;align-items:center;gap:8px;white-space:nowrap}.standard-cancel-action.ant-btn-link:disabled{color:rgba(0,0,0,.25)}.standard-query-pagination{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:16px;color:rgba(0,0,0,.58);font-size:12px;font-weight:400;line-height:20px}.standard-query-pagination .ant-pagination{margin-left:auto}.standard-query-clickable-row{cursor:pointer}.standard-query-clickable-row:hover>td{background:#FAFAFA!important}.standard-detail-drawer .ant-drawer-header-title,.standard-create-drawer .ant-drawer-header-title{display:flex;align-items:center;width:100%}.standard-detail-drawer .ant-drawer-title,.standard-create-drawer .ant-drawer-title{order:1;flex:1;min-width:0}.standard-detail-drawer .ant-drawer-close,.standard-create-drawer .ant-drawer-close{order:2;margin-inline:16px 0}.standard-detail-overlay-footer,.standard-drawer-footer{display:flex;justify-content:flex-end;gap:8px}.standard-create-sections{display:flex;flex-direction:column;gap:20px}.standard-create-section+.standard-create-section{padding-top:20px;border-top:1px solid #E7E8E8}.standard-create-section h3{margin:0 0 12px;color:#222;font-size:14px;font-weight:500;line-height:22px}.standard-create-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.standard-create-field{display:flex;min-width:0;flex-direction:column;gap:6px;color:rgba(0,0,0,.85);font-size:14px;line-height:22px}.standard-create-field:nth-last-child(1){grid-column:1/-1}.standard-create-sections .standard-create-field:nth-last-child(1){grid-column:auto}.standard-create-field .ant-input,.standard-create-field .ant-select{width:100%}.standard-create-radio-list{display:flex;flex-direction:column;gap:10px}.standard-create-radio-option{display:flex;align-items:flex-start;margin-inline:0;padding:10px 12px;border:1px solid #e7e8e8;border-radius:6px}.standard-create-radio-option .ant-radio{margin-top:2px}.standard-create-radio-copy{display:flex;flex-direction:column;gap:2px;line-height:20px}.standard-create-radio-copy strong{font-weight:500}.standard-create-radio-copy small{color:rgba(0,0,0,.58);font-size:12px;line-height:18px}@media(max-width:900px){.standard-query-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.standard-query-actions{grid-column:2;grid-row:var(--standard-action-row-tablet)}.standard-query-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.standard-create-form{grid-template-columns:1fr}.standard-create-field:nth-last-child(1){grid-column:auto}.standard-query-grid{grid-template-columns:1fr}.standard-query-metrics{grid-template-columns:1fr}.standard-query-actions{grid-column:1;grid-row:var(--standard-action-row-narrow);justify-content:flex-end}.standard-result-header{align-items:flex-start}.standard-query-pagination{align-items:flex-start;flex-direction:column}.standard-query-pagination .ant-pagination{margin-left:0;align-self:flex-end}}
  `;
  const runtimeAssets = ['react.production.min.js', 'react-dom.production.min.js', 'dayjs.min.js', 'dayjs-zh-cn.js', 'antd.min.js', 'ant-design-icons.umd.js'];
  const preloads = runtimeAssets.map((asset) => `<link rel="preload" as="script" href="${vendorPath(asset)}">`).join('');
  const scripts = runtimeAssets.map((asset) => `<script defer src="${vendorPath(asset)}"><\/script>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${vendorPath('antd-reset.css')}">${preloads}<title>${escape(metadata.pageName)} | YiPex</title><style>${shellCss}${pageCss}</style></head><body>${body}<script id="yipex-standard-query-table-data" type="application/json">${embedded}</script>${scripts}<script>${shellRuntime}</script><script>(() => { const start = () => { if (window.React && window.ReactDOM && window.antd && window.dayjs) { ${appScript} } else { window.requestAnimationFrame(start); } }; start(); })();</script></body></html>`;
}
