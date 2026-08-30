#!/usr/bin/env node
import { readCommandContract, parseYipexCommand } from './lib/yipex-command.mjs';
import { dispatchYipexCommand } from './dispatch-yipex-command.mjs';

const root = process.cwd();
const contract = readCommandContract(root);
const errors = [];

for (const mode of ['page', 'fast', 'prd']) {
  const parsed = parseYipexCommand(`/yipex:${mode} 生成订单查询列表`, contract);
  if (parsed.status !== 'resolved' || parsed.mode !== mode || parsed.request !== '生成订单查询列表') {
    errors.push(`${mode} command did not preserve mode and request`);
  }
}

const natural = parseYipexCommand('生成订单查询列表', contract);
if (natural.status !== 'resolved' || natural.explicitCommand || natural.mode !== 'natural') errors.push('natural request should remain implicit');

const unknown = parseYipexCommand('/yipex:unknown 生成页面', contract);
if (unknown.status !== 'unknown-command' || unknown.supportedCommands.length !== 3) errors.push('unknown command should be rejected with supported list');

const missing = parseYipexCommand('/yipex:fast', contract);
if (missing.status !== 'clarify') errors.push('missing fast request should clarify');

const fast = dispatchYipexCommand('/yipex:fast 生成订单查询列表');
if (fast.status !== 'mode-selected' || fast.mode !== 'fast' || fast.strategy.strategy !== 'standard' || fast.strategy.recipeId !== 'list.query-table') {
  errors.push(`fast dispatch should select standard list recipe, got ${fast.status}/${fast.mode}/${fast.strategy?.strategy}/${fast.strategy?.recipeId}`);
}

const page = dispatchYipexCommand('/yipex:page 生成订单查询列表');
if (page.status !== 'resolved' || page.mode !== 'auto' || page.strategy.recipeId !== 'list.query-table') errors.push('page command should preserve the original resolved dispatch contract');

const prd = dispatchYipexCommand('/yipex:prd 设计资金查询需求');
if (prd.status !== 'mode-selected' || prd.capability !== 'prd' || prd.contract?.resource !== 'modules/yipex/product/prd-standard.md') errors.push('prd dispatch should point at the product template');

const groupedForm = dispatchYipexCommand('/yipex:fast 生成员工分组表单，支持新增、字段校验和提交');
if (groupedForm.strategy.strategy !== 'standard' || groupedForm.strategy.recipeId !== 'form.grouped-submit') errors.push(`grouped form fast route should use recipe, got ${groupedForm.strategy.strategy}/${groupedForm.strategy.recipeId}`);

if (errors.length) {
  console.error(`yipex-command-routing: fail\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('yipex-command-routing: pass (page, fast, prd, natural and unknown cases)');
