#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function markdown(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function bulletList(values, emptyText = '无') {
  return values?.length ? values.map((value) => `- ${markdown(value)}`).join('\n') : emptyText;
}

function operationRows(contract) {
  const rows = [];
  if (contract.operations.primary) rows.push(['主操作', contract.operations.primary]);
  for (const operation of contract.operations.secondary || []) rows.push(['次操作', operation]);
  if (!rows.length) return '本页未声明页面级操作。';
  return [
    '| 层级 | 操作 | 位置 | 结果 |',
    '| --- | --- | --- | --- |',
    ...rows.map(([level, operation]) => `| ${level} | ${markdown(operation.label)}（\`${markdown(operation.id)}\`） | ${markdown(operation.placement)} | ${markdown(operation.outcome)} |`)
  ].join('\n');
}

function presentationRows(page) {
  const decisions = Object.entries(page?.extensions?.presentationDecisions || {});
  if (!decisions.length) return '本页未记录需要单独说明的展现模式决策。';
  return [
    '| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...decisions.map(([scope, decision]) => `| \`${markdown(scope)}\` | ${markdown(decision.mode)} | ${markdown(decision.confidence)} | ${markdown((decision.evidence || []).join('；'))} | ${markdown(decision.baseComponent)} | ${decision.requiresDeviation ? '是' : '否'} |`)
  ].join('\n');
}

function derivePageDesign(input) {
  const specPath = resolve(process.cwd(), input);
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  if (spec.schemaVersion !== 2) return { skipped: true, reason: 'schemaVersion 1 remains legacy-compatible' };
  if (!spec.contract) throw new Error('Cannot derive page-design.md without a V2 contract');

  const { contract, metadata } = spec;
  const regions = [
    '| 顺序 | 区域 | 角色 | 目的 |',
    '| ---: | --- | --- | --- |',
    ...(contract.regions || []).map((region, index) => `| ${index + 1} | \`${markdown(region.id)}\` | ${markdown(region.role)} | ${markdown(region.purpose)} |`)
  ].join('\n');
  const responsive = [
    '| 视口 | 策略 |',
    '| --- | --- |',
    `| Desktop | ${markdown(contract.responsive.desktop)} |`,
    ...(contract.responsive.tablet ? [`| Tablet | ${markdown(contract.responsive.tablet)} |`] : []),
    `| Narrow | ${markdown(contract.responsive.narrow)} |`
  ].join('\n');
  const deviations = contract.deviations.length
    ? [
        '| 原规则 | 本页调整 | 原因 | 影响范围 |',
        '| --- | --- | --- | --- |',
        ...contract.deviations.map((item) => `| ${markdown(item.ruleRef)} | ${markdown(item.change)} | ${markdown(item.reason)} | ${markdown(item.scope)} |`)
      ].join('\n')
    : '无规范偏离。';

  const output = `# Page Design

> 本文件由 \`page-spec.json\` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：${markdown(metadata.pageName)}
- 页面类型：${markdown(metadata.pageType)}
- 页面族：${markdown(contract.pageFamily)}
- Shell：${markdown(contract.shell)}
- 信息密度：${markdown(contract.density)}
- 原始需求：${markdown(metadata.request || '未记录')}

## 页面结构

${regions}

## 信息层级

- 第一优先级：${markdown(contract.hierarchy.primary)}
- 次级信息：${contract.hierarchy.secondary?.length ? contract.hierarchy.secondary.map(markdown).join('、') : '无'}

## 页面操作

${operationRows(contract)}

## 展现模式决策

${presentationRows(spec.page)}

## 状态覆盖

${bulletList(contract.stateCoverage)}

## 响应式策略

${responsive}

## 规范依据

${bulletList(metadata.ruleRefs?.map((rule) => `\`${rule}\``))}

## 规范偏离

${deviations}

## 需求假设

${bulletList(metadata.assumptions)}
`;

  const outputPath = resolve(dirname(specPath), 'page-design.md');
  writeFileSync(outputPath, output);
  return { skipped: false, outputPath };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node scripts/derive-yipex-page-design.mjs <page-spec.json>');
    process.exit(2);
  }
  try {
    const result = derivePageDesign(input);
    console.log(result.skipped ? `yipex-page-design: skip (${result.reason})` : `yipex-page-design: pass (${result.outputPath})`);
  } catch (error) {
    console.error(`yipex-page-design: fail\n- ${error.message}`);
    process.exit(1);
  }
}

export { derivePageDesign };
