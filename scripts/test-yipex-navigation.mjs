#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createDemandScopedNavigation, validateDemandScopedNavigation } from './lib/yipex-navigation.mjs';

const projectRoot = resolve(new URL('.', import.meta.url).pathname, '..');
const tempDir = mkdtempSync(join(tmpdir(), 'yipex-navigation-'));
const errors = [];

const cases = [
  ['生成一个“外包钱包管理”页面', '外包钱包管理', 'WalletOutlined'],
  ['在商户管理列表中增加新增商户功能', '商户管理', 'ShopOutlined'],
  ['生成订单查询列表页面', '订单查询', 'FileTextOutlined'],
  ['生成一个数字货币场景的查询列表', '数字货币查询', 'WalletOutlined']
];

try {
  for (const [request, expectedLabel, expectedIcon] of cases) {
    const navigation = createDemandScopedNavigation({ request, changeId: '20990101-navigation-test' });
    if (navigation.length !== 2 || navigation[0].label !== '首页' || navigation[1].label !== expectedLabel || navigation[1].icon !== expectedIcon || navigation[1].active !== true) {
      errors.push(`unexpected demand-scoped navigation for: ${request}`);
    }
    errors.push(...validateDemandScopedNavigation(navigation).map((error) => `valid navigation rejected: ${error}`));
  }

  const fullNavigation = [
    { id: 'home', label: '首页', active: false },
    { id: 'trade-background', label: '贸易背景材料', active: true },
    { id: 'digital-wallet', label: '数币钱包流水' },
    { id: 'fiat-wallet', label: '法币钱包流水' },
    { id: 'receiving-account', label: '收款账户' },
    { id: 'profile', label: '个人中心' }
  ];
  const fullErrors = validateDemandScopedNavigation(fullNavigation);
  if (!fullErrors.some((error) => error.includes('must be demand-scoped'))) errors.push('full navigation catalog was not rejected');

  const unrelatedErrors = validateDemandScopedNavigation([
    { id: 'home', label: '首页' },
    { id: 'trade-background', label: '贸易背景材料', active: true }
  ], { request: '生成商户管理页面', pageName: '商户管理' });
  if (!unrelatedErrors.some((error) => error.includes('unrelated to the current demand'))) errors.push('unrelated business menu was not rejected');

  const scaffold = spawnSync(process.execPath, [
    resolve(projectRoot, 'scripts/scaffold-yipex-page.mjs'),
    tempDir,
    '--request',
    '生成一个“外包钱包管理”页面'
  ], { cwd: projectRoot, encoding: 'utf8' });
  if (scaffold.status !== 0) {
    errors.push(`scaffold failed: ${scaffold.stderr || scaffold.stdout}`);
  } else {
    const spec = JSON.parse(readFileSync(resolve(tempDir, 'page-spec.json'), 'utf8'));
    const navigation = spec.page?.shell?.navigation || [];
    if (navigation.length !== 2 || navigation[1]?.label !== '外包钱包管理' || navigation[1]?.active !== true) errors.push('scaffold did not persist demand-scoped navigation');
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

if (errors.length) {
  console.error(`yipex-navigation: fail\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('yipex-navigation: pass (demand inference, validation, scaffold)');
