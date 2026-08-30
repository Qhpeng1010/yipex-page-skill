#!/usr/bin/env node
import { resolvePageStrategy } from './lib/yipex-capability-policy.mjs';
import { parseYipexCommand, readCommandContract } from './lib/yipex-command.mjs';
import { readRules } from './read-yipex-rules.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function dispatchYipexCommand(request, options = {}, root = process.cwd()) {
  const contract = readCommandContract(root);
  const parsed = parseYipexCommand(request, contract);
  const workflow = ['requirements-and-rules', 'spec-with-contract', 'validate-build', 'review'];
  if (parsed.status !== 'resolved') return parsed;
  if (parsed.mode === 'prd') {
    const command = contract.commands.find((item) => item.id === 'prd');
    return {
      ...parsed,
      status: 'mode-selected',
      capability: 'prd',
      reason: command.description,
      contract: command,
      workflow: ['read-product-template', 'write-requirement', 'validate-delivery'],
      next: '选择或创建 Change，按 product/prd-standard.md 写入 requirement.md；不要生成页面预览。'
    };
  }
  const strategyMode = parsed.mode === 'fast' ? 'auto' : options.mode;
  const strategy = resolvePageStrategy(parsed.request, { mode: strategyMode }, root);
  const rules = readRules(parsed.request, { pageFamily: strategy.family }, root);
  return {
    ...parsed,
    status: parsed.explicitCommand && parsed.mode !== 'page' ? 'mode-selected' : 'resolved',
    capability: 'page',
    mode: parsed.mode === 'fast' ? 'fast' : strategyMode || 'auto',
    strategy,
    rules,
    workflow,
    ...(parsed.explicitCommand ? {
      contract: contract.commands.find((item) => item.id === parsed.mode),
      next: parsed.mode === 'fast'
        ? '沿用当前 Page Spec、构建和静态检查流程；命中配方则标准交付，否则回退开放组合。'
        : undefined
    } : {})
  };
}

function main() {
  const requestIndex = process.argv.indexOf('--request');
  const modeIndex = process.argv.indexOf('--mode');
  const request = requestIndex >= 0 ? process.argv[requestIndex + 1] || '' : '';
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] || '' : undefined;
  if (!request) {
    console.error('Usage: node scripts/dispatch-yipex-command.mjs --request "<request>" [--mode auto|standard|open|strict]');
    process.exitCode = 2;
    return;
  }
  const result = dispatchYipexCommand(request, { mode });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'unknown-command' || result.status === 'clarify') process.exitCode = 2;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
