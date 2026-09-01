const HOME_ITEM = Object.freeze({ id: 'home', label: '首页', icon: 'HomeOutlined' });

const genericPageNames = new Set([
  'YiPex 页面', '查询列表', '经营概览', '分组表单', '分步表单', '分组详情', '处理结果'
]);

const iconRules = [
  { keywords: ['商户', '店铺'], icon: 'ShopOutlined' },
  { keywords: ['员工', '人员', '用户', '客户'], icon: 'UserOutlined' },
  { keywords: ['订单'], icon: 'FileTextOutlined' },
  { keywords: ['钱包', '数币', '数字货币', '数字资产'], icon: 'WalletOutlined' },
  { keywords: ['收款账户', '账户'], icon: 'BankOutlined' },
  { keywords: ['仓库'], icon: 'HomeOutlined' },
  { keywords: ['商品', '产品'], icon: 'ShoppingOutlined' },
  { keywords: ['活动'], icon: 'CalendarOutlined' },
  { keywords: ['概览', '看板', '分析'], icon: 'DashboardOutlined' }
];

const cleanLabel = (value) => String(value || '')
  .replace(/^\s*\/yipex:(?:page|fast)\s*/i, '')
  .replace(/[“”"']/g, '')
  .replace(/^\s*(?:一个|一份|一下)\s*/, '')
  .replace(/场景的/g, '')
  .replace(/\s+/g, '')
  .replace(/的$/, '')
  .trim();

function requestedTaskLabel(request) {
  const source = String(request || '').trim();
  const quoted = source.match(/[“"]([^”"]{2,30})[”"]\s*(?:页面|列表|表单|详情|看板)?/);
  if (quoted) return cleanLabel(quoted[1]);
  for (const pattern of [
    /(?:生成|创建|制作|设计|搭建|做)(?:一个|一份|一下)?\s*([^，。；\n]{2,30}?)(?:页面|列表|表单|详情|看板|Dashboard)/i,
    /(?:在|为)\s*([^，。；\n]{2,30}?)(?:页面|列表)中?/
  ]) {
    const match = source.match(pattern);
    if (match) return cleanLabel(match[1]);
  }
  return '';
}

function menuId(label, changeId) {
  const slug = String(changeId || '').replace(/^\d{8}-/, '').replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '');
  return slug || `current-${Array.from(label).slice(0, 8).map((char) => char.codePointAt(0).toString(16)).join('-')}`;
}

function menuIcon(label) {
  return iconRules.find((rule) => rule.keywords.some((keyword) => label.includes(keyword)))?.icon || 'AppstoreOutlined';
}

export function inferDemandMenu({ request = '', pageName = '', changeId = '' } = {}) {
  const explicitTask = requestedTaskLabel(request);
  const label = explicitTask || (!genericPageNames.has(pageName) ? cleanLabel(pageName) : '');
  if (!label || ['首页', '主页'].includes(label)) return null;
  return { id: menuId(label, changeId), label, icon: menuIcon(label), active: true };
}

export function createDemandScopedNavigation(context = {}) {
  const businessItem = inferDemandMenu(context);
  return businessItem ? [{ ...HOME_ITEM }, businessItem] : [{ ...HOME_ITEM, active: true }];
}

function relevanceToken(label) {
  return cleanLabel(label).replace(/(?:新增|创建|编辑|查看|查询|详情|管理|列表|页面|表单|结果|信息|行情|流水|材料)/g, '');
}

export function validateDemandScopedNavigation(navigation, context = {}) {
  const errors = [];
  if (!Array.isArray(navigation) || navigation.length === 0) return ['page.shell.navigation must contain 首页 and, when applicable, the current business menu'];
  if (navigation.length > 2) errors.push('page.shell.navigation must be demand-scoped: use 首页 plus only the current business menu');
  const ids = new Set();
  navigation.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`page.shell.navigation[${index}] must be an object`);
      return;
    }
    if (!String(item.id || '').trim() || !String(item.label || '').trim()) errors.push(`page.shell.navigation[${index}] requires id and label`);
    if (item.id && ids.has(item.id)) errors.push(`duplicate shell navigation id: ${item.id}`);
    if (item.id) ids.add(item.id);
  });
  if (navigation[0]?.id !== 'home' || navigation[0]?.label !== '首页') errors.push('page.shell.navigation must start with 首页');
  const activeItems = navigation.filter((item) => item?.active === true);
  if (activeItems.length !== 1) errors.push('page.shell.navigation must have exactly one active item');
  if (navigation.length === 2 && activeItems[0]?.id === 'home') errors.push('the current business menu must be active when it is present');
  if (navigation.length === 2) {
    const businessItem = navigation[1];
    const evidence = cleanLabel([context.request, context.pageName, context.changeId, context.primaryTask].filter(Boolean).join(' '));
    const token = relevanceToken(businessItem?.label);
    if (evidence && token.length >= 2 && !evidence.includes(cleanLabel(businessItem?.label)) && !evidence.includes(token)) {
      errors.push(`page.shell.navigation business menu is unrelated to the current demand: ${businessItem?.label || '[missing label]'}`);
    }
  }
  return errors;
}
