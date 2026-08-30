function queryTableScaffold({ capabilities = [] } = {}) {
  const enabled = new Set(capabilities);
  const supportsSummary = enabled.has('summary.metrics') || enabled.has('summary.aggregate');
  const supportsDetail = enabled.has('detail.overlay');
  const supportsDateRange = enabled.has('query.dateRange');
  const supportsSelection = enabled.has('table.selection');
  const supportsExport = enabled.has('table.export');
  const supportsFormOverlay = enabled.has('form.overlay');
  const regions = [
    { id: 'page-header', role: 'page-header', purpose: '标识当前查询任务' },
    { id: 'query-region', role: 'query-controls', purpose: '按业务条件筛选记录' }
  ];
  const children = [
    { id: 'page-header', type: 'page-header', label: '查询列表' },
    {
      id: 'query-region',
      type: 'query-form',
      children: [
        { id: 'keyword-filter', type: 'input', label: '关键词', props: { placeholder: '请输入关键词' }, events: { change: 'editFilters' } },
        { id: 'status-filter', type: 'select', label: '状态', events: { change: 'editFilters' } },
        ...(supportsDateRange ? [{ id: 'date-range-filter', type: 'date-range', label: '日期范围', events: { change: 'editFilters' } }] : []),
        { id: 'reset-query', type: 'button', label: '重置', events: { click: 'resetQuery' } },
        { id: 'submit-query', type: 'button', label: '查询', props: { buttonType: 'primary', htmlType: 'submit' }, events: { click: 'submitQuery' } }
      ]
    }
  ];
  if (supportsSummary) {
    regions.push({ id: 'summary-region', role: 'summary', purpose: '汇总当前查询范围的关键指标' });
    children.push({ id: 'summary-region', type: 'metrics', label: '查询汇总' });
  }
  regions.push({ id: 'result-region', role: 'result-list', purpose: '展示筛选结果并分页浏览' });
  children.push({
    id: 'result-region',
    type: 'data-table',
    label: '查询结果',
    props: { rowSelection: supportsSelection },
    children: supportsExport ? [{ id: 'export-results', type: 'button', label: '导出', events: { click: 'exportResults' } }] : [],
    events: { pageChange: 'paginateResults', ...(supportsSelection ? { selectionChange: 'selectRows' } : {}), ...(supportsDetail ? { rowClick: 'openDetail' } : {}) }
  });
  if (supportsDetail) {
    regions.push({ id: 'detail-overlay-region', role: 'detail-overlay', purpose: '在列表上下文中查看记录详情' });
    children.push({ id: 'detail-overlay-region', type: 'detail-overlay', label: '记录详情', events: { close: 'closeDetail' } });
  }
  if (supportsFormOverlay) {
    regions.push({ id: 'form-overlay-region', role: 'form-overlay', purpose: '在列表上下文中新增或编辑简单记录' });
    children.push({ id: 'form-overlay-region', type: 'form-overlay', label: '新增或编辑记录', events: { close: 'closeFormOverlay', submit: 'submitFormOverlay' } });
  }
  return {
    pageName: '查询列表',
    density: 'compact',
    regions,
    hierarchy: { primary: '按条件定位并处理业务记录', secondary: supportsSummary ? ['查看当前范围汇总指标'] : [] },
    operations: {
      primary: { id: 'submit-query', label: '查询', placement: '查询条件区末列', outcome: '按当前条件筛选结果并回到第一页' },
      secondary: [
        { id: 'reset-query', label: '重置', placement: '查询按钮左侧', outcome: '清空条件并恢复默认结果' },
        ...(supportsExport ? [{ id: 'export-results', label: '导出', placement: '列表标题工具区', outcome: '导出已选记录或当前查询结果' }] : [])
      ]
    },
    stateCoverage: ['loading', 'empty', 'error', 'permission-denied'],
    responsive: { desktop: '查询条件使用网格，结果表格完整展示并保留分页。', narrow: '查询条件改为单列，结果表格保留横向滚动和分页操作。' },
    root: { id: 'page-root', type: 'standard-query-table-page', props: { title: '查询列表', resultTitle: '查询结果' }, children },
    data: {
      demo: true,
      filters: [
        { id: 'keyword', key: 'id', label: '关键词', type: 'text', placeholder: '请输入编号或名称' },
        { id: 'status', key: 'status', label: '状态', type: 'select', options: [{ value: 'ALL', label: '全部状态' }, { value: 'ACTIVE', label: '启用' }, { value: 'INACTIVE', label: '停用' }] },
        ...(supportsDateRange ? [{ id: 'created-range', key: 'createdRange', recordKey: 'createdAt', label: '日期范围', type: 'date-range', placeholder: ['开始日期', '结束日期'] }] : [])
      ],
      metrics: [{ id: 'total', label: '记录总数', value: 2, unit: '条' }, { id: 'active', label: '启用记录', value: 1, unit: '条' }],
      columns: [{ key: 'id', label: '编号' }, { key: 'name', label: '名称' }, { key: 'status', label: '状态', format: 'status' }, { key: 'updatedAt', label: '更新时间' }],
      detailFields: [{ key: 'id', label: '编号' }, { key: 'name', label: '名称' }, { key: 'status', label: '状态', format: 'status' }, { key: 'updatedAt', label: '更新时间' }],
      records: [
        { id: 'DEMO-001', name: '示例记录一', status: 'ACTIVE', statusLabel: '启用', updatedAt: '2026-08-30 09:00' },
        { id: 'DEMO-002', name: '示例记录二', status: 'INACTIVE', statusLabel: '停用', updatedAt: '2026-08-29 16:20' }
      ],
      pageSize: 10
    },
    states: { loading: false, empty: false, error: false, 'permission-denied': false, success: false, filters: {} },
    interactions: [
      { id: 'editFilters', source: 'query-region', event: 'change', outcome: '更新待提交查询条件' },
      { id: 'submitQuery', source: 'submit-query', event: 'click', outcome: '按当前条件刷新结果并回到第一页' },
      { id: 'resetQuery', source: 'reset-query', event: 'click', outcome: '清空查询条件并恢复默认结果' },
      { id: 'paginateResults', source: 'result-region', event: 'pageChange', outcome: '切换结果页码' },
      ...(supportsSelection ? [{ id: 'selectRows', source: 'result-region', event: 'selectionChange', outcome: '更新已选记录' }] : []),
      ...(supportsExport ? [{ id: 'exportResults', source: 'export-results', event: 'click', outcome: '导出已选记录或当前查询结果' }] : []),
      ...(supportsDetail ? [{ id: 'openDetail', source: 'result-region', event: 'rowClick', outcome: '按详情字段数量打开 Modal 或 Drawer，超过 16 项进入独立详情页' }, { id: 'closeDetail', source: 'detail-overlay-region', event: 'close', outcome: '关闭记录详情并保留列表上下文' }] : []),
      ...(supportsFormOverlay ? [{ id: 'openFormOverlay', source: 'result-region', event: 'action', outcome: '按录入字段数量打开 Modal 或 Drawer，超过 16 项进入独立表单页' }, { id: 'closeFormOverlay', source: 'form-overlay-region', event: 'close', outcome: '关闭新增或编辑浮层并保留列表上下文' }, { id: 'submitFormOverlay', source: 'form-overlay-region', event: 'submit', outcome: '校验并保存新增或编辑记录' }] : [])
    ]
  };
}

function groupedFormScaffold() {
  return {
    pageName: '分组表单',
    density: 'standard',
    regions: [{ id: 'form-region', role: 'form', purpose: '分组填写业务信息' }, { id: 'form-actions', role: 'action', purpose: '取消或提交当前表单' }],
    hierarchy: { primary: '完成业务信息填写并提交', secondary: ['按业务主题分组核对字段'] },
    operations: {
      primary: { id: 'submit-form', label: '保存', placement: '表单底部右侧', outcome: '校验并保存当前表单' },
      secondary: [{ id: 'cancel-form', label: '取消', placement: '保存按钮左侧', outcome: '放弃当前修改' }]
    },
    stateCoverage: ['loading', 'submitting', 'error', 'success', 'permission-denied'],
    responsive: { desktop: '表单按业务主题分组，字段使用多列网格，操作区位于内容底部。', narrow: '字段改为单列，操作区保持清晰可见。' },
    root: {
      id: 'page-root', type: 'standard-grouped-form-page', props: { title: '分组表单', primaryActionLabel: '保存', secondaryActionLabel: '取消' },
      children: [
        { id: 'form-region', type: 'form', label: '业务表单', children: [{ id: 'basic-section', type: 'form-section', label: '基础信息' }, { id: 'additional-section', type: 'form-section', label: '补充信息' }] },
        { id: 'form-actions', type: 'action', children: [{ id: 'cancel-form', type: 'button', label: '取消', events: { click: 'cancelForm' } }, { id: 'submit-form', type: 'button', label: '保存', events: { click: 'submitForm' } }] }
      ]
    },
    data: {
      demo: true,
      sections: [
        { id: 'basic', title: '基础信息', fields: [{ key: 'name', label: '名称', required: true, placeholder: '请输入名称' }, { key: 'type', label: '类型', type: 'select', required: true, options: [{ value: 'STANDARD', label: '标准' }, { value: 'CUSTOM', label: '自定义' }] }] },
        { id: 'additional', title: '补充信息', fields: [{ key: 'remark', label: '备注', type: 'textarea', span: 'full', maxLength: 200, placeholder: '请输入备注' }] }
      ],
      initialValues: {},
      demoSubmission: { mode: 'success', latencyMs: 500, successMessage: '保存成功' }
    },
    states: { loading: false, submitting: false, error: false, success: false, 'permission-denied': false },
    interactions: [{ id: 'cancelForm', source: 'cancel-form', event: 'click', outcome: '取消当前修改' }, { id: 'submitForm', source: 'submit-form', event: 'click', outcome: '校验并保存当前表单' }]
  };
}

function steppedFormScaffold() {
  return {
    pageName: '分步表单',
    density: 'standard',
    regions: [{ id: 'steps-region', role: 'form', purpose: '按步骤填写当前业务信息' }, { id: 'step-actions', role: 'action', purpose: '在步骤间导航并提交' }],
    hierarchy: { primary: '按顺序完成各步骤并提交', secondary: ['逐步校验当前阶段信息'] },
    operations: {
      primary: { id: 'submit-step-form', label: '提交', placement: '最后一步底部右侧', outcome: '校验并提交全部步骤' },
      secondary: [{ id: 'previous-step', label: '上一步', placement: '步骤操作区左侧', outcome: '返回上一个填写步骤' }]
    },
    stateCoverage: ['loading', 'submitting', 'error', 'success', 'permission-denied'],
    responsive: { desktop: '步骤条横向展示，当前步骤字段使用多列网格。', narrow: '步骤条压缩展示，字段改为单列，操作区保持可见。' },
    root: {
      id: 'page-root', type: 'standard-stepped-form-page', props: { title: '分步表单', primaryActionLabel: '提交', secondaryActionLabel: '重置' },
      children: [
        { id: 'steps-region', type: 'steps-form', label: '分步表单' },
        { id: 'step-actions', type: 'action', children: [{ id: 'previous-step', type: 'button', label: '上一步', events: { click: 'previousStep' } }, { id: 'submit-step-form', type: 'button', label: '提交', events: { click: 'submitStepForm' } }] }
      ]
    },
    data: {
      demo: true,
      steps: [
        { id: 'basic', title: '基础信息', description: '填写基础信息', fields: [{ key: 'name', label: '名称', required: true, placeholder: '请输入名称' }] },
        { id: 'confirm', title: '确认提交', description: '核对并提交', fields: [{ key: 'remark', label: '备注', type: 'textarea', span: 'full' }] }
      ],
      initialValues: {},
      demoSubmission: { mode: 'success', latencyMs: 500, successMessage: '提交成功' }
    },
    states: { loading: false, submitting: false, error: false, success: false, 'permission-denied': false },
    interactions: [{ id: 'previousStep', source: 'previous-step', event: 'click', outcome: '返回上一步' }, { id: 'submitStepForm', source: 'submit-step-form', event: 'click', outcome: '提交分步表单' }]
  };
}

function groupedDetailScaffold() {
  return {
    pageName: '分组详情',
    density: 'standard',
    regions: [{ id: 'detail-region', role: 'detail', purpose: '分组展示业务记录详情' }],
    hierarchy: { primary: '快速核对记录的完整信息', secondary: ['查看关键指标与关联信息'] },
    operations: { primary: null, secondary: [] },
    stateCoverage: ['loading', 'error', 'permission-denied'],
    responsive: { desktop: '指标使用多列布局，详情字段按主题分组并默认三列展示。', narrow: '指标和详情字段逐级减少到单列，长内容完整换行。' },
    root: { id: 'page-root', type: 'standard-grouped-detail-page', props: { title: '分组详情', status: 'ACTIVE', statusLabel: '启用' }, children: [{ id: 'detail-region', type: 'detail', label: '详情信息' }] },
    data: {
      demo: true,
      record: { id: 'DEMO-001', name: '示例记录', status: 'ACTIVE', statusLabel: '启用', owner: '示例用户', updatedAt: '2026-08-30 09:00' },
      metrics: [{ id: 'total', label: '累计数量', value: 128, format: 'integer', unit: '条' }, { id: 'recent', label: '近30日数量', value: 32, format: 'integer', unit: '条' }],
      sections: [
        { id: 'basic', title: '基础信息', fields: [{ key: 'id', label: '记录编号' }, { key: 'name', label: '名称' }, { key: 'status', label: '状态', format: 'status' }] },
        { id: 'other', title: '其他信息', fields: [{ key: 'owner', label: '负责人' }, { key: 'updatedAt', label: '更新时间' }] }
      ],
      relatedTables: []
    },
    states: { loading: false, error: false, 'permission-denied': false },
    interactions: []
  };
}

function resultWorkflowScaffold() {
  return {
    pageName: '处理结果',
    density: 'standard',
    regions: [{ id: 'result-content', role: 'result', purpose: '反馈处理状态和下一步操作' }],
    hierarchy: { primary: '明确说明处理结果和下一步操作', secondary: ['失败时提供可执行恢复路径'] },
    operations: { primary: { id: 'result-action', label: '返回', placement: '结果说明下方', outcome: '返回上一个业务页面' }, secondary: [] },
    stateCoverage: ['success', 'error', 'processing'],
    responsive: { desktop: '结果内容居中展示，操作按钮横向排列。', narrow: '结果内容保持居中，操作按钮允许换行。' },
    root: { id: 'page-root', type: 'standard-result-workflow-page', props: { title: '处理结果', defaultActionLabel: '返回' }, children: [{ id: 'result-content', type: 'result', label: '处理结果' }, { id: 'result-action', type: 'button', label: '返回', events: { click: 'resultAction' } }] },
    data: {
      status: 'success',
      success: { title: '操作成功', description: '演示操作已完成。', actions: [{ id: 'back', label: '返回', primary: true }] },
      error: { title: '操作失败', description: '请检查后重试。', actions: [{ id: 'retry', label: '重试', type: 'retry', primary: true }] },
      processing: { title: '处理中', description: '请稍候。', actions: [] },
      retryStatus: 'success',
      retryLatencyMs: 500
    },
    states: { success: true, error: false, processing: false },
    interactions: [{ id: 'resultAction', source: 'result-action', event: 'click', outcome: '返回上一个业务页面' }]
  };
}

function dashboardOverviewScaffold() {
  return {
    pageName: '经营概览',
    density: 'compact',
    regions: [{ id: 'metrics-region', role: 'metrics', purpose: '展示核心指标' }, { id: 'charts-region', role: 'chart', purpose: '展示趋势与分布分析' }],
    hierarchy: { primary: '快速掌握核心经营指标与变化趋势', secondary: ['比较业务分布'] },
    operations: { primary: null, secondary: [] },
    stateCoverage: ['loading', 'empty', 'error', 'permission-denied'],
    responsive: { desktop: '指标横向排列，趋势与分布并列展示。', narrow: '指标和分析区域改为单列，保留数值可读性。' },
    root: { id: 'page-root', type: 'standard-dashboard-overview-page', props: { title: '经营概览' }, children: [{ id: 'metrics-region', type: 'metrics', label: '核心指标' }, { id: 'charts-region', type: 'chart', label: '趋势与分布' }] },
    data: {
      metrics: [{ id: 'orders', label: '订单数', value: 128, unit: '笔' }, { id: 'amount', label: '交易金额', value: 4826, format: 'currency', unit: '元' }],
      trend: [{ label: '周一', value: 32 }, { label: '周二', value: 48 }, { label: '周三', value: 42 }],
      distribution: [{ label: '成功', value: 80, color: '#4AA52E' }, { label: '其他', value: 20, color: '#8C8C8C' }]
    },
    states: { loading: false, empty: false, error: false, 'permission-denied': false },
    interactions: []
  };
}

export { queryTableScaffold, groupedFormScaffold, steppedFormScaffold, groupedDetailScaffold, resultWorkflowScaffold, dashboardOverviewScaffold };
