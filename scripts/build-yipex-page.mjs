#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { derivePageDesign } from './derive-yipex-page-design.mjs';
import { renderRegisteredPage } from './lib/yipex-renderer-registry.mjs';

const input = process.argv[2];
const withDesignRecord = process.argv.includes('--with-design-record');
if (!input) {
  console.error('Usage: node scripts/build-yipex-page.mjs <page-spec.json> [--with-design-record]');
  process.exit(2);
}

const specPath = resolve(process.cwd(), input);
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const validation = spawnSync(
  process.execPath,
  [resolve(process.cwd(), 'scripts/validate-yipex-page-spec.mjs'), input],
  { encoding: 'utf8' }
);
if (validation.status !== 0) {
  process.stderr.write(validation.stderr || validation.stdout);
  process.exit(validation.status || 1);
}
if (withDesignRecord) derivePageDesign(specPath);

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const iconPaths = {
  activity: '<path d="M3 12h4l3-9 4 18 3-9h4"/>',
  badgeAlert: '<path d="M12 3 9.5 5.5 6 5l-.5 3.5L3 11l2.5 2.5L6 17l3.5-.5L12 19l2.5-2.5L18 17l.5-3.5L21 11l-2.5-2.5L18 5l-3.5.5Z"/><path d="M12 8v4"/><path d="M12 15h.01"/>',
  building: '<rect width="16" height="18" x="4" y="3" rx="2"/><path d="M9 22v-4h6v4M8 7h.01M16 7h.01M8 11h.01M16 11h.01M8 15h.01M16 15h.01"/>',
  calendar: '<path d="M8 2v4M16 2v4M3 10h18"/><rect width="18" height="18" x="3" y="4" rx="2"/>',
  checkCircle: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m9 11 3 3L22 4"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  circleHelp: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4M12 18h.01"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  layout: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6M16 12h-6M13 16h-3"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.34-5.66L20 8"/><path d="M20 3v5h-5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z"/><path d="m9 12 2 2 4-4"/>',
  store: '<path d="m2 7 3-5h14l3 5M5 13v9h14v-9M2 7h20v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V7Z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>'
};

function icon(name, className = '') {
  return `<svg class="icon ${escape(className)}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || iconPaths.circleHelp}</svg>`;
}

function findChild(node, id) {
  if (!node) return null;
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const match = findChild(child, id);
    if (match) return match;
  }
  return null;
}

function renderFallback(node) {
  const label = node.label || node.props?.text || node.props?.title || '';
  const children = (node.children || []).map(renderFallback).join('');
  if (node.type === 'text' || node.type === 'heading') {
    const tag = node.type === 'heading' ? 'h1' : 'p';
    return `<${tag}>${escape(label)}</${tag}>`;
  }
  if (node.type === 'button') {
    return `<button type="button" data-component="${escape(node.id)}">${escape(label || '操作')}</button>`;
  }
  return `<section class="yipex-${escape(node.type)}" data-component="${escape(node.id)}">${label ? `<h2>${escape(label)}</h2>` : ''}${children}</section>`;
}

function renderDefaultShell(pageSpec) {
  const shellDir = resolve(process.cwd(), 'modules/yipex/shell');
  const template = readFileSync(resolve(shellDir, 'shell.template.html'), 'utf8');
  const css = readFileSync(resolve(shellDir, 'shell.css'), 'utf8');
  const runtime = readFileSync(resolve(shellDir, 'shell-runtime.js'), 'utf8');
  const logo = readFileSync(resolve(shellDir, 'logo.svg')).toString('base64');
  const shell = pageSpec.page.shell || {};
  const header = shell.header || {};
  const brand = shell.brand || {};
  const footer = shell.footer || {};
  const navigation = (shell.navigation || []).map((item) => `<a class="yipex-shell-nav-item" data-antd-component="Menu.Item" data-menu-key="${escape(item.id)}" href="#${escape(item.id)}" title="${escape(item.label || item.id)}" ${item.active ? 'aria-current="page"' : ''}><span class="nav-icon anticon" data-antd-icon="${escape(item.icon || 'AppstoreOutlined')}" aria-hidden="true"></span><span>${escape(item.label || item.id)}</span></a>`).join('');
  const content = renderFallback(pageSpec.page.root);
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
  const iconRuntime = '<script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script><script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script><script src="https://unpkg.com/@ant-design/icons@5/dist/index.umd.min.js"><\/script>';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(pageSpec.metadata.pageName)} | YiPex</title><style>${css}</style></head><body>${body}${iconRuntime}<script>${runtime}</script></body></html>`;
}

function renderOrderDashboard(pageSpec) {
  const { metadata, page } = pageSpec;
  const root = page.root;
  const data = page.data;
  const nav = findChild(root, 'primary-navigation')?.children || [];
  const navIcons = ['layout', 'receipt', 'building', 'activity', 'shield'];
  const navHtml = nav.map((item, index) => `
    <a class="nav-item${item.state?.active ? ' active' : ''}" href="#${escape(item.id)}" ${item.state?.active ? 'aria-current="page"' : ''}>
      ${icon(navIcons[index] || 'list')}<span>${escape(item.label)}</span>
    </a>`).join('');
  const metricsHtml = data.metrics.map((metric) => {
    const value = metric.format === 'currency'
      ? `¥${Number(metric.value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : Number(metric.value).toLocaleString('zh-CN');
    const favorable = metric.id === 'abnormal' ? metric.delta < 0 : metric.delta >= 0;
    return `<article class="metric-card" data-metric="${escape(metric.id)}">
      <div class="metric-label"><span>${escape(metric.label)}</span>${icon(metric.id === 'abnormal' ? 'badgeAlert' : 'activity')}</div>
      <strong>${escape(value)}</strong>
      <div class="metric-comparison"><span class="delta ${favorable ? 'positive' : 'negative'}">${metric.delta >= 0 ? '↑' : '↓'} ${Math.abs(metric.delta)}%</span><span>${escape(metric.comparison)}</span></div>
    </article>`;
  }).join('');
  const statusTotal = data.statuses.reduce((sum, item) => sum + item.count, 0);
  const statusLegend = data.statuses.map((status) => `
    <button class="status-row" type="button" data-status="${escape(status.id)}" aria-pressed="false">
      <span class="status-name"><i style="--dot:${escape(status.color)}"></i>${escape(status.label)}</span>
      <span><b>${Number(status.count).toLocaleString('zh-CN')}</b><small>${(status.count / statusTotal * 100).toFixed(1)}%</small></span>
    </button>`).join('');
  const props = root.props || {};
  const embedded = JSON.stringify({
    data,
    initialState: page.states,
    pageName: metadata.pageName
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(metadata.pageName)} | YiPex</title>
  <style>
    :root{--yipex-control-height:32px;--ink:#222;--text:rgba(0,0,0,.85);--muted:rgba(0,0,0,.58);--faint:rgba(0,0,0,.42);--line:#e7e8e8;--line-strong:#d9d9d9;--canvas:#f6f7f8;--surface:#fff;--brand:#4aa52e;--brand-soft:#eef7eb;--danger:#d4380d;--danger-soft:#fff1ed;--warning:#f5a623;--blue:#1677ff;--radius:8px;--shadow:0 3px 12px rgba(0,0,0,.045);--sidebar:216px}
    *,*::before,*::after{box-sizing:border-box}
    html{background:var(--canvas)}
    body{margin:0;min-width:320px;background:var(--canvas);color:var(--text);font-family:Roboto,"PingFang SC",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;font-weight:400;line-height:22px;letter-spacing:0;font-synthesis:none;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
    button,input,select{font:inherit;letter-spacing:0}
    button,a,input,select{outline:none}
    button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{box-shadow:0 0 0 3px rgba(74,165,46,.22);border-color:var(--brand)!important}
    button{cursor:pointer}
    .icon{width:20px;height:20px;flex:0 0 auto}
    .app-shell{min-height:100vh;display:grid;grid-template-columns:var(--sidebar) minmax(0,1fr)}
    .sidebar{position:sticky;top:0;height:100vh;background:#fff;border-right:1px solid var(--line);padding:24px 16px 16px;display:flex;flex-direction:column;z-index:20}
    .brand{height:calc(var(--yipex-control-height) + 16px);display:flex;align-items:center;gap:11px;padding:0 8px;margin-bottom:24px;color:var(--ink)}
    .brand-mark{width:32px;height:32px;border-radius:8px;background:var(--ink);color:#fff;display:grid;place-items:center;font:700 17px/1 Roboto,sans-serif}
    .brand-word{font:700 18px/1 Roboto,sans-serif}.brand-word i{font-style:normal;color:var(--brand)}
    .nav{display:grid;gap:6px}.nav-label{padding:0 12px 8px;color:var(--faint);font-size:12px}
    .nav-item{min-height:44px;padding:0 12px;border-radius:8px;color:var(--muted);text-decoration:none;display:flex;align-items:center;gap:12px;white-space:nowrap}
    .nav-item:hover{background:#f6f7f8;color:var(--ink)}.nav-item.active{background:var(--brand-soft);color:#357d21;font-weight:500}.nav-item.active::after{content:"";width:3px;height:18px;margin-left:auto;border-radius:2px;background:var(--brand)}
    .sidebar-bottom{margin-top:auto;border-top:1px solid var(--line);padding-top:16px}.account{display:flex;align-items:center;gap:10px;padding:8px}.avatar{width:34px;height:34px;border-radius:50%;background:#e9ebed;display:grid;place-items:center;color:var(--muted)}.account strong,.account small{display:block}.account strong{font-size:13px}.account small{margin-top:2px;color:var(--faint);font-size:11px}
    #yipex-page{min-width:0;padding:32px calc(var(--yipex-control-height) + 8px) calc(var(--yipex-control-height) + 16px);max-width:1600px;width:100%;margin:0 auto}
    .page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:24px}
    .title-row{display:flex;align-items:center;gap:10px}.page-title{margin:0;color:var(--ink);font-size:28px;font-weight:500;line-height:1.3}.demo-tag{display:inline-flex;height:24px;align-items:center;padding:0 8px;border-radius:4px;background:#eff0f1;color:var(--muted);font-size:12px}.subtitle{margin:6px 0 0;color:var(--muted)}
    .header-actions{display:flex;align-items:flex-end;gap:8px}.field-label{display:block;margin-bottom:6px;color:var(--muted);font-size:12px}.date-group{display:flex;align-items:center;height:var(--yipex-control-height);border:1px solid var(--line-strong);border-radius:8px;background:#fff;overflow:hidden}.date-input-wrap{display:flex;align-items:center;padding:0 10px;gap:6px}.date-input-wrap .icon{width:16px;color:var(--faint)}.date-group input{width:118px;height:calc(var(--yipex-control-height) - 2px);border:0;background:transparent;color:var(--text)}.date-separator{color:var(--faint)}
    .btn{height:var(--yipex-control-height);border:1px solid var(--line-strong);border-radius:8px;background:#fff;color:var(--ink);padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap}.btn:hover{border-color:#aaa;background:#fafafa}.btn.primary{background:var(--ink);border-color:var(--ink);color:#fff;box-shadow:0 2px 0 rgba(0,0,0,.04)}.btn.primary:hover{background:#3a3a3a}.btn.icon-only{width:var(--yipex-control-height);padding:0}.btn .icon{width:17px}
    .metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:16px}.metric-card{min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:20px 20px 18px;box-shadow:var(--shadow)}.metric-label{display:flex;align-items:center;justify-content:space-between;color:var(--muted)}.metric-label .icon{width:18px;color:var(--faint)}.metric-card[data-metric="abnormal"] .metric-label .icon{color:var(--danger)}.metric-card strong{display:block;margin-top:14px;color:var(--ink);font:600 25px/1.25 Roboto,"PingFang SC",sans-serif;white-space:nowrap}.metric-comparison{display:flex;align-items:center;gap:7px;margin-top:9px;color:var(--faint);font-size:12px}.delta{font-family:Roboto,sans-serif;font-weight:500}.delta.positive{color:var(--brand)}.delta.negative{color:var(--danger)}
    .analysis-grid{display:grid;grid-template-columns:minmax(0,1.72fr) minmax(300px,.72fr);gap:16px;margin-bottom:16px}.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);min-width:0}.panel-header{min-height:64px;padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:16px}.panel-title{display:flex;align-items:baseline;gap:10px}.panel-title h2{margin:0;color:var(--ink);font-size:16px;font-weight:500}.panel-title small{color:var(--faint);font-size:12px}.panel-body{padding:20px}
    .segmented{display:flex;background:#f2f3f4;border-radius:6px;padding:3px}.segment{height:30px;padding:0 11px;border:0;border-radius:4px;background:transparent;color:var(--muted);font-size:12px}.segment.active{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.08)}
    .trend-summary{display:flex;align-items:baseline;gap:9px;margin-bottom:10px}.trend-summary strong{font:600 22px/1 Roboto,sans-serif}.trend-summary span{color:var(--brand);font-size:12px}.chart-wrap{width:100%;height:250px;position:relative}.chart-wrap svg{width:100%;height:100%;display:block;overflow:visible}.chart-grid{stroke:#edf0ef;stroke-width:1}.chart-axis{fill:rgba(0,0,0,.42);font:11px Roboto,"PingFang SC",sans-serif}.chart-line{fill:none;stroke:var(--brand);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}.chart-dot{fill:#fff;stroke:var(--brand);stroke-width:2}.chart-dot:hover{r:5;fill:var(--brand)}
    .status-content{display:grid;grid-template-columns:1fr;align-items:center;gap:14px;padding:20px}.donut{width:140px;height:140px;margin:0 auto;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#4aa52e 0 68.1%,#1677ff 68.1% 83%,#8c8c8c 83% 92.7%,#f5a623 92.7% 97.7%,#d4380d 97.7% 100%);position:relative}.donut::after{content:"";position:absolute;width:92px;height:92px;background:#fff;border-radius:50%}.donut-center{position:relative;z-index:1;text-align:center}.donut-center strong,.donut-center span{display:block}.donut-center strong{font:600 23px/1.2 Roboto,sans-serif}.donut-center span{margin-top:4px;color:var(--faint);font-size:12px}.status-list{display:grid;gap:2px}.status-row{width:100%;min-height:36px;padding:4px 7px;border:1px solid transparent;border-radius:6px;background:#fff;display:flex;justify-content:space-between;align-items:center;color:var(--text);text-align:left}.status-row:hover,.status-row.active{background:#f7f8f8}.status-row.active{border-color:#dfe6dc}.status-name{display:flex;align-items:center;gap:8px;white-space:nowrap}.status-name i{width:8px;height:8px;border-radius:50%;background:var(--dot)}.status-row b{font:500 13px Roboto,sans-serif}.status-row small{display:inline-block;width:47px;margin-left:8px;color:var(--faint);text-align:right;font:11px Roboto,sans-serif}
    .table-panel .panel-header{align-items:center}.table-tools{display:flex;align-items:center;gap:8px}.search-box{width:240px;height:var(--yipex-control-height);border:1px solid var(--line-strong);border-radius:8px;background:#fff;display:flex;align-items:center;padding:0 11px;gap:8px}.search-box .icon{width:17px;color:var(--faint)}.search-box input{min-width:0;width:100%;height:calc(var(--yipex-control-height) - 2px);border:0;background:transparent;color:var(--text)}.search-box input::placeholder{color:rgba(0,0,0,.32)}
    .selected-summary{display:none;align-items:center;gap:10px;color:var(--muted);font-size:12px}.selected-summary.visible{display:flex}.table-scroll{overflow-x:auto}.orders-table{width:100%;min-width:1000px;border-collapse:collapse}.orders-table th{height:44px;padding:0 14px;background:#fafbfb;border-bottom:1px solid var(--line);color:var(--faint);font-size:12px;font-weight:400;text-align:left;white-space:nowrap}.orders-table td{height:65px;padding:10px 14px;border-bottom:1px solid #eff0f0;color:var(--muted);vertical-align:middle}.orders-table tbody tr:hover{background:#fbfcfb}.orders-table th:first-child,.orders-table td:first-child{width:44px;padding-right:2px}.orders-table input[type="checkbox"]{width:16px;height:16px;accent-color:var(--ink);cursor:pointer}.order-link{border:0;background:transparent;padding:0;color:#276c18;font:500 13px Roboto,sans-serif}.order-link:hover{text-decoration:underline}.merchant-name{display:block;color:var(--text);font-weight:500}.merchant-sub{display:block;margin-top:3px;color:var(--faint);font-size:11px}.amount{color:var(--ink);font:500 13px Roboto,sans-serif}.status-pill,.risk-pill{display:inline-flex;min-height:24px;align-items:center;border-radius:4px;padding:0 7px;font-size:12px;white-space:nowrap}.status-pill{background:var(--danger-soft);color:#ad2d0f}.status-pill::before{content:"!";display:grid;place-items:center;width:13px;height:13px;margin-right:5px;border:1px solid currentColor;border-radius:50%;font:600 9px/1 Roboto,sans-serif}.risk-pill.high{background:#fff1ed;color:#b72f0d}.risk-pill.medium{background:#fff7e6;color:#ad6800}.risk-pill.low{background:#f0f5ff;color:#2456a6}.reason{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.detail-btn{height:32px;border:0;background:transparent;color:#357d21;padding:0 5px}.detail-btn:hover{text-decoration:underline}.empty-row td{height:190px;text-align:center}.empty-state{display:grid;place-items:center;gap:7px;color:var(--faint)}.empty-state .icon{width:30px;height:30px;color:#aeb3b0}.empty-state strong{color:var(--muted);font-weight:500}
    .table-footer{min-height:60px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;color:var(--faint);font-size:12px}.pagination{display:flex;align-items:center;gap:4px}.page-btn{width:34px;height:34px;border:1px solid transparent;border-radius:6px;background:#fff;color:var(--muted);display:grid;place-items:center}.page-btn:hover:not(:disabled){background:#f3f4f4}.page-btn.active{background:var(--ink);color:#fff}.page-btn:disabled{opacity:.35;cursor:not-allowed}.page-btn .icon{width:16px}
    .drawer-layer{position:fixed;inset:0;z-index:80;pointer-events:none;visibility:hidden}.drawer-layer.open{pointer-events:auto;visibility:visible}.drawer-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.28);opacity:0;transition:opacity .18s ease}.drawer-layer.open .drawer-backdrop{opacity:1}.drawer{position:absolute;right:0;top:0;height:100%;width:min(520px,100vw);background:#fff;box-shadow:-10px 0 30px rgba(0,0,0,.1);transform:translateX(100%);transition:transform .22s ease;display:flex;flex-direction:column}.drawer-layer.open .drawer{transform:translateX(0)}.drawer-header{height:72px;padding:0 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}.drawer-title h2{margin:0;font-size:18px;font-weight:500}.drawer-title span{display:block;margin-top:4px;color:var(--faint);font:11px Roboto,sans-serif}.drawer-body{padding:24px;overflow:auto}.detail-amount{padding:20px;border-radius:8px;background:#f7f8f8;display:flex;align-items:center;justify-content:space-between}.detail-amount span{color:var(--muted)}.detail-amount strong{font:600 24px/1 Roboto,sans-serif}.detail-status{margin-top:16px;padding:14px 16px;border:1px solid #ffd8cc;border-radius:8px;background:var(--danger-soft)}.detail-status strong{display:flex;align-items:center;gap:8px;color:#a82b0e}.detail-status p{margin:7px 0 0;color:var(--muted);line-height:1.65}.detail-section{margin-top:28px}.detail-section h3{margin:0 0 14px;font-size:14px;font-weight:500}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px}.detail-item span,.detail-item strong{display:block}.detail-item span{color:var(--faint);font-size:12px}.detail-item strong{margin-top:5px;color:var(--text);font-size:13px;font-weight:500}.timeline{display:grid;gap:0}.timeline-item{position:relative;padding:0 0 22px 24px}.timeline-item::before{content:"";position:absolute;left:5px;top:10px;bottom:-2px;width:1px;background:var(--line-strong)}.timeline-item:last-child::before{display:none}.timeline-item::after{content:"";position:absolute;left:0;top:5px;width:11px;height:11px;border:2px solid var(--brand);background:#fff;border-radius:50%}.timeline-item strong,.timeline-item span{display:block}.timeline-item strong{font-size:13px;font-weight:500}.timeline-item span{margin-top:4px;color:var(--faint);font-size:11px}.drawer-footer{margin-top:auto;padding:16px 24px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px}
    .toast{position:fixed;left:50%;bottom:28px;z-index:120;transform:translate(-50%,18px);min-height:44px;padding:0 16px;border-radius:8px;background:var(--ink);color:#fff;display:flex;align-items:center;gap:9px;box-shadow:0 8px 24px rgba(0,0,0,.16);opacity:0;pointer-events:none;transition:opacity .16s ease,transform .16s ease}.toast.show{opacity:1;transform:translate(-50%,0)}.toast .icon{width:17px;color:#80d66b}
    @media(max-width:1180px){:root{--sidebar:76px}.brand-word,.nav-label,.nav-item span,.account>span{display:none}.brand{padding:0;justify-content:center}.nav-item{justify-content:center;padding:0}.nav-item.active::after{position:absolute;right:4px}.account{justify-content:center}.analysis-grid{grid-template-columns:1fr}.status-content{grid-template-columns:180px minmax(0,1fr)}.status-list{grid-template-columns:1fr 1fr}}
    @media(max-width:860px){#yipex-page{padding:24px}.page-header{flex-direction:column}.header-actions{width:100%;align-items:flex-end;flex-wrap:wrap}.date-filter{flex:1;min-width:320px}.date-group{width:100%}.date-input-wrap{flex:1}.date-group input{width:100%}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.table-panel .panel-header{align-items:flex-start;flex-direction:column}.table-tools{width:100%}.search-box{flex:1}}
    @media(max-width:640px){:root{--sidebar:0px}.app-shell{display:block}.sidebar{display:none}#yipex-page{padding:20px 16px 36px}.page-title{font-size:24px}.header-actions{min-width:0;align-items:stretch}.date-filter{min-width:100%}.date-group{height:auto;padding:7px;align-items:stretch;flex-direction:column}.date-input-wrap{min-height:var(--yipex-control-height)}.date-separator{display:none}.header-actions>.btn{min-width:0;flex:1}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.metric-card{min-width:0;padding:16px}.metric-card strong{font-size:20px}.metric-card[data-metric="sales"] strong{font-size:18px}.analysis-grid{gap:10px}.panel-header{padding:14px 16px;flex-wrap:wrap}.panel-body{padding:16px}.chart-wrap{height:220px}.status-content{grid-template-columns:1fr;padding:20px}.donut{margin:0 auto}.status-list{grid-template-columns:1fr}.table-tools{align-items:stretch;flex-wrap:wrap}.search-box{min-width:100%}.table-footer{align-items:flex-start;gap:8px;flex-direction:column}.drawer-header,.drawer-body,.drawer-footer{padding-left:18px;padding-right:18px}.detail-grid{grid-template-columns:1fr 1fr}}
  </style>
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar" aria-label="主导航">
      <div class="brand"><span class="brand-mark">Y</span><span class="brand-word">YiPex<i>.</i></span></div>
      <nav class="nav"><div class="nav-label">业务管理</div>${navHtml}</nav>
      <div class="sidebar-bottom">
        <a class="nav-item" href="#help">${icon('circleHelp')}<span>帮助中心</span></a>
        <div class="account"><span class="avatar">${icon('user')}</span><span><strong>订单运营</strong><small>运营工作台</small></span></div>
      </div>
    </aside>
    <main id="yipex-page" data-component="${escape(root.id)}">
      <header class="page-header">
        <div><div class="title-row"><h1 class="page-title">${escape(props.title)}</h1><span class="demo-tag">${escape(props.demoLabel)}</span></div><p class="subtitle">${escape(props.subtitle)} · 更新于 ${escape(data.updatedAt)}</p></div>
        <div class="header-actions">
          <div class="date-filter"><label class="field-label" for="start-date">统计日期</label><div class="date-group"><label class="date-input-wrap">${icon('calendar')}<input id="start-date" type="date" value="${escape(data.dateRange.start)}" aria-label="开始日期"></label><span class="date-separator">至</span><label class="date-input-wrap"><input id="end-date" type="date" value="${escape(data.dateRange.end)}" aria-label="结束日期"></label></div></div>
          <button class="btn" id="apply-filter" type="button">查询</button>
          <button class="btn primary" id="export-orders" type="button">${icon('download')}<span>导出报表</span></button>
        </div>
      </header>
      <section class="metric-grid" aria-label="核心指标">${metricsHtml}</section>
      <section class="analysis-grid">
        <article class="panel" data-component="sales-trend">
          <header class="panel-header"><div class="panel-title"><h2>销售额趋势</h2><small id="trend-period-label">08月01日 - 08月27日</small></div><div class="segmented" role="group" aria-label="趋势时间范围"><button class="segment" type="button" data-days="7">近7日</button><button class="segment" type="button" data-days="14">近14日</button><button class="segment active" type="button" data-days="all">本月</button></div></header>
          <div class="panel-body"><div class="trend-summary"><strong id="trend-total">¥1,286,430.50</strong><span>↑ 12.6% 较上期</span></div><div class="chart-wrap" id="trend-chart" aria-label="销售额折线图"></div></div>
        </article>
        <article class="panel" data-component="status-distribution">
          <header class="panel-header"><div class="panel-title"><h2>订单状态分布</h2><small>共 ${statusTotal.toLocaleString('zh-CN')} 笔</small></div><button class="btn icon-only" id="reset-status" type="button" title="清除状态筛选" aria-label="清除状态筛选">${icon('refresh')}</button></header>
          <div class="status-content"><div class="donut" role="img" aria-label="订单状态环形图"><div class="donut-center"><strong>${statusTotal.toLocaleString('zh-CN')}</strong><span>全部订单</span></div></div><div class="status-list">${statusLegend}</div></div>
        </article>
      </section>
      <section class="panel table-panel" data-component="abnormal-orders">
        <header class="panel-header"><div class="panel-title"><h2>异常订单</h2><small id="table-count">共 ${data.anomalies.length} 条</small></div><div class="table-tools"><div class="selected-summary" id="selected-summary"><span>已选 <b id="selected-count">0</b> 条</span><button class="btn" id="export-selected" type="button">${icon('download')}导出所选</button></div><label class="search-box">${icon('search')}<input id="order-search" type="search" placeholder="搜索订单号、商户或异常原因" aria-label="搜索异常订单"></label></div></header>
        <div class="table-scroll"><table class="orders-table"><thead><tr><th><input id="select-all" type="checkbox" aria-label="选择当前页全部订单"></th><th>订单号</th><th>商户 / 客户</th><th>订单金额</th><th>异常状态</th><th>风险等级</th><th>异常原因</th><th>创建时间</th><th>操作</th></tr></thead><tbody id="orders-body"></tbody></table></div>
        <footer class="table-footer"><span id="page-summary">显示 1-${Math.min(page.states.pageSize, data.anomalies.length)} 条，共 ${data.anomalies.length} 条</span><div class="pagination" id="pagination" aria-label="表格分页"></div></footer>
      </section>
    </main>
  </div>
  <div class="drawer-layer" id="drawer-layer" aria-hidden="true"><div class="drawer-backdrop" data-close-drawer></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-heading"><header class="drawer-header"><div class="drawer-title"><h2 id="drawer-heading">订单详情</h2><span id="drawer-order-id"></span></div><button class="btn icon-only" id="close-drawer" type="button" title="关闭详情" aria-label="关闭详情">${icon('x')}</button></header><div class="drawer-body" id="drawer-body"></div><footer class="drawer-footer"><button class="btn" type="button" data-close-drawer>关闭</button><button class="btn primary" id="mark-processed" type="button">标记为已跟进</button></footer></aside></div>
  <div class="toast" id="toast" role="status" aria-live="polite">${icon('checkCircle')}<span></span></div>
  <script id="dashboard-data" type="application/json">${embedded}</script>
  <script>
    (() => {
      const payload = JSON.parse(document.getElementById('dashboard-data').textContent);
      const source = payload.data;
      const state = { query: '', page: 1, pageSize: payload.initialState.pageSize || 5, status: 'all', selected: new Set(), activeDays: 'all', start: source.dateRange.start, end: source.dateRange.end };
      const els = { body: document.getElementById('orders-body'), count: document.getElementById('table-count'), pageSummary: document.getElementById('page-summary'), pagination: document.getElementById('pagination'), selectAll: document.getElementById('select-all'), selectedSummary: document.getElementById('selected-summary'), selectedCount: document.getElementById('selected-count'), drawerLayer: document.getElementById('drawer-layer'), drawerBody: document.getElementById('drawer-body'), drawerOrderId: document.getElementById('drawer-order-id'), toast: document.getElementById('toast') };
      const currency = (value) => '¥' + Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const text = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
      let toastTimer;
      let lastFocus;
      function showToast(message) { clearTimeout(toastTimer); els.toast.querySelector('span').textContent = message; els.toast.classList.add('show'); toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600); }
      function filteredOrders() {
        const query = state.query.trim().toLowerCase();
        return source.anomalies.filter((order) => {
          const day = order.createdAt.slice(0, 10);
          const dateMatch = day >= state.start && day <= state.end;
          const statusMatch = state.status === 'all' || state.status === 'abnormal';
          const haystack = [order.id, order.merchant, order.customer, order.status, order.reason].join(' ').toLowerCase();
          return dateMatch && statusMatch && (!query || haystack.includes(query));
        });
      }
      function riskClass(risk) { return risk === '高' ? 'high' : risk === '中' ? 'medium' : 'low'; }
      function renderTable() {
        const rows = filteredOrders();
        const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
        if (state.page > pages) state.page = pages;
        const start = (state.page - 1) * state.pageSize;
        const visible = rows.slice(start, start + state.pageSize);
        els.count.textContent = '共 ' + rows.length + ' 条';
        if (!visible.length) {
          els.body.innerHTML = '<tr class="empty-row"><td colspan="9"><div class="empty-state">${icon('search')}<strong>没有符合条件的异常订单</strong><span>调整日期、状态或搜索关键词后重试</span></div></td></tr>';
        } else {
          els.body.innerHTML = visible.map((order) => '<tr><td><input class="row-check" type="checkbox" aria-label="选择订单 ' + text(order.id) + '" data-id="' + text(order.id) + '" ' + (state.selected.has(order.id) ? 'checked' : '') + '></td><td><button class="order-link" type="button" data-detail="' + text(order.id) + '">' + text(order.id) + '</button></td><td><span class="merchant-name">' + text(order.merchant) + '</span><span class="merchant-sub">' + text(order.customer) + ' · ' + text(order.channel) + '</span></td><td><span class="amount">' + currency(order.amount) + '</span></td><td><span class="status-pill">' + text(order.status) + '</span></td><td><span class="risk-pill ' + riskClass(order.risk) + '">' + text(order.risk) + '风险</span></td><td><div class="reason" title="' + text(order.reason) + '">' + text(order.reason) + '</div></td><td>' + text(order.createdAt) + '</td><td><button class="detail-btn" type="button" data-detail="' + text(order.id) + '">详情</button></td></tr>').join('');
        }
        els.pageSummary.textContent = rows.length ? '显示 ' + (start + 1) + '-' + Math.min(start + state.pageSize, rows.length) + ' 条，共 ' + rows.length + ' 条' : '显示 0 条，共 0 条';
        els.pagination.innerHTML = '<button class="page-btn" type="button" data-page="prev" aria-label="上一页" ' + (state.page === 1 ? 'disabled' : '') + '>${icon('chevronLeft')}</button>' + Array.from({ length: pages }, (_, index) => '<button class="page-btn ' + (state.page === index + 1 ? 'active' : '') + '" type="button" data-page="' + (index + 1) + '" aria-label="第 ' + (index + 1) + ' 页">' + (index + 1) + '</button>').join('') + '<button class="page-btn" type="button" data-page="next" aria-label="下一页" ' + (state.page === pages ? 'disabled' : '') + '>${icon('chevronRight')}</button>';
        const visibleIds = visible.map((order) => order.id);
        els.selectAll.checked = visibleIds.length > 0 && visibleIds.every((id) => state.selected.has(id));
        els.selectAll.indeterminate = visibleIds.some((id) => state.selected.has(id)) && !els.selectAll.checked;
        els.selectedCount.textContent = state.selected.size;
        els.selectedSummary.classList.toggle('visible', state.selected.size > 0);
      }
      function renderChart(days = 'all') {
        let points = source.salesTrend;
        if (days !== 'all') points = points.slice(-Math.ceil(Number(days) / 2));
        const width = 820, height = 240, left = 54, right = 14, top = 12, bottom = 34;
        const values = points.map((item) => item.value);
        const min = Math.floor(Math.min(...values) / 10000) * 10000 - 5000;
        const max = Math.ceil(Math.max(...values) / 10000) * 10000 + 5000;
        const x = (index) => left + index * ((width - left - right) / Math.max(1, points.length - 1));
        const y = (value) => top + (max - value) * ((height - top - bottom) / (max - min));
        const line = points.map((item, index) => (index ? 'L' : 'M') + x(index).toFixed(1) + ' ' + y(item.value).toFixed(1)).join(' ');
        const grid = Array.from({ length: 5 }, (_, index) => { const gy = top + index * ((height - top - bottom) / 4); const val = max - index * ((max - min) / 4); return '<line class="chart-grid" x1="' + left + '" y1="' + gy + '" x2="' + (width-right) + '" y2="' + gy + '"/><text class="chart-axis" x="0" y="' + (gy+4) + '">¥' + Math.round(val/1000) + 'k</text>'; }).join('');
        const dots = points.map((item, index) => '<circle class="chart-dot" cx="' + x(index).toFixed(1) + '" cy="' + y(item.value).toFixed(1) + '" r="3"><title>' + item.date.slice(5).replace('-', '月') + '日 ' + currency(item.value) + '</title></circle>').join('');
        const labels = points.map((item, index) => (index === 0 || index === points.length - 1 || index % Math.max(1, Math.floor(points.length / 5)) === 0) ? '<text class="chart-axis" text-anchor="middle" x="' + x(index).toFixed(1) + '" y="' + (height-8) + '">' + item.date.slice(5).replace('-', '/') + '</text>' : '').join('');
        document.getElementById('trend-chart').innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="销售额趋势：从 ' + currency(values[0]) + ' 变化到 ' + currency(values[values.length-1]) + '">' + grid + '<path class="chart-line" d="' + line + '"/>' + dots + labels + '</svg>';
        const total = days === 'all' ? source.metrics.find((metric) => metric.id === 'sales').value : points.reduce((sum, point) => sum + point.value, 0);
        document.getElementById('trend-total').textContent = currency(total);
        document.getElementById('trend-period-label').textContent = points[0].date.slice(5).replace('-', '月') + '日 - ' + points[points.length-1].date.slice(5).replace('-', '月') + '日';
      }
      function exportCsv(orders, filename) {
        if (!orders.length) { showToast('当前没有可导出的订单'); return; }
        const rows = [['订单号','创建时间','商户','客户','金额','状态','风险等级','支付渠道','异常原因'], ...orders.map((o) => [o.id,o.createdAt,o.merchant,o.customer,o.amount,o.status,o.risk,o.channel,o.reason])];
        const csv = '\\uFEFF' + rows.map((row) => row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); showToast('已导出 ' + orders.length + ' 条异常订单');
      }
      function openDetail(id, trigger) {
        const order = source.anomalies.find((item) => item.id === id); if (!order) return; lastFocus = trigger;
        els.drawerOrderId.textContent = order.id;
        els.drawerBody.innerHTML = '<div class="detail-amount"><span>订单金额</span><strong>' + currency(order.amount) + '</strong></div><div class="detail-status"><strong>${icon('badgeAlert')} ' + text(order.status) + ' · ' + text(order.risk) + '风险</strong><p>' + text(order.reason) + '</p></div><section class="detail-section"><h3>订单信息</h3><div class="detail-grid"><div class="detail-item"><span>商户</span><strong>' + text(order.merchant) + '</strong></div><div class="detail-item"><span>客户</span><strong>' + text(order.customer) + '</strong></div><div class="detail-item"><span>支付渠道</span><strong>' + text(order.channel) + '</strong></div><div class="detail-item"><span>重试次数</span><strong>' + order.attempts + ' 次</strong></div><div class="detail-item"><span>当前跟进人</span><strong>' + text(order.owner) + '</strong></div><div class="detail-item"><span>最后更新</span><strong>' + text(order.updatedAt) + '</strong></div></div></section><section class="detail-section"><h3>处理记录</h3><div class="timeline"><div class="timeline-item"><strong>系统识别到异常</strong><span>' + text(order.createdAt) + ' · 自动风险检查</span></div><div class="timeline-item"><strong>进入人工复核队列</strong><span>' + text(order.updatedAt) + ' · ' + text(order.owner) + '</span></div><div class="timeline-item"><strong>等待渠道状态确认</strong><span>当前步骤</span></div></div></section>';
        els.drawerLayer.classList.add('open'); els.drawerLayer.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; document.getElementById('close-drawer').focus();
      }
      function closeDrawer() { els.drawerLayer.classList.remove('open'); els.drawerLayer.setAttribute('aria-hidden','true'); document.body.style.overflow=''; if (lastFocus) lastFocus.focus(); }
      document.getElementById('order-search').addEventListener('input', (event) => { state.query = event.target.value; state.page = 1; renderTable(); });
      document.getElementById('apply-filter').addEventListener('click', () => { const start = document.getElementById('start-date').value; const end = document.getElementById('end-date').value; if (!start || !end || start > end) { showToast('请选择有效的开始和结束日期'); return; } state.start=start; state.end=end; state.page=1; renderTable(); showToast('日期范围已更新'); });
      document.querySelectorAll('.segment').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.segment').forEach((item) => item.classList.remove('active')); button.classList.add('active'); state.activeDays=button.dataset.days; renderChart(state.activeDays); }));
      document.querySelectorAll('.status-row').forEach((button) => button.addEventListener('click', () => { const next = state.status === button.dataset.status ? 'all' : button.dataset.status; state.status=next; state.page=1; document.querySelectorAll('.status-row').forEach((item) => { const active=item.dataset.status===next; item.classList.toggle('active',active); item.setAttribute('aria-pressed', String(active)); }); renderTable(); }));
      document.getElementById('reset-status').addEventListener('click', () => { state.status='all'; document.querySelectorAll('.status-row').forEach((item) => { item.classList.remove('active'); item.setAttribute('aria-pressed','false'); }); renderTable(); showToast('已清除状态筛选'); });
      els.body.addEventListener('click', (event) => { const detail=event.target.closest('[data-detail]'); if (detail) openDetail(detail.dataset.detail, detail); });
      els.body.addEventListener('change', (event) => { if (!event.target.matches('.row-check')) return; event.target.checked ? state.selected.add(event.target.dataset.id) : state.selected.delete(event.target.dataset.id); renderTable(); });
      els.selectAll.addEventListener('change', () => { const rows=filteredOrders().slice((state.page-1)*state.pageSize,state.page*state.pageSize); rows.forEach((order) => els.selectAll.checked ? state.selected.add(order.id) : state.selected.delete(order.id)); renderTable(); });
      els.pagination.addEventListener('click', (event) => { const button=event.target.closest('[data-page]'); if (!button || button.disabled) return; const pages=Math.max(1,Math.ceil(filteredOrders().length/state.pageSize)); state.page=button.dataset.page==='prev'?Math.max(1,state.page-1):button.dataset.page==='next'?Math.min(pages,state.page+1):Number(button.dataset.page); renderTable(); });
      document.getElementById('export-orders').addEventListener('click', () => exportCsv(filteredOrders(),'yipex-abnormal-orders-' + state.start + '-' + state.end + '.csv'));
      document.getElementById('export-selected').addEventListener('click', () => exportCsv(source.anomalies.filter((order) => state.selected.has(order.id)),'yipex-selected-orders.csv'));
      document.getElementById('close-drawer').addEventListener('click', closeDrawer); document.querySelectorAll('[data-close-drawer]').forEach((button) => button.addEventListener('click',closeDrawer));
      document.getElementById('mark-processed').addEventListener('click', () => { showToast('已记录跟进状态'); closeDrawer(); });
      document.addEventListener('keydown', (event) => { if (event.key==='Escape' && els.drawerLayer.classList.contains('open')) closeDrawer(); });
      renderChart(); renderTable();
    })();
  </script>
</body>
</html>`;
}

function renderQueryList(pageSpec) {
  const { metadata, page } = pageSpec;
  const root = page.root;
  const data = page.data || {};
  const props = root.props || {};
  const nav = page.shell?.navigation || [];
  const navIcons = ['layout', 'list', 'store', 'activity', 'shield'];
  const navHtml = nav.map((item, index) => `<a class="nav-item${item.active ? ' active' : ''}" href="#${escape(item.id)}" ${item.active ? 'aria-current="page"' : ''}>${icon(navIcons[index] || 'list')}<span>${escape(item.label)}</span></a>`).join('');
  const embedded = JSON.stringify({ data, initialState: page.states || {}, pageName: metadata.pageName }).replace(/</g, '\\u003c');
  const statusOptions = (data.statuses || []).map((value) => `<option value="${escape(value)}">${escape(value)}</option>`).join('');
  const channelOptions = (data.channels || []).map((value) => `<option value="${escape(value)}">${escape(value)}</option>`).join('');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(metadata.pageName)} | YiPex</title>
<style>
:root{--yipex-control-height:32px;--ink:#222;--text:rgba(0,0,0,.85);--muted:rgba(0,0,0,.58);--faint:rgba(0,0,0,.42);--line:#e7e8e8;--line-strong:#d9d9d9;--canvas:#f6f7f8;--surface:#fff;--brand:#4aa52e;--brand-soft:#eef7eb;--blue:#1677ff;--orange:#d48806;--red:#d4380d;--radius:8px;--shadow:0 3px 12px rgba(0,0,0,.045);--sidebar:216px}*{box-sizing:border-box}html,body{margin:0;min-width:320px;background:var(--canvas);color:var(--text);font-family:"PingFang SC",Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;letter-spacing:0}button,input,select{font:inherit;letter-spacing:0}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible{outline:0;box-shadow:0 0 0 3px rgba(74,165,46,.22);border-color:var(--brand)!important}.icon{width:19px;height:19px;flex:0 0 auto}.app-shell{min-height:100vh;display:grid;grid-template-columns:var(--sidebar) minmax(0,1fr)}.sidebar{position:sticky;top:0;height:100vh;background:#fff;border-right:1px solid var(--line);padding:24px 16px;display:flex;flex-direction:column}.brand{height:calc(var(--yipex-control-height) + 16px);display:flex;align-items:center;gap:11px;padding:0 8px;margin-bottom:24px}.brand-mark{width:32px;height:32px;border-radius:8px;background:var(--ink);color:#fff;display:grid;place-items:center;font:700 17px/1 Roboto}.brand-word{font:700 18px/1 Roboto}.brand-word i{font-style:normal;color:var(--brand)}.nav{display:grid;gap:6px}.nav-label{padding:0 12px 8px;color:var(--faint);font-size:12px}.nav-item{min-height:44px;padding:0 12px;border-radius:8px;color:var(--muted);text-decoration:none;display:flex;align-items:center;gap:12px;white-space:nowrap}.nav-item:hover{background:#f6f7f8;color:var(--ink)}.nav-item.active{background:var(--brand-soft);color:#357d21;font-weight:500}.nav-item.active::after{content:"";width:3px;height:18px;margin-left:auto;border-radius:2px;background:var(--brand)}.sidebar-bottom{margin-top:auto;border-top:1px solid var(--line);padding-top:16px}.account{display:flex;align-items:center;gap:10px;padding:8px}.avatar{width:34px;height:34px;border-radius:50%;background:#e9ebed;display:grid;place-items:center;color:var(--muted)}.account strong,.account small{display:block}.account strong{font-size:13px}.account small{margin-top:2px;color:var(--faint);font-size:11px}
#yipex-page{min-width:0;padding:32px calc(var(--yipex-control-height) + 8px) calc(var(--yipex-control-height) + 16px);max-width:1600px;width:100%;margin:0 auto}.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:24px}.title-row{display:flex;align-items:center;gap:10px}.page-title{margin:0;color:var(--ink);font-size:28px;font-weight:500;line-height:1.3}.demo-tag{height:24px;display:inline-flex;align-items:center;padding:0 8px;border-radius:4px;background:#eff0f1;color:var(--muted);font-size:12px}.subtitle{margin:6px 0 0;color:var(--muted)}.header-actions{display:flex;align-items:flex-end;gap:8px}.btn{height:var(--yipex-control-height);border:1px solid var(--line-strong);border-radius:8px;background:#fff;color:var(--ink);padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap}.btn:hover{border-color:#aaa;background:#fafafa}.btn.primary{background:var(--ink);border-color:var(--ink);color:#fff}.btn.primary:hover{background:#3a3a3a}.btn.icon-only{width:var(--yipex-control-height);padding:0}.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);min-width:0}.panel-header{min-height:64px;padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:16px}.panel-title h2{margin:0;font-size:16px;font-weight:500}.panel-title small{margin-left:10px;color:var(--faint);font-size:12px}.filter-panel{margin-bottom:16px}.filter-grid{padding:20px;display:grid;grid-template-columns:minmax(220px,1.6fr) repeat(4,minmax(140px,1fr)) auto;gap:16px;align-items:end}.field label{display:block;margin-bottom:6px;color:var(--muted);font-size:12px}.field input,.field select{width:100%;height:var(--yipex-control-height);padding:0 11px;border:1px solid var(--line-strong);border-radius:8px;background:#fff;color:var(--text)}.date-range{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px}.date-range span{color:var(--faint)}.filter-actions{display:flex;gap:8px}.table-tools{display:flex;gap:8px;align-items:center}.selected-summary{display:none;align-items:center;gap:10px;color:var(--muted);font-size:12px}.selected-summary.visible{display:flex}.table-scroll{overflow-x:auto}.orders-table{width:100%;min-width:920px;border-collapse:collapse}.orders-table th{height:44px;padding:0 14px;background:#fafbfb;border-bottom:1px solid var(--line);color:var(--faint);font-size:12px;font-weight:400;text-align:left;white-space:nowrap}.orders-table td{height:65px;padding:10px 14px;border-bottom:1px solid #eff0f0;color:var(--muted);vertical-align:middle}.orders-table tbody tr:hover{background:#fbfcfb}.orders-table th:first-child,.orders-table td:first-child{width:44px;padding-right:2px}.orders-table input{width:16px;height:16px;accent-color:var(--ink)}.order-link,.detail-btn{border:0;background:transparent;padding:0;color:#357d21;font-weight:500}.order-link:hover,.detail-btn:hover{text-decoration:underline}.merchant-name{display:block;color:var(--text);font-weight:500}.merchant-sub{display:block;margin-top:3px;color:var(--faint);font-size:11px}.amount{color:var(--ink);font:500 13px Roboto}.status-pill{display:inline-flex;min-height:24px;align-items:center;padding:0 8px;border-radius:4px;font-size:12px;white-space:nowrap}.status-pill.waiting{background:#fff7e6;color:#ad6800}.status-pill.processing{background:#f0f5ff;color:#2456a6}.status-pill.completed{background:#f0f9eb;color:#357d21}.status-pill.closed{background:#f1f1f1;color:#777}.empty-row td{height:180px;text-align:center}.empty-state{display:grid;place-items:center;gap:7px;color:var(--faint)}.empty-state strong{color:var(--muted);font-weight:500}.table-footer{min-height:60px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;color:var(--faint);font-size:12px}.pagination{display:flex;gap:4px}.page-btn{width:34px;height:34px;border:1px solid transparent;border-radius:6px;background:#fff;color:var(--muted)}.page-btn:hover:not(:disabled){background:#f3f4f4}.page-btn.active{background:var(--ink);color:#fff}.page-btn:disabled{opacity:.35;cursor:not-allowed}.drawer-layer{position:fixed;inset:0;z-index:80;pointer-events:none;visibility:hidden}.drawer-layer.open{pointer-events:auto;visibility:visible}.drawer-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.28);opacity:0;transition:opacity .18s}.drawer-layer.open .drawer-backdrop{opacity:1}.drawer{position:absolute;right:0;top:0;height:100%;width:min(480px,100vw);background:#fff;box-shadow:-10px 0 30px rgba(0,0,0,.1);transform:translateX(100%);transition:transform .22s;display:flex;flex-direction:column}.drawer-layer.open .drawer{transform:translateX(0)}.drawer-header{height:72px;padding:0 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}.drawer-title h2{margin:0;font-size:18px;font-weight:500}.drawer-title span{display:block;margin-top:4px;color:var(--faint);font:11px Roboto}.drawer-body{padding:24px;overflow:auto}.detail-amount{padding:20px;border-radius:8px;background:#f7f8f8;display:flex;justify-content:space-between}.detail-amount strong{font:600 24px Roboto;color:var(--ink)}.detail-section{margin-top:28px}.detail-section h3{margin:0 0 14px;font-size:14px;font-weight:500}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px}.detail-item span,.detail-item strong{display:block}.detail-item span{color:var(--faint);font-size:12px}.detail-item strong{margin-top:5px;font-size:13px;font-weight:500}.drawer-footer{margin-top:auto;padding:16px 24px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px}.toast{position:fixed;left:50%;bottom:28px;z-index:120;transform:translate(-50%,18px);min-height:44px;padding:0 16px;border-radius:8px;background:var(--ink);color:#fff;display:flex;align-items:center;gap:9px;opacity:0;pointer-events:none;transition:opacity .16s,transform .16s}.toast.show{opacity:1;transform:translate(-50%,0)}.toast .icon{color:#80d66b}
@media(max-width:1180px){:root{--sidebar:76px}.brand-word,.nav-label,.nav-item span,.account>span{display:none}.brand{padding:0;justify-content:center}.nav-item{justify-content:center;padding:0}.nav-item.active::after{position:absolute;right:4px}.account{justify-content:center}.filter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.filter-grid .field:first-child{grid-column:span 3}.filter-actions{grid-column:span 3;justify-content:flex-end}}
@media(max-width:760px){:root{--sidebar:0px}.app-shell{display:block}.sidebar{display:none}#yipex-page{padding:20px 16px 36px}.page-header{flex-direction:column;margin-bottom:20px}.page-title{font-size:24px}.header-actions{width:100%}.filter-grid{grid-template-columns:1fr;padding:16px;gap:14px}.filter-grid .field:first-child,.filter-actions{grid-column:auto}.filter-actions{justify-content:flex-end}.panel-header{padding:14px 16px;align-items:flex-start;flex-direction:column}.table-tools{width:100%;justify-content:space-between;flex-wrap:wrap}.orders-table{min-width:860px}.drawer-header,.drawer-body,.drawer-footer{padding-left:18px;padding-right:18px}.detail-grid{grid-template-columns:1fr 1fr}}
</style></head><body><div class="app-shell"><aside class="sidebar" aria-label="主导航"><div class="brand"><span class="brand-mark">Y</span><span class="brand-word">YiPex<i>.</i></span></div><nav class="nav"><div class="nav-label">业务管理</div>${navHtml}</nav><div class="sidebar-bottom"><div class="account"><span class="avatar">${icon('user')}</span><span><strong>${escape(page.shell?.header?.userName || '订单运营')}</strong><small>${escape(page.shell?.header?.email || '运营工作台')}</small></span></div></div></aside><main id="yipex-page" data-component="${escape(root.id)}"><header class="page-header"><div><div class="title-row"><h1 class="page-title">${escape(props.title || metadata.pageName)}</h1><span class="demo-tag">${escape(props.demoLabel || '演示数据')}</span></div><p class="subtitle">${escape(props.subtitle || '')} · 更新于 ${escape(data.updatedAt || '')}</p></div></header><section class="panel filter-panel"><header class="panel-header"><div class="panel-title"><h2>查询条件</h2><small>支持组合筛选</small></div></header><form id="filter-form" class="filter-grid"><div class="field"><label for="keyword">关键词</label><input id="keyword" type="search" placeholder="订单号、商户或客户" aria-label="搜索订单号、商户或客户"></div><div class="field"><label for="start-date">创建日期</label><div class="date-range"><input id="start-date" type="date" aria-label="开始日期" value="${escape(page.states?.start || '')}"><span>至</span><input id="end-date" type="date" aria-label="结束日期" value="${escape(page.states?.end || '')}"></div></div><div class="field"><label for="status">订单状态</label><select id="status">${statusOptions}</select></div><div class="field"><label for="channel">支付渠道</label><select id="channel">${channelOptions}</select></div><div class="filter-actions"><button class="btn" id="reset-filter" type="button">重置</button><button class="btn primary" type="submit">${icon('search')}查询</button></div></form></section><section class="panel table-panel"><header class="panel-header"><div class="panel-title"><h2>订单结果</h2><small id="table-count"></small></div><div class="table-tools"><div class="selected-summary" id="selected-summary"><span>已选 <b id="selected-count">0</b> 条</span><button class="btn" id="export-selected" type="button">${icon('download')}导出所选</button></div><button class="btn" id="export-orders" type="button">${icon('download')}导出全部</button></div></header><div class="table-scroll"><table class="orders-table"><thead><tr><th><input id="select-all" type="checkbox" aria-label="选择当前页全部订单"></th><th>订单号</th><th>商户 / 客户</th><th>订单金额</th><th>状态</th><th>支付渠道</th><th>商品数</th><th>创建时间</th><th>操作</th></tr></thead><tbody id="orders-body"></tbody></table></div><footer class="table-footer"><span id="page-summary"></span><div class="pagination" id="pagination" aria-label="表格分页"></div></footer></section></main></div><div class="drawer-layer" id="drawer-layer" aria-hidden="true"><div class="drawer-backdrop" data-close-drawer></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-heading"><header class="drawer-header"><div class="drawer-title"><h2 id="drawer-heading">订单详情</h2><span id="drawer-order-id"></span></div><button class="btn icon-only" id="close-drawer" type="button" aria-label="关闭详情" title="关闭详情">${icon('x')}</button></header><div class="drawer-body" id="drawer-body"></div><footer class="drawer-footer"><button class="btn" type="button" data-close-drawer>关闭</button><button class="btn primary" id="mark-processed" type="button">标记为已跟进</button></footer></aside></div><div class="toast" id="toast" role="status" aria-live="polite">${icon('checkCircle')}<span></span></div><script id="query-data" type="application/json">${embedded}</script><script>
(() => { const payload=JSON.parse(document.getElementById('query-data').textContent), source=payload.data, initial=payload.initialState||{}; const state={query:initial.query||'',start:initial.start||'',end:initial.end||'',status:initial.status||source.statuses[0],channel:initial.channel||source.channels[0],page:1,pageSize:initial.pageSize||5,selected:new Set()}; const $=(id)=>document.getElementById(id); const els={form:$('filter-form'),keyword:$('keyword'),start:$('start-date'),end:$('end-date'),status:$('status'),channel:$('channel'),body:$('orders-body'),count:$('table-count'),summary:$('page-summary'),pagination:$('pagination'),selectAll:$('select-all'),selectedSummary:$('selected-summary'),selectedCount:$('selected-count'),drawer:$('drawer-layer'),drawerBody:$('drawer-body'),drawerId:$('drawer-order-id'),toast:$('toast')}; const text=(v)=>String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); const money=(v)=>'¥'+Number(v).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}); let timer,lastFocus; function toast(msg){clearTimeout(timer);els.toast.querySelector('span').textContent=msg;els.toast.classList.add('show');timer=setTimeout(()=>els.toast.classList.remove('show'),2400)} function rows(){const q=state.query.trim().toLowerCase();return source.records.filter((r)=>{const day=r.createdAt.slice(0,10),hay=[r.id,r.merchant,r.customer,r.status,r.channel].join(' ').toLowerCase();return (!state.start||day>=state.start)&&(!state.end||day<=state.end)&&(!q||hay.includes(q))&&(state.status===source.statuses[0]||r.status===state.status)&&(state.channel===source.channels[0]||r.channel===state.channel)})} function statusClass(s){return s==='待支付'?'waiting':s==='处理中'?'processing':s==='已完成'?'completed':'closed'} function render(){const all=rows(),pages=Math.max(1,Math.ceil(all.length/state.pageSize));if(state.page>pages)state.page=pages;const start=(state.page-1)*state.pageSize,visible=all.slice(start,start+state.pageSize);els.count.textContent='共 '+all.length+' 条';els.body.innerHTML=visible.length?visible.map((r)=>'<tr><td><input class="row-check" type="checkbox" data-id="'+text(r.id)+'" aria-label="选择订单 '+text(r.id)+'" '+(state.selected.has(r.id)?'checked':'')+'></td><td><button class="order-link" type="button" data-detail="'+text(r.id)+'">'+text(r.id)+'</button></td><td><span class="merchant-name">'+text(r.merchant)+'</span><span class="merchant-sub">'+text(r.customer)+'</span></td><td><span class="amount">'+money(r.amount)+'</span></td><td><span class="status-pill '+statusClass(r.status)+'">'+text(r.status)+'</span></td><td>'+text(r.channel)+'</td><td>'+r.items+'</td><td>'+text(r.createdAt)+'</td><td><button class="detail-btn" type="button" data-detail="'+text(r.id)+'">详情</button></td></tr>').join(''):'<tr class="empty-row"><td colspan="9"><div class="empty-state">${icon('search')}<strong>没有符合条件的订单</strong><span>调整筛选条件后重试</span></div></td></tr>';els.summary.textContent=all.length?'显示 '+(start+1)+'-'+Math.min(start+state.pageSize,all.length)+' 条，共 '+all.length+' 条':'显示 0 条，共 0 条';els.pagination.innerHTML='<button class="page-btn" type="button" data-page="prev" '+(state.page===1?'disabled':'')+' aria-label="上一页">‹</button>'+Array.from({length:pages},(_,i)=>'<button class="page-btn '+(state.page===i+1?'active':'')+'" type="button" data-page="'+(i+1)+'" aria-label="第 '+(i+1)+' 页">'+(i+1)+'</button>').join('')+'<button class="page-btn" type="button" data-page="next" '+(state.page===pages?'disabled':'')+' aria-label="下一页">›</button>';const ids=visible.map((r)=>r.id);els.selectAll.checked=ids.length>0&&ids.every((id)=>state.selected.has(id));els.selectAll.indeterminate=ids.some((id)=>state.selected.has(id))&&!els.selectAll.checked;els.selectedCount.textContent=state.selected.size;els.selectedSummary.classList.toggle('visible',state.selected.size>0)} function csv(list){if(!list.length){toast('当前没有可导出的订单');return}const lines=[['订单号','创建时间','商户','客户','金额','状态','支付渠道','商品数'],...list.map((r)=>[r.id,r.createdAt,r.merchant,r.customer,r.amount,r.status,r.channel,r.items])];const blob=new Blob(['\\uFEFF'+lines.map((row)=>row.map((v)=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yipex-orders.csv';a.click();URL.revokeObjectURL(url);toast('已导出 '+list.length+' 条订单')} function openDetail(id,trigger){const r=source.records.find((x)=>x.id===id);if(!r)return;lastFocus=trigger;els.drawerId.textContent=r.id;els.drawerBody.innerHTML='<div class="detail-amount"><span>订单金额</span><strong>'+money(r.amount)+'</strong></div><section class="detail-section"><h3>订单信息</h3><div class="detail-grid"><div class="detail-item"><span>订单状态</span><strong>'+text(r.status)+'</strong></div><div class="detail-item"><span>支付渠道</span><strong>'+text(r.channel)+'</strong></div><div class="detail-item"><span>商户</span><strong>'+text(r.merchant)+'</strong></div><div class="detail-item"><span>客户</span><strong>'+text(r.customer)+'</strong></div><div class="detail-item"><span>商品数量</span><strong>'+r.items+' 件</strong></div><div class="detail-item"><span>跟进人</span><strong>'+text(r.owner)+'</strong></div><div class="detail-item"><span>创建时间</span><strong>'+text(r.createdAt)+'</strong></div></div></section>';els.drawer.classList.add('open');els.drawer.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';$('close-drawer').focus()} function closeDetail(){els.drawer.classList.remove('open');els.drawer.setAttribute('aria-hidden','true');document.body.style.overflow='';if(lastFocus)lastFocus.focus()} els.form.addEventListener('submit',(e)=>{e.preventDefault();const start=els.start.value,end=els.end.value;if(start&&end&&start>end){toast('开始日期不能晚于结束日期');return}state.query=els.keyword.value;state.start=start;state.end=end;state.status=els.status.value;state.channel=els.channel.value;state.page=1;render();toast('查询条件已应用')});$('reset-filter').addEventListener('click',()=>{els.keyword.value='';els.start.value=initial.start||'';els.end.value=initial.end||'';els.status.value=source.statuses[0];els.channel.value=source.channels[0];state.query='';state.start=initial.start||'';state.end=initial.end||'';state.status=source.statuses[0];state.channel=source.channels[0];state.page=1;render();toast('已重置查询条件')});els.body.addEventListener('click',(e)=>{const b=e.target.closest('[data-detail]');if(b)openDetail(b.dataset.detail,b)});els.body.addEventListener('change',(e)=>{if(!e.target.matches('.row-check'))return;e.target.checked?state.selected.add(e.target.dataset.id):state.selected.delete(e.target.dataset.id);render()});els.selectAll.addEventListener('change',()=>{rows().slice((state.page-1)*state.pageSize,state.page*state.pageSize).forEach((r)=>els.selectAll.checked?state.selected.add(r.id):state.selected.delete(r.id));render()});els.pagination.addEventListener('click',(e)=>{const b=e.target.closest('[data-page]');if(!b||b.disabled)return;const pages=Math.max(1,Math.ceil(rows().length/state.pageSize));state.page=b.dataset.page==='prev'?Math.max(1,state.page-1):b.dataset.page==='next'?Math.min(pages,state.page+1):Number(b.dataset.page);render()});$('export-orders').addEventListener('click',()=>csv(rows()));$('export-selected').addEventListener('click',()=>csv(source.records.filter((r)=>state.selected.has(r.id))));$('close-drawer').addEventListener('click',closeDetail);document.querySelectorAll('[data-close-drawer]').forEach((b)=>b.addEventListener('click',closeDetail));$('mark-processed').addEventListener('click',()=>{toast('已记录跟进状态');closeDetail()});document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&els.drawer.classList.contains('open'))closeDetail()});els.status.value=state.status;els.channel.value=state.channel;render() })();
</script></body></html>`;
}

function renderAntQueryList(pageSpec) {
  const { metadata, page } = pageSpec;
  const root = page.root;
  const data = page.data || {};
  const props = root.props || {};
  const shellDir = resolve(process.cwd(), 'modules/yipex/shell');
  const template = readFileSync(resolve(shellDir, 'shell.template.html'), 'utf8');
  const shellCss = readFileSync(resolve(shellDir, 'shell.css'), 'utf8');
  const shellRuntime = readFileSync(resolve(shellDir, 'shell-runtime.js'), 'utf8');
  const logo = readFileSync(resolve(shellDir, 'logo.svg')).toString('base64');
  const vendorPath = (file) => relative(dirname(specPath), resolve(shellDir, 'vendor', file)).split(sep).join('/');
  const shell = page.shell || {};
  const header = shell.header || {};
  const brand = shell.brand || {};
  const footer = shell.footer || {};
  const navIcons = ['AppstoreOutlined', 'FileSearchOutlined', 'ShopOutlined', 'LineChartOutlined', 'SafetyOutlined'];
  const navigation = (shell.navigation || []).map((item, index) => `<a class="yipex-shell-nav-item" data-antd-component="Menu.Item" data-menu-key="${escape(item.id)}" href="#${escape(item.id)}" title="${escape(item.label || item.id)}" ${item.active ? 'aria-current="page"' : ''}><span class="nav-icon anticon" data-antd-icon="${escape(item.icon || navIcons[index] || 'AppstoreOutlined')}" aria-hidden="true"></span><span>${escape(item.label || item.id)}</span></a>`).join('');
  const content = '<div id="query-list-app" data-antd-component="QueryListApp"><div class="query-loading" role="status" aria-live="polite"><span class="query-loading-spinner" aria-hidden="true"></span><span>正在加载查询列表</span></div></div>';
  const values = { brandMark: brand.mark || 'Y', brandLogo: logo, brandName: brand.name || 'Yipex', welcome: header.welcome || metadata.pageName, userName: header.userName || '用户', email: header.email || 'user@yipex.tech', avatar: header.avatar || (header.userName || '用').slice(0, 1), copyright: footer.copyright || 'Copyright Somei E-Commerce Limited 2025. All rights reserved', navigation, content };
  const body = Object.entries(values).reduce((source, [key, value]) => source.replaceAll(`{{${key}}}`, value), template);
  const embedded = JSON.stringify({ data, initialState: page.states || {}, pageName: metadata.pageName }).replace(/</g, '\\u003c');
  const pageCss = `
    :root{--yipex-control-height:32px;--query-ink:#222;--query-text:rgba(0,0,0,.85);--query-muted:rgba(0,0,0,.58);--query-faint:rgba(0,0,0,.42);--query-line:#e7e8e8;--query-canvas:#f6f7f8;--query-brand:#4aa52e;--query-radius:8px}
    #query-list-app{min-height:100%}.yipex-drawer .ant-drawer-header-title{display:flex;align-items:center;justify-content:space-between;width:100%}.yipex-drawer .ant-drawer-title{order:1}.yipex-drawer .ant-drawer-close{order:2;margin-inline-end:0;margin-inline-start:12px}.yipex-drawer .ant-drawer-body{padding:24px}.yipex-drawer .ant-drawer-footer{text-align:right;padding:16px 24px}.query-loading{min-height:420px;display:grid;place-content:center;justify-items:center;gap:12px;color:var(--query-muted);font-size:14px}.query-loading-spinner{width:22px;height:22px;border:2px solid #dfead9;border-top-color:var(--query-brand);border-radius:50%;animation:query-spin .8s linear infinite}@keyframes query-spin{to{transform:rotate(360deg)}}.query-page{max-width:1440px;margin:0 auto}.query-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:16px}.query-title-row{display:flex;align-items:center;gap:10px}.query-title{margin:0;color:var(--query-ink);font-size:20px;font-weight:500;line-height:1.4}.query-demo{height:24px;display:inline-flex;align-items:center;padding:0 8px;border-radius:4px;background:#eff0f1;color:var(--query-muted);font-size:12px}.query-section{margin-bottom:16px;border:0!important;box-shadow:none!important}.query-section.ant-card{border:0;box-shadow:none}.query-section .ant-card-head{border-bottom:0}.query-section .ant-card-head-title{font-weight:500}.query-section .ant-card-body{padding:16px 0}.query-filter-section{margin-bottom:0;padding-bottom:16px;border-bottom:1px solid var(--query-line)}.query-filter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:end}.query-filter-actions{grid-column:1 / -1;display:flex;gap:8px;justify-content:flex-end}.query-result-section{padding-top:16px}.query-section .ant-form-item{margin-bottom:0}.query-result-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.query-result-tools{display:flex;align-items:center;gap:8px}.query-selected{color:var(--query-muted);font-size:12px}.query-id,.query-section .ant-btn-link{padding:0;border:0;background:transparent;color:var(--query-brand);font-weight:500;cursor:pointer}.query-id:hover,.query-section .ant-btn-link:hover{color:#357d21;text-decoration:underline}.query-merchant{display:block;color:var(--query-text);font-weight:500}.query-customer{display:block;margin-top:3px;color:var(--query-faint);font-size:12px}.query-pagination{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:16px}.query-page-summary{color:var(--query-muted);font-size:12px}.query-drawer-summary{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;margin-bottom:20px;background:#f7f8f8;border-radius:8px}.query-drawer-summary strong{font:600 24px Roboto;color:var(--query-ink)}
    @media(max-width:680px){.query-header{flex-direction:column;margin-bottom:16px}.query-filter-grid{grid-template-columns:1fr}.query-filter-actions{grid-column:auto;justify-content:flex-end}.query-result-head{align-items:flex-start;flex-direction:column}.query-result-tools{width:100%;justify-content:flex-end;flex-wrap:wrap}.query-pagination{align-items:flex-start;flex-direction:column}.query-pagination .ant-pagination{align-self:flex-end}}
  `;
  const appScript = `
    (() => {
      const h = React.createElement;
      const { ConfigProvider, Card, Form, Input, Select, DatePicker, Button, Table, Pagination, Drawer, Modal, Descriptions, Empty, Tag, Space, Typography, message } = antd;
      const { SearchOutlined } = window.icons || {};
      const payload = JSON.parse(document.getElementById('query-data').textContent);
      const source = payload.data;
      const initial = payload.initialState || {};
      const allStatus = source.statuses[0];
      const allChannel = source.channels[0];
      const statusColor = { '待支付':'orange', '处理中':'blue', '已完成':'green', '已关闭':'default' };
      const money = (value) => '¥' + Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const safe = (value) => String(value == null ? '' : value);
      function App() {
        const [form] = Form.useForm();
        const [filters, setFilters] = React.useState({ query: initial.query || '', status: initial.status || allStatus, channel: initial.channel || allChannel, start: initial.start || '', end: initial.end || '' });
        const [selectedKeys, setSelectedKeys] = React.useState([]);
        const [page, setPage] = React.useState(1);
        const [drawerRecord, setDrawerRecord] = React.useState(null);
        const filtered = source.records.filter((record) => { const day = record.createdAt.slice(0, 10); const q = filters.query.trim().toLowerCase(); const hay = [record.id, record.merchant, record.customer, record.status, record.channel].join(' ').toLowerCase(); return (!filters.start || day >= filters.start) && (!filters.end || day <= filters.end) && (!q || hay.includes(q)) && (filters.status === allStatus || record.status === filters.status) && (filters.channel === allChannel || record.channel === filters.channel); });
        const pageSize = initial.pageSize || 5;
        const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
        const exportCsv = (rows) => { if (!rows.length) { message.info('当前没有可导出的订单'); return; } const lines = [['订单号','创建时间','商户','客户','金额','状态','支付渠道','商品数'], ...rows.map((record) => [record.id, record.createdAt, record.merchant, record.customer, record.amount, record.status, record.channel, record.items])]; const csv = '\\uFEFF' + lines.map((line) => line.map((value) => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = 'yipex-orders.csv'; link.click(); message.success('已导出 ' + rows.length + ' 条订单'); };
        const submit = (values) => { const range = values.dateRange || []; setFilters({ query: values.keyword || '', status: values.status || allStatus, channel: values.channel || allChannel, start: range[0] ? range[0].format('YYYY-MM-DD') : '', end: range[1] ? range[1].format('YYYY-MM-DD') : '' }); setPage(1); message.success('查询条件已应用'); };
        const reset = () => { form.resetFields(); setFilters({ query: '', status: allStatus, channel: allChannel, start: initial.start || '', end: initial.end || '' }); setPage(1); message.info('已重置查询条件'); };
        const columns = [{ title: '订单号', dataIndex: 'id', width: 170, render: (value, record) => h(Button, { size: 'middle', type: 'link', className: 'query-id', onClick: () => setDrawerRecord(record) }, value) }, { title: '商户 / 客户', dataIndex: 'merchant', width: 220, render: (value, record) => h('div', null, h('span', { className: 'query-merchant' }, value), h('span', { className: 'query-customer' }, record.customer)) }, { title: '订单金额', dataIndex: 'amount', width: 130, render: (value) => h('span', { className: 'amount' }, money(value)) }, { title: '状态', dataIndex: 'status', width: 110, render: (value) => h(Tag, { color: statusColor[value] }, value) }, { title: '支付渠道', dataIndex: 'channel', width: 120 }, { title: '商品数', dataIndex: 'items', width: 90, render: (value) => value + ' 件' }, { title: '创建时间', dataIndex: 'createdAt', width: 160 }, { title: '操作', key: 'action', width: 90, render: (_, record) => h(Button, { size: 'middle', type: 'link', onClick: () => setDrawerRecord(record) }, '详情') }];
        return h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { borderRadius: 8, controlHeight: 32, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' }, components: { Table: { rowSelectedBg: '#F5F5F5', rowSelectedHoverBg: '#EDEDED' }, Select: { optionSelectedBg: '#F5F5F5', optionActiveBg: '#FAFAFA' } } } }, h('div', { className: 'query-page' }, h('header', { className: 'query-header' }, h('div', null, h('div', { className: 'query-title-row' }, h('h1', { className: 'query-title' }, payload.pageName), h('span', { className: 'query-demo' }, '演示数据')), h('p', { className: 'query-subtitle' }, ${JSON.stringify(props.subtitle || '按条件检索订单并查看处理进度')} + ' · 更新于 ' + ${JSON.stringify(data.updatedAt || '')}))), h(Card, { className: 'query-section', title: '查询条件', size: 'small' }, h(Form, { form: form, layout: 'vertical', onFinish: submit, initialValues: { keyword: initial.query || '', status: initial.status || allStatus, channel: initial.channel || allChannel } }, h('div', { className: 'query-filter-grid' }, h(Form.Item, { className: 'query-keyword', label: '关键词', name: 'keyword' }, h(Input, { allowClear: true, placeholder: '订单号、商户或客户', prefix: SearchOutlined ? h(SearchOutlined) : null })), h(Form.Item, { label: '创建日期', name: 'dateRange' }, h(DatePicker.RangePicker, { style: { width: '100%' }, placeholder: ['开始日期', '结束日期'], format: 'YYYY-MM-DD' })), h(Form.Item, { label: '订单状态', name: 'status' }, h(Select, { options: source.statuses.map((value) => ({ label: value, value })) })), h(Form.Item, { label: '支付渠道', name: 'channel' }, h(Select, { options: source.channels.map((value) => ({ label: value, value })) })), h('div', { className: 'query-filter-actions' }, h(Button, { icon: ReloadOutlined ? h(ReloadOutlined) : null, onClick: reset }, '重置'), h(Button, { type: 'primary', htmlType: 'submit', icon: SearchOutlined ? h(SearchOutlined) : null }, '查询'))))), h(Card, { className: 'query-section', size: 'small', title: h('div', { className: 'query-result-head' }, h('span', null, '订单结果 ', h(Typography.Text, { type: 'secondary' }, '共 ' + filtered.length + ' 条')), h('div', { className: 'query-result-tools' }, selectedKeys.length ? h('span', { className: 'query-selected' }, '已选 ' + selectedKeys.length + ' 条') : null, h(Button, { icon: DownloadOutlined ? h(DownloadOutlined) : null, onClick: () => exportCsv(selectedKeys.length ? source.records.filter((record) => selectedKeys.includes(record.id)) : filtered) }, selectedKeys.length ? '导出所选' : '导出全部'))), h(Table, { rowKey: 'id', columns: columns, dataSource: visible, pagination: false, size: 'middle', scroll: { x: 980 }, rowSelection: { selectedRowKeys: selectedKeys, onChange: setSelectedKeys }, locale: { emptyText: h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: '没有符合条件的订单' }) } }), h('div', { className: 'query-pagination' }, h(Pagination, { current: page, pageSize: pageSize, total: filtered.length, showSizeChanger: false, showTotal: (total, range) => '显示 ' + range[0] + '-' + range[1] + ' 条，共 ' + total + ' 条', onChange: setPage }))), h(Drawer, { title: drawerRecord ? '订单详情' : '订单详情', open: Boolean(drawerRecord), width: 480, onClose: () => setDrawerRecord(null), footer: h(Space, null, h(Button, { onClick: () => setDrawerRecord(null) }, '关闭'), h(Button, { type: 'primary', icon: CheckOutlined ? h(CheckOutlined) : null, onClick: () => { message.success('已记录跟进状态'); setDrawerRecord(null); } }, '标记为已跟进')) }, drawerRecord ? h(React.Fragment, null, h('div', { className: 'query-drawer-summary' }, h('span', null, '订单金额'), h('strong', null, money(drawerRecord.amount))), h(Descriptions, { column: 1, bordered: false, size: 'small' }, h(Descriptions.Item, { label: '订单号' }, safe(drawerRecord.id)), h(Descriptions.Item, { label: '订单状态' }, h(Tag, { color: statusColor[drawerRecord.status] }, drawerRecord.status)), h(Descriptions.Item, { label: '支付渠道' }, safe(drawerRecord.channel)), h(Descriptions.Item, { label: '商户' }, safe(drawerRecord.merchant)), h(Descriptions.Item, { label: '客户' }, safe(drawerRecord.customer)), h(Descriptions.Item, { label: '商品数量' }, drawerRecord.items + ' 件'), h(Descriptions.Item, { label: '跟进人' }, safe(drawerRecord.owner)), h(Descriptions.Item, { label: '创建时间' }, safe(drawerRecord.createdAt))) : null));
      }
      ReactDOM.createRoot(document.getElementById('query-list-app')).render(h(App));
    })();
  `;
  const fixedAppScript = appScript.replace(/        return h\(ConfigProvider,[^\n]*\n/, [
    `        const headerNode = h('header', { className: 'query-header' }, h('div', null, h('div', { className: 'query-title-row' }, h('h1', { className: 'query-title' }, payload.pageName), h('span', { className: 'query-demo' }, '演示数据'))));`,
    `        const filterNode = h('section', { className: 'query-section query-filter-section' }, h(Form, { form: form, layout: 'vertical', onFinish: submit, size: 'middle', initialValues: { keyword: initial.query || '', status: initial.status || allStatus, channel: initial.channel || allChannel, dateRange: initial.start && initial.end ? [dayjs(initial.start), dayjs(initial.end)] : undefined } }, h('div', { className: 'query-filter-grid' }, [h(Form.Item, { className: 'query-keyword', label: '关键词', name: 'keyword' }, h(Input, { size: 'middle', allowClear: true, placeholder: '订单号、商户或客户', prefix: SearchOutlined ? h(SearchOutlined) : null })), h(Form.Item, { label: '创建日期', name: 'dateRange' }, h(DatePicker.RangePicker, { size: 'middle', style: { width: '100%' }, placeholder: ['开始日期', '结束日期'], format: 'YYYY-MM-DD' })), h(Form.Item, { label: '订单状态', name: 'status' }, h(Select, { size: 'middle', options: source.statuses.map((value) => ({ label: value, value })) })), h(Form.Item, { label: '支付渠道', name: 'channel' }, h(Select, { size: 'middle', options: source.channels.map((value) => ({ label: value, value })) })), h('div', { className: 'query-filter-actions' }, [h(Button, { size: 'middle', onClick: reset }, '重置'), h(Button, { size: 'middle', type: 'primary', htmlType: 'submit' }, '查询')])] )));`,
    `        const resultTitle = h('div', { className: 'query-result-head' }, [h('span', null, '订单结果 ', h(Typography.Text, { type: 'secondary' }, '共 ' + filtered.length + ' 条')), h('div', { className: 'query-result-tools' }, [selectedKeys.length ? h('span', { className: 'query-selected' }, '已选 ' + selectedKeys.length + ' 条') : null, h(Button, { size: 'middle', onClick: () => exportCsv(selectedKeys.length ? source.records.filter((record) => selectedKeys.includes(record.id)) : filtered) }, selectedKeys.length ? '导出所选' : '导出全部')])] );`,
    `        const pageSummary = filtered.length ? '显示 ' + ((page - 1) * pageSize + 1) + '-' + Math.min(page * pageSize, filtered.length) + ' 条，共 ' + filtered.length + ' 条' : '显示 0 条，共 0 条';`,
    `        const resultNode = h(Card, { className: 'query-section query-result-section', bordered: false, size: 'small', title: resultTitle }, [h(Table, { rowKey: 'id', columns: columns, dataSource: visible, pagination: false, size: 'middle', scroll: { x: 980 }, rowSelection: { selectedRowKeys: selectedKeys, onChange: setSelectedKeys }, locale: { emptyText: h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: '没有符合条件的订单' }) } }), h('div', { className: 'query-pagination' }, [h('span', { className: 'query-page-summary' }, pageSummary), h(Pagination, { size: 'middle', current: page, pageSize: pageSize, total: filtered.length, showSizeChanger: false, showTotal: false, onChange: setPage })])]);`,
    `        const drawerFooter = h(Space, null, [h(Button, { size: 'middle', onClick: () => setDrawerRecord(null) }, '关闭'), h(Button, { size: 'middle', type: 'primary', onClick: () => { message.success('已记录跟进状态'); setDrawerRecord(null); } }, '标记为已跟进')]);`,
    `        const drawerBody = drawerRecord ? h(React.Fragment, null, [h('div', { className: 'query-drawer-summary' }, [h('span', null, '订单金额'), h('strong', null, money(drawerRecord.amount))]), h(Descriptions, { column: 2, bordered: false, size: 'small' }, [h(Descriptions.Item, { label: '订单号' }, safe(drawerRecord.id)), h(Descriptions.Item, { label: '订单状态' }, h(Tag, { color: statusColor[drawerRecord.status] }, drawerRecord.status)), h(Descriptions.Item, { label: '支付渠道' }, safe(drawerRecord.channel)), h(Descriptions.Item, { label: '商户' }, safe(drawerRecord.merchant)), h(Descriptions.Item, { label: '客户' }, safe(drawerRecord.customer)), h(Descriptions.Item, { label: '商品数量' }, drawerRecord.items + ' 件'), h(Descriptions.Item, { label: '跟进人' }, safe(drawerRecord.owner)), h(Descriptions.Item, { label: '创建时间' }, safe(drawerRecord.createdAt))])] ) : null;`,
    `        const drawerNode = h(Modal, { className: 'yipex-modal', title: '订单详情', open: Boolean(drawerRecord), width: window.innerWidth <= 680 ? 'calc(100vw - 32px)' : 720, onCancel: () => setDrawerRecord(null), footer: drawerFooter, centered: true }, drawerBody);`,
    `        return h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { borderRadius: 8, controlHeight: 32, controlHeightSM: 24, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' }, components: { Table: { rowSelectedBg: '#F5F5F5', rowSelectedHoverBg: '#EDEDED' }, Select: { optionSelectedBg: '#F5F5F5', optionActiveBg: '#FAFAFA' } } } }, h('div', { className: 'query-page' }, [headerNode, filterNode, resultNode, drawerNode]));`
  ].join('\n'));
  const runtimeAssets = ['react.production.min.js', 'react-dom.production.min.js', 'dayjs.min.js', 'dayjs-zh-cn.js', 'antd.min.js', 'ant-design-icons.umd.js'];
  const preloads = runtimeAssets.map((asset) => `<link rel="preload" as="script" href="${vendorPath(asset)}">`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${vendorPath("antd-reset.css")}">${preloads}<title>${escape(metadata.pageName)} | YiPex</title><style>${shellCss}${pageCss}</style></head><body>${body}<script id="query-data" type="application/json">${embedded}</script><script defer src="${vendorPath("react.production.min.js")}"><\/script><script defer src="${vendorPath("react-dom.production.min.js")}"><\/script><script defer src="${vendorPath("dayjs.min.js")}"><\/script><script defer src="${vendorPath("dayjs-zh-cn.js")}"><\/script><script defer src="${vendorPath("antd.min.js")}"><\/script><script defer src="${vendorPath("ant-design-icons.umd.js")}"><\/script><script>${shellRuntime}</script><script>(() => { const start = () => { if (window.React && window.ReactDOM && window.antd && window.dayjs) { ${fixedAppScript} } else { window.requestAnimationFrame(start); } }; start(); })();</script></body></html>`;
}

function renderAntOrderDashboard(pageSpec) {
  const { metadata, page } = pageSpec;
  const data = page.data || {};
  const shellDir = resolve(process.cwd(), 'modules/yipex/shell');
  const template = readFileSync(resolve(shellDir, 'shell.template.html'), 'utf8');
  const shellCss = readFileSync(resolve(shellDir, 'shell.css'), 'utf8');
  const shellRuntime = readFileSync(resolve(shellDir, 'shell-runtime.js'), 'utf8');
  const logo = readFileSync(resolve(shellDir, 'logo.svg')).toString('base64');
  const shell = page.shell || {};
  const header = shell.header || {};
  const brand = shell.brand || {};
  const footer = shell.footer || {};
  const navigation = (shell.navigation || []).map((item) => `<a class="yipex-shell-nav-item${item.active ? ' active' : ''}" data-antd-component="Menu.Item" data-menu-key="${escape(item.id)}" href="#${escape(item.id)}" title="${escape(item.label || item.id)}" ${item.active ? 'aria-current="page"' : ''}><span class="nav-icon anticon" data-antd-icon="${escape(item.icon || 'AppstoreOutlined')}" aria-hidden="true"></span><span>${escape(item.label || item.id)}</span></a>`).join('');
  const content = '<div id="order-dashboard-app" data-antd-component="OrderAnalysisDashboard"><div class="dashboard-loading" role="status" aria-live="polite"><span class="dashboard-loading-spinner" aria-hidden="true"></span><span>正在加载经营分析</span></div></div>';
  const values = {
    brandLogo: logo,
    brandName: brand.name || 'Yipex',
    email: header.email || 'user@yipex.tech',
    avatar: header.avatar || (header.userName || '用').slice(0, 1),
    copyright: footer.copyright || 'Copyright Somei E-Commerce Limited 2025. All rights reserved',
    navigation,
    content
  };
  const body = Object.entries(values).reduce((source, [key, value]) => source.replaceAll(`{{${key}}}`, value), template);
  const embedded = JSON.stringify({ data, initialState: page.states || {}, pageName: metadata.pageName }).replace(/</g, '\\u003c');
  const vendorPath = (file) => relative(dirname(specPath), resolve(shellDir, 'vendor', file)).split(sep).join('/');
  const pageCss = `
    :root{--yipex-control-height:32px;--dash-ink:#222;--dash-text:rgba(0,0,0,.85);--dash-muted:rgba(0,0,0,.58);--dash-faint:rgba(0,0,0,.42);--dash-line:#e7e8e8;--dash-brand:#4aa52e;--dash-brand-dark:#357d21;--dash-danger:#d4380d;--dash-warning:#d48806}
    #order-dashboard-app{min-height:100%}.dashboard-loading{min-height:420px;display:grid;place-content:center;justify-items:center;gap:12px;color:var(--dash-muted)}.dashboard-loading-spinner{width:22px;height:22px;border:2px solid #dfead9;border-top-color:var(--dash-brand);border-radius:50%;animation:dashboard-spin .8s linear infinite}@keyframes dashboard-spin{to{transform:rotate(360deg)}}
    .dashboard-page{max-width:1440px;margin:0 auto}.dashboard-header{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:16px}.dashboard-title-row{display:flex;align-items:center;gap:10px}.dashboard-title{margin:0;color:var(--dash-ink);font-size:20px;font-weight:500;line-height:28px}.dashboard-demo{height:24px;display:inline-flex;align-items:center;padding:0 8px;border-radius:4px;background:#eff0f1;color:var(--dash-muted);font-size:12px}
    .dashboard-filter{padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid var(--dash-line);display:flex;align-items:flex-end;justify-content:space-between;gap:16px}.dashboard-filter-field{min-width:320px}.dashboard-filter-field>label{display:block;margin-bottom:8px;color:var(--dash-muted);font-size:12px}.dashboard-filter-actions{display:flex;align-items:center;gap:8px}
    .metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:16px}.metric-card.ant-card{border-color:var(--dash-line);box-shadow:none}.metric-card .ant-card-body{padding:16px}.metric-label{display:flex;align-items:center;justify-content:space-between;color:var(--dash-muted)}.metric-icon{color:var(--dash-faint);font-size:16px}.metric-card.is-alert .metric-icon{color:var(--dash-danger)}.metric-card .ant-statistic{margin-top:12px}.metric-card .ant-statistic-content{font-size:24px;line-height:32px}.metric-change{display:flex;align-items:center;gap:8px;margin-top:8px;color:var(--dash-faint);font-size:12px}.metric-change b{color:var(--dash-brand);font-weight:500}
    .dashboard-analysis{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.7fr);gap:16px;margin-bottom:16px}.analysis-card.ant-card{height:100%;border-color:var(--dash-line);box-shadow:none}.analysis-card .ant-card-head{min-height:calc(var(--yipex-control-height) + 16px);padding:0 16px;border-bottom:1px solid var(--dash-line)}.analysis-card .ant-card-head-title{padding:12px 0;font-weight:500}.analysis-card .ant-card-extra{padding:8px 0}.analysis-card .ant-card-body{padding:16px}.analysis-title{display:flex;align-items:center;gap:10px}.analysis-title small{color:var(--dash-faint);font-weight:400}.trend-total{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}.trend-total strong{font:600 22px/1.3 Roboto,"PingFang SC",sans-serif}.trend-total span{color:var(--dash-brand);font-size:12px}.trend-chart{height:238px}.trend-chart svg{display:block;width:100%;height:100%;overflow:visible}.trend-grid{stroke:#edf0ef;stroke-width:1}.trend-axis{fill:rgba(0,0,0,.42);font:11px Roboto,"PingFang SC",sans-serif}.trend-line{fill:none;stroke:var(--dash-brand);stroke-width:2.25;stroke-linecap:round;stroke-linejoin:round}.trend-dot{fill:#fff;stroke:var(--dash-brand);stroke-width:2}
    .status-layout{display:grid;grid-template-columns:140px minmax(0,1fr);align-items:center;gap:16px}.status-donut{width:140px;height:140px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#4aa52e 0 68.1%,#1677ff 68.1% 83%,#8c8c8c 83% 92.7%,#f5a623 92.7% 97.7%,#d4380d 97.7% 100%);position:relative}.status-donut::after{content:"";position:absolute;width:92px;height:92px;border-radius:50%;background:#fff}.status-center{position:relative;z-index:1;text-align:center}.status-center strong,.status-center span{display:block}.status-center strong{font:600 22px/1.2 Roboto,sans-serif}.status-center span{margin-top:4px;color:var(--dash-faint);font-size:12px}.status-list{display:grid;gap:2px}.status-button.ant-btn{width:100%;height:34px;padding:0 6px;display:flex;align-items:center;justify-content:space-between;color:var(--dash-text)}.status-button.is-active{background:#f2f7f0}.status-name{display:flex;align-items:center;gap:8px;white-space:nowrap}.status-dot{width:8px;height:8px;border-radius:50%;background:var(--status-color)}.status-count{display:flex;align-items:center;gap:8px}.status-count b{font:500 13px Roboto,sans-serif}.status-count small{width:42px;color:var(--dash-faint);text-align:right;font:11px Roboto,sans-serif}
    .result-section{padding-top:0}.result-card.ant-card{border:0;box-shadow:none}.result-card>.ant-card-head{min-height:calc(var(--yipex-control-height) + 16px);padding:0;border-bottom:0}.result-card>.ant-card-head .ant-card-head-title{padding:8px 0}.result-card>.ant-card-head .ant-card-extra{padding:4px 0}.result-card>.ant-card-body{padding:0}.result-heading{display:flex;align-items:center;gap:8px}.result-heading small{color:var(--dash-faint);font-weight:400}.result-tools{display:flex;align-items:center;gap:8px}.result-tools .ant-input-affix-wrapper{width:260px}.selected-count{color:var(--dash-muted);font-size:12px}.order-link.ant-btn-link,.detail-link.ant-btn-link{padding:0;color:var(--dash-brand);font-weight:500}.order-link.ant-btn-link:hover,.detail-link.ant-btn-link:hover{color:var(--dash-brand-dark);text-decoration:underline}.merchant-main{display:block;color:var(--dash-text);font-weight:500}.merchant-sub{display:block;margin-top:3px;color:var(--dash-faint);font-size:12px}.amount{color:var(--dash-ink);font:500 13px Roboto,sans-serif}.reason-cell{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.result-pagination{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:16px}.page-summary{color:var(--dash-muted);font-size:12px}
    .yipex-drawer .ant-drawer-header-title{display:flex;align-items:center;justify-content:space-between;width:100%}.yipex-drawer .ant-drawer-title{order:1}.yipex-drawer .ant-drawer-close{order:2;margin-inline-end:0;margin-inline-start:12px}.yipex-drawer .ant-drawer-body{padding:24px}.yipex-drawer .ant-drawer-footer{text-align:right;padding:16px 24px}.drawer-amount{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;margin-bottom:16px;border-radius:8px;background:#f7f8f8}.drawer-amount strong{font:600 24px Roboto,sans-serif}.drawer-alert{margin-bottom:16px}.drawer-section-title{margin:24px 0 12px;color:var(--dash-text);font-weight:500}
    @media(max-width:1180px){.dashboard-analysis{grid-template-columns:1fr}.status-layout{grid-template-columns:160px minmax(0,1fr)}.status-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:880px){.dashboard-header{align-items:flex-start;flex-direction:column}.dashboard-filter{align-items:stretch;flex-direction:column}.dashboard-filter-field{min-width:0}.dashboard-filter-actions{justify-content:flex-end}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.result-card>.ant-card-head{align-items:flex-start;flex-direction:column}.result-card>.ant-card-head .ant-card-extra{width:100%}.result-tools{width:100%;flex-wrap:wrap}.result-tools .ant-input-affix-wrapper{min-width:220px;flex:1}}
    @media(max-width:620px){.metric-grid{gap:8px}.metric-card .ant-card-body{padding:12px}.metric-card .ant-statistic-content{font-size:19px}.dashboard-analysis{gap:8px}.status-layout{grid-template-columns:1fr}.status-donut{margin:0 auto}.status-list{grid-template-columns:1fr}.result-pagination{align-items:flex-start;flex-direction:column}.result-pagination .ant-pagination{align-self:flex-end}.dashboard-filter-actions .ant-btn{flex:1}.dashboard-filter-actions{width:100%}}
  `;
  const appScript = `
    (() => {
      const h = React.createElement;
      const { ConfigProvider, Card, Statistic, DatePicker, Button, Segmented, Input, Table, Pagination, Drawer, Modal, Descriptions, Empty, Tag, Space, Alert, Timeline, message } = antd;
      const { DownloadOutlined, SearchOutlined, LineChartOutlined, WarningOutlined } = window.icons || {};
      const payload = JSON.parse(document.getElementById('dashboard-data').textContent);
      const source = payload.data;
      const initial = payload.initialState || {};
      const money = (value) => '¥' + Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const metricValue = (metric) => metric.format === 'currency' ? Number(metric.value) : Number(metric.value);
      const riskColor = { '高':'red', '中':'orange', '低':'blue' };
      const statusTotal = source.statuses.reduce((sum, item) => sum + item.count, 0);

      function TrendChart({ points }) {
        if (!points.length) return h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: '当前日期范围暂无趋势数据' });
        const width = 820, height = 238, left = 54, right = 14, top = 12, bottom = 34;
        const values = points.map((item) => item.value);
        const min = Math.floor(Math.min(...values) / 10000) * 10000 - 5000;
        const max = Math.ceil(Math.max(...values) / 10000) * 10000 + 5000;
        const x = (index) => left + index * ((width - left - right) / Math.max(1, points.length - 1));
        const y = (value) => top + (max - value) * ((height - top - bottom) / Math.max(1, max - min));
        const path = points.map((item, index) => (index ? 'L' : 'M') + x(index).toFixed(1) + ' ' + y(item.value).toFixed(1)).join(' ');
        const children = [];
        for (let index = 0; index < 5; index += 1) {
          const gy = top + index * ((height - top - bottom) / 4);
          const value = max - index * ((max - min) / 4);
          children.push(h('line', { key: 'grid-' + index, className: 'trend-grid', x1: left, y1: gy, x2: width - right, y2: gy }));
          children.push(h('text', { key: 'axis-' + index, className: 'trend-axis', x: 0, y: gy + 4 }, '¥' + Math.round(value / 1000) + 'k'));
        }
        children.push(h('path', { key: 'line', className: 'trend-line', d: path }));
        points.forEach((item, index) => {
          children.push(h('circle', { key: 'dot-' + index, className: 'trend-dot', cx: x(index), cy: y(item.value), r: 3 }, h('title', null, item.date + ' ' + money(item.value))));
          if (index === 0 || index === points.length - 1 || index % Math.max(1, Math.floor(points.length / 5)) === 0) children.push(h('text', { key: 'label-' + index, className: 'trend-axis', textAnchor: 'middle', x: x(index), y: height - 8 }, item.date.slice(5).replace('-', '/')));
        });
        return h('div', { className: 'trend-chart' }, h('svg', { viewBox: '0 0 ' + width + ' ' + height, role: 'img', 'aria-label': '销售额趋势图' }, children));
      }

      function App() {
        const defaultRange = [dayjs(source.dateRange.start), dayjs(source.dateRange.end)];
        const [pendingRange, setPendingRange] = React.useState(defaultRange);
        const [dateRange, setDateRange] = React.useState([source.dateRange.start, source.dateRange.end]);
        const [trendRange, setTrendRange] = React.useState('本月');
        const [query, setQuery] = React.useState(initial.query || '');
        const [activeStatus, setActiveStatus] = React.useState(initial.activeStatus || 'all');
        const [selectedKeys, setSelectedKeys] = React.useState(initial.selectedOrderIds || []);
        const [pageNumber, setPageNumber] = React.useState(initial.page || 1);
        const [drawerRecord, setDrawerRecord] = React.useState(null);
        const pageSize = initial.pageSize || 5;
        let trendPoints = source.salesTrend.filter((item) => item.date >= dateRange[0] && item.date <= dateRange[1]);
        if (trendRange === '近7日') trendPoints = trendPoints.slice(-4);
        if (trendRange === '近14日') trendPoints = trendPoints.slice(-7);
        const trendTotal = trendRange === '本月' ? source.metrics.find((metric) => metric.id === 'sales').value : trendPoints.reduce((sum, item) => sum + item.value, 0);
        const filtered = source.anomalies.filter((record) => {
          const day = record.createdAt.slice(0, 10);
          const haystack = [record.id, record.merchant, record.customer, record.status, record.reason].join(' ').toLowerCase();
          const statusMatch = activeStatus === 'all' || activeStatus === 'abnormal';
          return day >= dateRange[0] && day <= dateRange[1] && statusMatch && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
        });
        const visible = filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
        const pageSummary = filtered.length ? '显示 ' + ((pageNumber - 1) * pageSize + 1) + '-' + Math.min(pageNumber * pageSize, filtered.length) + ' 条，共 ' + filtered.length + ' 条' : '显示 0 条，共 0 条';
        const exportCsv = (rows) => { if (!rows.length) { message.info('当前没有可导出的订单'); return; } const lines = [['订单号','创建时间','商户','客户','金额','状态','风险等级','支付渠道','异常原因'], ...rows.map((record) => [record.id, record.createdAt, record.merchant, record.customer, record.amount, record.status, record.risk, record.channel, record.reason])]; const csv = '\\uFEFF' + lines.map((line) => line.map((value) => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\\n'); const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.href = url; link.download = 'yipex-abnormal-orders.csv'; link.click(); URL.revokeObjectURL(url); message.success('已导出 ' + rows.length + ' 条异常订单'); };
        const applyDate = () => { if (!pendingRange || pendingRange.length !== 2) { message.warning('请选择完整日期范围'); return; } setDateRange([pendingRange[0].format('YYYY-MM-DD'), pendingRange[1].format('YYYY-MM-DD')]); setPageNumber(1); message.success('统计日期已更新'); };
        const selectStatus = (status) => { const next = activeStatus === status.id ? 'all' : status.id; setActiveStatus(next); setPageNumber(1); if (!['all', 'abnormal'].includes(next)) message.info('异常订单列表中没有“' + status.label + '”订单'); };
        const columns = [
          { title: '订单号', dataIndex: 'id', width: 170, render: (value, record) => h(Button, { type: 'link', size: 'middle', className: 'order-link', onClick: () => setDrawerRecord(record) }, value) },
          { title: '商户 / 客户', dataIndex: 'merchant', width: 220, render: (value, record) => h('div', null, [h('span', { key: 'main', className: 'merchant-main' }, value), h('span', { key: 'sub', className: 'merchant-sub' }, record.customer + ' · ' + record.channel)]) },
          { title: '订单金额', dataIndex: 'amount', width: 130, render: (value) => h('span', { className: 'amount' }, money(value)) },
          { title: '异常状态', dataIndex: 'status', width: 120, render: (value) => h(Tag, { color: 'error' }, value) },
          { title: '风险等级', dataIndex: 'risk', width: 110, render: (value) => h(Tag, { color: riskColor[value] }, value + '风险') },
          { title: '异常原因', dataIndex: 'reason', width: 260, render: (value) => h('div', { className: 'reason-cell', title: value }, value) },
          { title: '创建时间', dataIndex: 'createdAt', width: 165 },
          { title: '操作', key: 'action', width: 80, render: (_, record) => h(Button, { type: 'link', size: 'middle', className: 'detail-link', onClick: () => setDrawerRecord(record) }, '详情') }
        ];
        const metricNodes = source.metrics.map((metric) => h(Card, { key: metric.id, size: 'small', className: 'metric-card' + (metric.tone === 'warning' ? ' is-alert' : '') }, [
          h('div', { key: 'label', className: 'metric-label' }, [h('span', { key: 'text' }, metric.label), metric.tone === 'warning' && WarningOutlined ? h(WarningOutlined, { key: 'icon', className: 'metric-icon' }) : LineChartOutlined ? h(LineChartOutlined, { key: 'icon', className: 'metric-icon' }) : null]),
          h(Statistic, { key: 'value', value: metricValue(metric), precision: metric.format === 'currency' ? 2 : 0, prefix: metric.format === 'currency' ? '¥' : null, groupSeparator: ',' }),
          h('div', { key: 'change', className: 'metric-change' }, [h('b', { key: 'delta' }, (metric.delta >= 0 ? '↑ ' : '↓ ') + Math.abs(metric.delta) + '%'), h('span', { key: 'comparison' }, metric.comparison)])
        ]));
        const statusNodes = source.statuses.map((status) => h(Button, { key: status.id, type: 'text', className: 'status-button' + (activeStatus === status.id ? ' is-active' : ''), onClick: () => selectStatus(status), 'aria-pressed': activeStatus === status.id }, [h('span', { key: 'name', className: 'status-name' }, [h('i', { key: 'dot', className: 'status-dot', style: { '--status-color': status.color } }), status.label]), h('span', { key: 'count', className: 'status-count' }, [h('b', { key: 'value' }, status.count.toLocaleString('zh-CN')), h('small', { key: 'percent' }, (status.count / statusTotal * 100).toFixed(1) + '%')]) ]));
        const drawerBody = drawerRecord ? h(React.Fragment, null, [
          h('div', { key: 'amount', className: 'drawer-amount' }, [h('span', { key: 'label' }, '订单金额'), h('strong', { key: 'value' }, money(drawerRecord.amount))]),
          h(Alert, { key: 'alert', className: 'drawer-alert', type: 'error', showIcon: true, message: drawerRecord.status + ' · ' + drawerRecord.risk + '风险', description: drawerRecord.reason }),
          h(Descriptions, { key: 'details', column: 2, bordered: false, size: 'small' }, [h(Descriptions.Item, { key: 'id', label: '订单号' }, drawerRecord.id), h(Descriptions.Item, { key: 'merchant', label: '商户' }, drawerRecord.merchant), h(Descriptions.Item, { key: 'customer', label: '客户' }, drawerRecord.customer), h(Descriptions.Item, { key: 'channel', label: '支付渠道' }, drawerRecord.channel), h(Descriptions.Item, { key: 'attempts', label: '重试次数' }, drawerRecord.attempts + ' 次'), h(Descriptions.Item, { key: 'owner', label: '当前跟进人' }, drawerRecord.owner), h(Descriptions.Item, { key: 'updated', label: '最后更新' }, drawerRecord.updatedAt)]),
          h('h3', { key: 'timeline-title', className: 'drawer-section-title' }, '处理记录'),
          h(Timeline, { key: 'timeline', items: [{ color: 'red', children: '系统识别到异常 · ' + drawerRecord.createdAt }, { color: 'blue', children: '进入人工复核队列 · ' + drawerRecord.owner }, { color: 'gray', children: '等待渠道状态确认' }] })
        ]) : null;
        return h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { borderRadius: 8, controlHeight: 32, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' }, components: { Table: { rowSelectedBg: '#F5F5F5', rowSelectedHoverBg: '#EDEDED' }, Select: { optionSelectedBg: '#F5F5F5', optionActiveBg: '#FAFAFA' } } } }, h('div', { className: 'dashboard-page' }, [
          h('header', { key: 'header', className: 'dashboard-header' }, h('div', { className: 'dashboard-title-row' }, [h('h1', { key: 'title', className: 'dashboard-title' }, payload.pageName), h('span', { key: 'demo', className: 'dashboard-demo' }, '演示数据')])),
          h('section', { key: 'filter', className: 'dashboard-filter' }, [h('div', { key: 'field', className: 'dashboard-filter-field' }, [h('label', { key: 'label' }, '统计日期'), h(DatePicker.RangePicker, { key: 'picker', size: 'middle', value: pendingRange, onChange: setPendingRange, format: 'YYYY-MM-DD', style: { width: '100%' } })]), h('div', { key: 'actions', className: 'dashboard-filter-actions' }, [h(Button, { key: 'query', type: 'primary', size: 'middle', onClick: applyDate }, '查询'), h(Button, { key: 'export', size: 'middle', icon: DownloadOutlined ? h(DownloadOutlined) : null, onClick: () => exportCsv(filtered) }, '导出报表')])]),
          h('section', { key: 'metrics', className: 'metric-grid', 'aria-label': '核心指标' }, metricNodes),
          h('section', { key: 'analysis', className: 'dashboard-analysis' }, [
            h(Card, { key: 'trend', className: 'analysis-card', title: h('div', { className: 'analysis-title' }, [h('span', { key: 'name' }, '销售额趋势'), h('small', { key: 'period' }, trendPoints.length ? trendPoints[0].date.slice(5).replace('-', '月') + '日 - ' + trendPoints[trendPoints.length - 1].date.slice(5).replace('-', '月') + '日' : '')]), extra: h(Segmented, { size: 'small', options: ['近7日','近14日','本月'], value: trendRange, onChange: setTrendRange }) }, [h('div', { key: 'total', className: 'trend-total' }, [h('strong', { key: 'value' }, money(trendTotal)), h('span', { key: 'change' }, '↑ 12.6% 较上期')]), h(TrendChart, { key: 'chart', points: trendPoints })]),
            h(Card, { key: 'status', className: 'analysis-card', title: h('div', { className: 'analysis-title' }, [h('span', { key: 'name' }, '订单状态分布'), h('small', { key: 'count' }, '共 ' + statusTotal.toLocaleString('zh-CN') + ' 笔')]) }, h('div', { className: 'status-layout' }, [h('div', { key: 'donut', className: 'status-donut', role: 'img', 'aria-label': '订单状态分布环形图' }, h('div', { className: 'status-center' }, [h('strong', { key: 'total' }, statusTotal.toLocaleString('zh-CN')), h('span', { key: 'label' }, '全部订单')])), h('div', { key: 'list', className: 'status-list' }, statusNodes)]))
          ]),
          h('section', { key: 'result', className: 'result-section' }, h(Card, { className: 'result-card', bordered: false, title: h('div', { className: 'result-heading' }, [h('span', { key: 'name' }, '异常订单'), h('small', { key: 'count' }, '共 ' + filtered.length + ' 条')]), extra: h('div', { className: 'result-tools' }, [selectedKeys.length ? h('span', { key: 'selected', className: 'selected-count' }, '已选 ' + selectedKeys.length + ' 条') : null, h(Input, { key: 'search', allowClear: true, value: query, onChange: (event) => { setQuery(event.target.value); setPageNumber(1); }, prefix: SearchOutlined ? h(SearchOutlined) : null, placeholder: '搜索订单号、商户或异常原因' }), selectedKeys.length ? h(Button, { key: 'selected-export', onClick: () => exportCsv(source.anomalies.filter((record) => selectedKeys.includes(record.id))) }, '导出所选') : null]) }, [h(Table, { key: 'table', rowKey: 'id', columns, dataSource: visible, pagination: false, size: 'middle', scroll: { x: 1160 }, rowSelection: { selectedRowKeys: selectedKeys, onChange: setSelectedKeys }, locale: { emptyText: h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: '没有符合条件的异常订单' }) } }), h('div', { key: 'pagination', className: 'result-pagination' }, [h('span', { key: 'summary', className: 'page-summary' }, pageSummary), h(Pagination, { key: 'pages', size: 'middle', current: pageNumber, pageSize, total: filtered.length, showSizeChanger: false, onChange: setPageNumber })])])),
          h(Modal, { key: 'detail-modal', className: 'yipex-modal', title: '订单详情', open: Boolean(drawerRecord), width: window.innerWidth <= 680 ? 'calc(100vw - 32px)' : 720, onCancel: () => setDrawerRecord(null), footer: h(Space, null, [h(Button, { key: 'close', onClick: () => setDrawerRecord(null) }, '关闭'), h(Button, { key: 'follow', type: 'primary', onClick: () => { message.success('已记录跟进状态'); setDrawerRecord(null); } }, '标记为已跟进')]), centered: true }, drawerBody)
        ]));
      }
      ReactDOM.createRoot(document.getElementById('order-dashboard-app')).render(h(App));
    })();
  `;
  const runtimeAssets = ['react.production.min.js', 'react-dom.production.min.js', 'dayjs.min.js', 'dayjs-zh-cn.js', 'antd.min.js', 'ant-design-icons.umd.js'];
  const preloads = runtimeAssets.map((asset) => `<link rel="preload" as="script" href="${vendorPath(asset)}">`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${vendorPath('antd-reset.css')}">${preloads}<title>${escape(metadata.pageName)} | YiPex</title><style>${shellCss}${pageCss}</style></head><body>${body}<script id="dashboard-data" type="application/json">${embedded}</script><script defer src="${vendorPath('react.production.min.js')}"><\/script><script defer src="${vendorPath('react-dom.production.min.js')}"><\/script><script defer src="${vendorPath('dayjs.min.js')}"><\/script><script defer src="${vendorPath('dayjs-zh-cn.js')}"><\/script><script defer src="${vendorPath('antd.min.js')}"><\/script><script defer src="${vendorPath('ant-design-icons.umd.js')}"><\/script><script>${shellRuntime}</script><script>(() => { const start = () => { if (window.React && window.ReactDOM && window.antd && window.dayjs) { ${appScript} } else { window.requestAnimationFrame(start); } }; start(); })();</script></body></html>`;
}

function renderMerchantQueryList(pageSpec) {
  const { metadata, page } = pageSpec;
  const data = page.data || {};
  const shellDir = resolve(process.cwd(), 'modules/yipex/shell');
  const template = readFileSync(resolve(shellDir, 'shell.template.html'), 'utf8');
  const shellCss = readFileSync(resolve(shellDir, 'shell.css'), 'utf8');
  const shellRuntime = readFileSync(resolve(shellDir, 'shell-runtime.js'), 'utf8');
  const logo = readFileSync(resolve(shellDir, 'logo.svg')).toString('base64');
  const vendorPath = (file) => relative(dirname(specPath), resolve(shellDir, 'vendor', file)).split(sep).join('/');
  const shell = page.shell || {};
  const header = shell.header || {};
  const brand = shell.brand || {};
  const footer = shell.footer || {};
  const navigation = (shell.navigation || []).map((item) => `<a class="yipex-shell-nav-item${item.active ? ' active' : ''}" data-antd-component="Menu.Item" data-menu-key="${escape(item.id)}" href="#${escape(item.id)}" title="${escape(item.label || item.id)}" ${item.active ? 'aria-current="page"' : ''}><span class="nav-icon anticon" data-antd-icon="${escape(item.icon || 'AppstoreOutlined')}" aria-hidden="true"></span><span>${escape(item.label || item.id)}</span></a>`).join('');
  const content = '<div id="merchant-query-app" data-antd-component="MerchantQueryListApp"><div class="merchant-initial-loading" role="status" aria-live="polite"><span class="merchant-loading-spinner" aria-hidden="true"></span><span>正在加载商户列表</span></div></div>';
  const values = {
    brandMark: brand.mark || 'Y',
    brandLogo: logo,
    brandName: brand.name || 'Yipex',
    welcome: header.welcome || metadata.pageName,
    userName: header.userName || '用户',
    email: header.email || 'user@yipex.tech',
    avatar: header.avatar || (header.userName || '用').slice(0, 1),
    copyright: footer.copyright || 'Copyright Somei E-Commerce Limited 2025. All rights reserved',
    navigation,
    content
  };
  const body = Object.entries(values).reduce((source, [key, value]) => source.replaceAll(`{{${key}}}`, value), template);
  const embedded = JSON.stringify({ data, initialState: page.states || {}, pageName: metadata.pageName }).replace(/</g, '\\u003c');
  const pageCss = `
    :root{--yipex-control-height:32px;--merchant-ink:#222;--merchant-text:rgba(0,0,0,.85);--merchant-muted:rgba(0,0,0,.65);--merchant-faint:rgba(0,0,0,.45);--merchant-line:#e7e8e8;--merchant-brand:#4aa52e}
    .yipex-drawer .ant-drawer-header-title{display:flex;align-items:center;justify-content:space-between;width:100%}.yipex-drawer .ant-drawer-title{order:1}.yipex-drawer .ant-drawer-close{order:2;margin-inline-end:0;margin-inline-start:12px}.yipex-drawer .ant-drawer-body{padding:24px}.yipex-drawer .ant-drawer-footer{text-align:right;padding:16px 24px}
    #merchant-query-app{min-height:100%}.merchant-initial-loading{min-height:420px;display:grid;place-content:center;justify-items:center;gap:12px;color:var(--merchant-muted);font-size:14px}.merchant-loading-spinner{width:22px;height:22px;border:2px solid #d9d9d9;border-top-color:var(--merchant-brand);border-radius:50%;animation:merchant-spin .8s linear infinite}@keyframes merchant-spin{to{transform:rotate(360deg)}}
    .merchant-page{width:100%;max-width:1440px;margin:0 auto}.merchant-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.merchant-title-row{display:flex;align-items:center;gap:10px}.merchant-title{margin:0;color:var(--merchant-ink);font-size:20px;font-weight:500;line-height:28px}.merchant-demo{margin:0!important;border:0!important;border-radius:4px!important;background:rgba(0,0,0,.06)!important;color:var(--merchant-muted)!important}
    .merchant-filter-section{padding-bottom:16px;border-bottom:1px solid var(--merchant-line)}.merchant-filter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:end}.merchant-filter-grid .ant-form-item{margin-bottom:0}.merchant-filter-actions{grid-column:1 / -1;display:flex;justify-content:flex-end;gap:8px}.merchant-results{padding-top:16px}.merchant-results-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.merchant-results-title{display:flex;align-items:baseline;gap:8px;color:var(--merchant-text);font-size:16px;font-weight:500}.merchant-results-count{color:var(--merchant-faint);font-size:12px;font-weight:400}.merchant-results-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.merchant-selection{display:flex;align-items:center;gap:8px;color:var(--merchant-muted);font-size:12px}.merchant-selection .ant-btn-link{height:auto;padding:0}.merchant-link.ant-btn-link{height:auto;padding:0;color:var(--merchant-brand);font-weight:500}.merchant-link.ant-btn-link:hover{color:#357d21;text-decoration:underline}.merchant-name{display:block}.merchant-id,.merchant-secondary{display:block;margin-top:3px;color:var(--merchant-faint);font-size:12px;line-height:18px}.merchant-contact{display:block;color:var(--merchant-text)}.merchant-amount{display:block;color:var(--merchant-text);font:500 14px Roboto,-apple-system,sans-serif}.merchant-pagination{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:16px}.merchant-page-summary{color:var(--merchant-faint);font-size:12px}.merchant-state{min-height:360px;display:grid;place-items:center}.merchant-state .ant-result{padding-top:32px;padding-bottom:32px}.merchant-skeleton{padding:16px 0}.merchant-drawer-scale{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:24px;padding:0 0 20px;border-bottom:1px solid var(--merchant-line)}.merchant-drawer-scale>span{color:var(--merchant-muted);font-size:14px}.merchant-drawer-scale .ant-statistic{text-align:right}.merchant-drawer-scale .ant-statistic-content{font-size:24px}.merchant-drawer-section-title{margin:24px 0 12px;color:var(--merchant-text);font-size:16px;font-weight:500;line-height:24px}
    @media(max-width:920px){.merchant-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:680px){.merchant-filter-grid{grid-template-columns:1fr}.merchant-filter-actions{grid-column:auto}.merchant-results-head{align-items:flex-start;flex-direction:column}.merchant-results-tools{width:100%;justify-content:space-between}.merchant-selection{flex:1}.merchant-pagination{align-items:flex-start;flex-direction:column}.merchant-pagination .ant-pagination{align-self:flex-end}.merchant-drawer-scale{align-items:flex-start;flex-direction:column;gap:8px}.merchant-drawer-scale .ant-statistic{text-align:left}}
  `;
  const appScript = `
    (() => {
      const h = React.createElement;
      const { ConfigProvider, Form, Input, Select, DatePicker, Button, Table, Pagination, Drawer, Modal, Descriptions, Empty, Tag, Space, message, Result, Skeleton, Statistic } = antd;
      const { DownloadOutlined } = window.icons || {};
      const payload = JSON.parse(document.getElementById('merchant-query-data').textContent);
      const source = payload.data || {};
      const initial = payload.initialState || {};
      const previewState = new URLSearchParams(window.location.search).get('state') || '';
      const allStatus = source.statuses?.[0]?.value || 'ALL';
      const allIndustry = source.industries?.[0]?.value || 'ALL';
      const statusColors = { OPERATING: 'green', PAUSED: 'gold', PENDING: 'blue', CLOSED: 'default' };
      const money = (value) => '¥' + Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const wait = (milliseconds) => new Promise((resolveWait) => window.setTimeout(resolveWait, milliseconds));
      function App() {
        const [form] = Form.useForm();
        const [filters, setFilters] = React.useState({ name: '', merchantId: '', status: allStatus, industry: allIndustry, signedStart: '', signedEnd: '' });
        const [loading, setLoading] = React.useState(Boolean(initial.loading) || previewState === 'loading');
        const [error, setError] = React.useState(Boolean(initial.error) || previewState === 'error');
        const [selectedKeys, setSelectedKeys] = React.useState(initial.selectedMerchantIds || []);
        const [pageNumber, setPageNumber] = React.useState(Number(initial.page) || 1);
        const [drawerRecord, setDrawerRecord] = React.useState(null);
        const pageSize = Number(initial.pageSize) || 5;
        const permissionDenied = Boolean(initial['permission-denied']) || previewState === 'permission-denied';
        const forcedEmpty = Boolean(initial.empty) || previewState === 'empty';
        React.useEffect(() => {
          if (!loading) return undefined;
          const timer = window.setTimeout(() => setLoading(false), 900);
          return () => window.clearTimeout(timer);
        }, []);
        const records = forcedEmpty ? [] : (source.records || []);
        const filtered = records.filter((record) => {
          const nameMatch = !filters.name || record.name.toLowerCase().includes(filters.name.toLowerCase());
          const idMatch = !filters.merchantId || record.id.toLowerCase().includes(filters.merchantId.toLowerCase());
          const statusMatch = filters.status === allStatus || record.status === filters.status;
          const industryMatch = filters.industry === allIndustry || record.industry === filters.industry;
          const signedMatch = (!filters.signedStart || record.signedAt >= filters.signedStart) && (!filters.signedEnd || record.signedAt <= filters.signedEnd);
          return nameMatch && idMatch && statusMatch && industryMatch && signedMatch;
        });
        const visible = filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
        const submitFilters = async (values) => {
          setLoading(true);
          await wait(420);
          const range = values.signedRange || [];
          setFilters({
            name: String(values.name || '').trim(),
            merchantId: String(values.merchantId || '').trim(),
            status: values.status || allStatus,
            industry: values.industry || allIndustry,
            signedStart: range[0] ? range[0].format('YYYY-MM-DD') : '',
            signedEnd: range[1] ? range[1].format('YYYY-MM-DD') : ''
          });
          setPageNumber(1);
          setLoading(false);
          message.success('查询条件已应用');
        };
        const resetFilters = () => {
          form.resetFields();
          setFilters({ name: '', merchantId: '', status: allStatus, industry: allIndustry, signedStart: '', signedEnd: '' });
          setPageNumber(1);
          message.info('已重置查询条件');
        };
        const exportCsv = () => {
          const rows = selectedKeys.length ? (source.records || []).filter((record) => selectedKeys.includes(record.id)) : filtered;
          if (!rows.length) { message.info('当前没有可导出的商户'); return; }
          const lines = [
            ['商户编号','商户名称','所属行业','联系人','联系电话','近30日交易额','近30日订单数','经营状态','签约日期','创建时间','负责人'],
            ...rows.map((record) => [record.id, record.name, record.industryLabel, record.contact, record.phone, record.transactionAmount, record.transactionOrders, record.statusLabel, record.signedAt, record.createdAt, record.owner])
          ];
          const csv = '\\uFEFF' + lines.map((line) => line.map((value) => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\\n');
          const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = 'yipex-merchants-demo.csv';
          link.click();
          URL.revokeObjectURL(url);
          message.success('已导出 ' + rows.length + ' 家商户');
        };
        const retry = async () => { setError(false); setLoading(true); await wait(650); setLoading(false); message.success('商户数据已重新加载'); };
        const columns = [
          { title: '商户名称', dataIndex: 'name', width: 230, fixed: 'left', render: (value, record) => h(Button, { type: 'link', className: 'merchant-link', onClick: () => setDrawerRecord(record) }, h('span', null, [h('span', { key: 'name', className: 'merchant-name' }, value), h('span', { key: 'meta', className: 'merchant-id' }, record.id + ' · ' + record.industryLabel)])) },
          { title: '联系人', dataIndex: 'contact', width: 160, render: (value, record) => h('div', null, [h('span', { key: 'name', className: 'merchant-contact' }, value), h('span', { key: 'phone', className: 'merchant-secondary' }, record.phone)]) },
          { title: '交易规模（近30日）', dataIndex: 'transactionAmount', width: 190, sorter: (a, b) => a.transactionAmount - b.transactionAmount, render: (value, record) => h('div', null, [h('span', { key: 'amount', className: 'merchant-amount' }, money(value)), h('span', { key: 'orders', className: 'merchant-secondary' }, record.transactionOrders.toLocaleString('zh-CN') + ' 笔')]) },
          { title: '经营状态', dataIndex: 'statusLabel', width: 120, render: (value, record) => h(Tag, { color: statusColors[record.status] }, value) },
          { title: '创建时间', dataIndex: 'createdAt', width: 170 },
          { title: '负责人', dataIndex: 'owner', width: 100 },
          { title: '操作', key: 'action', width: 90, fixed: 'right', render: (_, record) => h(Button, { type: 'link', className: 'merchant-link', onClick: () => setDrawerRecord(record) }, '详情') }
        ];
        if (permissionDenied) return h('main', { className: 'merchant-page merchant-state' }, h(Result, { status: '403', title: '暂无商户查询权限', subTitle: '请联系管理员开通商户管理查看权限。', extra: h(Button, { onClick: () => { window.location.hash = 'overview'; } }, '返回经营概览') }));
        const headerNode = h('header', { key: 'header', id: 'merchant-list-header', className: 'merchant-header' }, h('div', { className: 'merchant-title-row' }, [h('h1', { key: 'title', className: 'merchant-title' }, payload.pageName), h(Tag, { key: 'demo', className: 'merchant-demo' }, '演示数据')]));
        const filterNode = h('section', { key: 'filters', id: 'merchant-filters', className: 'merchant-filter-section', 'aria-label': '商户查询条件' }, h(Form, { form, layout: 'vertical', size: 'middle', initialValues: { status: allStatus, industry: allIndustry }, onFinish: submitFilters }, h('div', { className: 'merchant-filter-grid' }, [
          h(Form.Item, { key: 'name', label: '商户名称', name: 'name' }, h(Input, { allowClear: true, placeholder: '请输入商户名称' })),
          h(Form.Item, { key: 'merchantId', label: '商户编号', name: 'merchantId' }, h(Input, { allowClear: true, placeholder: '请输入商户编号' })),
          h(Form.Item, { key: 'status', label: '经营状态', name: 'status' }, h(Select, { options: source.statuses || [] })),
          h(Form.Item, { key: 'signedRange', label: '签约日期', name: 'signedRange' }, h(DatePicker.RangePicker, { format: 'YYYY-MM-DD', placeholder: ['开始日期', '结束日期'], style: { width: '100%' } })),
          h(Form.Item, { key: 'industry', label: '所属行业', name: 'industry' }, h(Select, { options: source.industries || [] })),
          h('div', { key: 'actions', className: 'merchant-filter-actions' }, [h(Button, { key: 'reset', id: 'reset-filters', onClick: resetFilters }, '重置'), h(Button, { key: 'query', id: 'query-merchants', type: 'primary', htmlType: 'submit', loading }, '查询')])
        ])));
        let resultBody;
        if (error) {
          resultBody = h('div', { className: 'merchant-state' }, h(Result, { status: 'error', title: '商户数据加载失败', subTitle: '演示数据暂时无法读取，请重试。', extra: h(Button, { type: 'primary', onClick: retry }, '重新加载') }));
        } else if (loading && !filtered.length) {
          resultBody = h('div', { className: 'merchant-skeleton', role: 'status', 'aria-live': 'polite' }, h(Skeleton, { active: true, paragraph: { rows: 7 } }));
        } else {
          resultBody = h(React.Fragment, null, [
            h(Table, { key: 'table', rowKey: 'id', columns, dataSource: visible, pagination: false, size: 'middle', loading, scroll: { x: 1060 }, rowSelection: { selectedRowKeys: selectedKeys, preserveSelectedRowKeys: true, onChange: setSelectedKeys }, locale: { emptyText: h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: forcedEmpty ? '暂无商户数据' : '没有符合条件的商户' }) } }),
            h('div', { key: 'pagination', className: 'merchant-pagination' }, [
              h('span', { key: 'summary', className: 'merchant-page-summary' }, filtered.length ? '显示 ' + ((pageNumber - 1) * pageSize + 1) + '-' + Math.min(pageNumber * pageSize, filtered.length) + ' 家，共 ' + filtered.length + ' 家' : '显示 0 家，共 0 家'),
              h(Pagination, { key: 'pages', current: pageNumber, pageSize, total: filtered.length, showSizeChanger: false, onChange: setPageNumber, hideOnSinglePage: false })
            ])
          ]);
        }
        const resultNode = h('section', { key: 'results', id: 'merchant-results', className: 'merchant-results', 'aria-labelledby': 'merchant-results-title' }, [
          h('div', { key: 'head', className: 'merchant-results-head' }, [
            h('div', { key: 'title', id: 'merchant-results-title', className: 'merchant-results-title' }, ['商户结果', h('span', { key: 'count', className: 'merchant-results-count' }, '共 ' + filtered.length + ' 家')]),
            h('div', { key: 'tools', className: 'merchant-results-tools' }, [
              selectedKeys.length ? h('div', { key: 'selection', className: 'merchant-selection' }, [h('span', { key: 'count' }, '已选 ' + selectedKeys.length + ' 家'), h(Button, { key: 'clear', type: 'link', onClick: () => setSelectedKeys([]) }, '清空')]) : null,
              h(Button, { key: 'export', id: 'export-merchants', icon: DownloadOutlined ? h(DownloadOutlined) : null, onClick: exportCsv }, selectedKeys.length ? '导出所选' : '导出')
            ])
          ]),
          resultBody
        ]);
        const drawerBody = drawerRecord ? h(React.Fragment, null, [
          h('div', { key: 'scale', className: 'merchant-drawer-scale' }, [h('span', { key: 'label' }, '近 30 日交易规模'), h(Statistic, { key: 'value', value: drawerRecord.transactionAmount, precision: 2, prefix: '¥', groupSeparator: ',' })]),
          h(Descriptions, { key: 'basic', column: 2, size: 'small', bordered: false }, [
            h(Descriptions.Item, { key: 'id', label: '商户编号' }, drawerRecord.id),
            h(Descriptions.Item, { key: 'status', label: '经营状态' }, h(Tag, { color: statusColors[drawerRecord.status] }, drawerRecord.statusLabel)),
            h(Descriptions.Item, { key: 'industry', label: '所属行业' }, drawerRecord.industryLabel),
            h(Descriptions.Item, { key: 'signed', label: '签约日期' }, drawerRecord.signedAt),
            h(Descriptions.Item, { key: 'orders', label: '近 30 日订单' }, drawerRecord.transactionOrders.toLocaleString('zh-CN') + ' 笔'),
            h(Descriptions.Item, { key: 'contact', label: '联系人' }, drawerRecord.contact + ' · ' + drawerRecord.phone),
            h(Descriptions.Item, { key: 'area', label: '所在地区' }, drawerRecord.city),
            h(Descriptions.Item, { key: 'address', label: '经营地址' }, drawerRecord.address),
            h(Descriptions.Item, { key: 'owner', label: '负责人' }, drawerRecord.owner),
            h(Descriptions.Item, { key: 'created', label: '创建时间' }, drawerRecord.createdAt)
          ])
        ]) : null;
        const drawerNode = h(Modal, { key: 'detail-modal', id: 'merchant-detail-modal', className: 'yipex-modal', title: drawerRecord ? drawerRecord.name : '商户详情', open: Boolean(drawerRecord), width: window.innerWidth <= 680 ? 'calc(100vw - 32px)' : 720, onCancel: () => setDrawerRecord(null), footer: h(Space, null, h(Button, { onClick: () => setDrawerRecord(null) }, '关闭')), centered: true }, drawerBody);
        return h('main', { className: 'merchant-page' }, [headerNode, filterNode, resultNode, drawerNode]);
      }
      ReactDOM.createRoot(document.getElementById('merchant-query-app')).render(h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { borderRadius: 8, controlHeight: 32, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' }, components: { Table: { rowSelectedBg: '#F5F5F5', rowSelectedHoverBg: '#EDEDED' }, Select: { optionSelectedBg: '#F5F5F5', optionActiveBg: '#FAFAFA' } } } }, h(App)));
    })();
  `;
  const runtimeAssets = ['react.production.min.js', 'react-dom.production.min.js', 'dayjs.min.js', 'dayjs-zh-cn.js', 'antd.min.js', 'ant-design-icons.umd.js'];
  const preloads = runtimeAssets.map((asset) => `<link rel="preload" as="script" href="${vendorPath(asset)}">`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${vendorPath('antd-reset.css')}">${preloads}<title>${escape(metadata.pageName)} | YiPex</title><style>${shellCss}${pageCss}</style></head><body>${body}<script id="merchant-query-data" type="application/json">${embedded}</script><script defer src="${vendorPath('react.production.min.js')}"><\/script><script defer src="${vendorPath('react-dom.production.min.js')}"><\/script><script defer src="${vendorPath('dayjs.min.js')}"><\/script><script defer src="${vendorPath('dayjs-zh-cn.js')}"><\/script><script defer src="${vendorPath('antd.min.js')}"><\/script><script defer src="${vendorPath('ant-design-icons.umd.js')}"><\/script><script>${shellRuntime}</script><script>(() => { const start = () => { if (window.React && window.ReactDOM && window.antd && window.dayjs) { ${appScript} } else { window.requestAnimationFrame(start); } }; start(); })();</script></body></html>`;
}

function renderOrderQueryList(pageSpec) {
  const { metadata, page } = pageSpec;
  const data = page.data || {};
  const shellDir = resolve(process.cwd(), 'modules/yipex/shell');
  const template = readFileSync(resolve(shellDir, 'shell.template.html'), 'utf8');
  const shellCss = readFileSync(resolve(shellDir, 'shell.css'), 'utf8');
  const shellRuntime = readFileSync(resolve(shellDir, 'shell-runtime.js'), 'utf8');
  const logo = readFileSync(resolve(shellDir, 'logo.svg')).toString('base64');
  const vendorPath = (file) => relative(dirname(specPath), resolve(shellDir, 'vendor', file)).split(sep).join('/');
  const shell = page.shell || {};
  const header = shell.header || {};
  const brand = shell.brand || {};
  const footer = shell.footer || {};
  const navigation = (shell.navigation || []).map((item) => `<a class="yipex-shell-nav-item${item.active ? ' active' : ''}" data-antd-component="Menu.Item" data-menu-key="${escape(item.id)}" href="#${escape(item.id)}" title="${escape(item.label || item.id)}" ${item.active ? 'aria-current="page"' : ''}><span class="nav-icon anticon" data-antd-icon="${escape(item.icon || 'AppstoreOutlined')}" aria-hidden="true"></span><span>${escape(item.label || item.id)}</span></a>`).join('');
  const content = '<div id="order-query-app" data-antd-component="OrderQueryListApp"><div class="order-initial-loading" role="status" aria-live="polite"><span class="order-loading-spinner" aria-hidden="true"></span><span>正在加载订单列表</span></div></div>';
  const values = {
    brandLogo: logo,
    brandName: brand.name || 'Yipex',
    email: header.email || 'user@yipex.tech',
    avatar: header.avatar || (header.userName || '用').slice(0, 1),
    copyright: footer.copyright || 'Copyright Somei E-Commerce Limited 2025. All rights reserved',
    navigation,
    content
  };
  const body = Object.entries(values).reduce((source, [key, value]) => source.replaceAll(`{{${key}}}`, value), template);
  const embedded = JSON.stringify({ data, initialState: page.states || {}, pageName: metadata.pageName }).replace(/</g, '\\u003c');
  const pageCss = `
    :root{--order-ink:#222;--order-text:rgba(0,0,0,.85);--order-muted:rgba(0,0,0,.65);--order-faint:rgba(0,0,0,.45);--order-line:#e7e8e8;--order-brand:#4aa52e}
    .yipex-drawer .ant-drawer-header-title{display:flex;align-items:center;justify-content:space-between;width:100%}.yipex-drawer .ant-drawer-title{order:1}.yipex-drawer .ant-drawer-close{order:2;margin-inline-end:0;margin-inline-start:12px}.yipex-drawer .ant-drawer-body{padding:24px}.yipex-drawer .ant-drawer-footer{text-align:right;padding:16px 24px}
    .yipex-modal .ant-modal-content{padding:0;border-radius:12px;overflow:hidden}.yipex-modal .ant-modal-header{margin:0;padding:16px 24px;border-bottom:1px solid var(--order-line)}.yipex-modal .ant-modal-body{padding:24px}.yipex-modal .ant-modal-footer{margin:0;padding:16px 24px;border-top:1px solid var(--order-line);text-align:right}
    #order-query-app{min-height:100%}.order-initial-loading{min-height:420px;display:grid;place-content:center;justify-items:center;gap:12px;color:var(--order-muted);font-size:14px}.order-loading-spinner{width:22px;height:22px;border:2px solid #d9d9d9;border-top-color:var(--order-brand);border-radius:50%;animation:order-spin .8s linear infinite}@keyframes order-spin{to{transform:rotate(360deg)}}
    .order-page{width:100%;max-width:1440px;margin:0 auto}.order-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.order-title-row{display:flex;align-items:center;gap:10px}.order-title{margin:0;color:var(--order-ink);font-size:20px;font-weight:500;line-height:28px}
    .order-filter-section{padding-bottom:16px;border-bottom:1px solid var(--order-line)}.order-filter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:end}.order-filter-grid .ant-form-item{margin-bottom:0}.order-filter-actions{grid-column:1 / -1;display:flex;justify-content:flex-end;gap:8px}.order-results{padding-top:16px}.order-results-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.order-results-title{display:flex;align-items:baseline;gap:8px;color:var(--order-text);font-size:16px;font-weight:500}.order-results-count{color:var(--order-faint);font-size:12px;font-weight:400}.order-number{font-family:Roboto,-apple-system,sans-serif}.order-number-link.ant-btn-link,.order-actions .ant-btn-link{padding-inline:0}.order-customer{display:block;color:var(--order-text)}.order-secondary{display:block;margin-top:3px;color:var(--order-faint);font-size:12px;line-height:18px}.order-amount{color:var(--order-text);font:500 14px Roboto,-apple-system,sans-serif}.order-actions{white-space:nowrap}.order-pagination{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:16px}.order-page-summary{color:var(--order-faint);font-size:12px}.order-state{min-height:360px;display:grid;place-items:center}.order-state .ant-result{padding-top:32px;padding-bottom:32px}.order-drawer-amount{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:24px;padding:0 0 20px;border-bottom:1px solid var(--order-line)}.order-drawer-amount>span{color:var(--order-muted)}.order-drawer-amount strong{font:600 24px Roboto,-apple-system,sans-serif}.order-add-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.order-add-form-grid .ant-form-item{min-width:0}.order-add-full{grid-column:1 / -1}.cancel-copy{margin:0;color:var(--order-muted);line-height:24px}.cancel-summary{margin-top:16px}.cancel-summary .ant-descriptions-item-label{width:96px}
    @media(max-width:920px){.order-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:680px){.order-filter-grid{grid-template-columns:1fr}.order-filter-actions{grid-column:auto}.order-results-head{align-items:flex-start;flex-direction:column}.order-results-head .ant-btn{align-self:flex-end}.order-pagination{align-items:flex-start;flex-direction:column}.order-pagination .ant-pagination{align-self:flex-end}.order-drawer-amount{align-items:flex-start;flex-direction:column;gap:8px}.order-add-form-grid{grid-template-columns:1fr}.order-add-full{grid-column:auto}}
  `;
  const appScript = `
    (() => {
      const h = React.createElement;
      const { ConfigProvider, Form, Input, InputNumber, Select, DatePicker, Button, Table, Pagination, Drawer, Descriptions, Empty, Tag, Badge, Space, message, Result, Modal, Alert } = antd;
      const payload = JSON.parse(document.getElementById('order-query-data').textContent);
      const source = payload.data || {};
      const initial = payload.initialState || {};
      const previewState = new URLSearchParams(window.location.search).get('state') || '';
      const allStatus = source.statuses?.[0]?.value || 'ALL';
      const statusColors = { PENDING: 'gold', PROCESSING: 'green', COMPLETED: 'success', CANCELLED: 'default' };
      const money = (value) => '¥' + Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const wait = (milliseconds) => new Promise((resolveWait) => window.setTimeout(resolveWait, milliseconds));
      function App() {
        const [form] = Form.useForm();
        const [createForm] = Form.useForm();
        const [records, setRecords] = React.useState(source.records || []);
        const [filters, setFilters] = React.useState({ orderId: '', customerName: '', status: allStatus, start: '', end: '' });
        const [loading, setLoading] = React.useState(Boolean(initial.loading) || previewState === 'loading');
        const [error, setError] = React.useState(Boolean(initial.error) || previewState === 'error');
        const [success, setSuccess] = React.useState(Boolean(initial.success));
        const [pageNumber, setPageNumber] = React.useState(Number(initial.page) || 1);
        const [drawerRecord, setDrawerRecord] = React.useState(null);
        const [cancelRecord, setCancelRecord] = React.useState(null);
        const [canceling, setCanceling] = React.useState(Boolean(initial.canceling));
        const [createOpen, setCreateOpen] = React.useState(false);
        const [creating, setCreating] = React.useState(Boolean(initial.creating));
        const pageSize = Number(initial.pageSize) || 5;
        const permissionDenied = Boolean(initial['permission-denied']) || previewState === 'permission-denied';
        const forcedEmpty = Boolean(initial.empty) || previewState === 'empty';
        React.useEffect(() => {
          if (!loading) return undefined;
          const timer = window.setTimeout(() => setLoading(false), 900);
          return () => window.clearTimeout(timer);
        }, []);
        const availableRecords = forcedEmpty ? [] : records;
        const filtered = availableRecords.filter((record) => {
          const orderIdMatch = !filters.orderId || record.id.toLowerCase().includes(filters.orderId.toLowerCase());
          const customerMatch = !filters.customerName || record.customerName.toLowerCase().includes(filters.customerName.toLowerCase());
          const statusMatch = filters.status === allStatus || record.status === filters.status;
          const orderDay = record.orderedAt.slice(0, 10);
          const dateMatch = (!filters.start || orderDay >= filters.start) && (!filters.end || orderDay <= filters.end);
          return orderIdMatch && customerMatch && statusMatch && dateMatch;
        });
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const safePage = Math.min(pageNumber, totalPages);
        const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
        const submitFilters = async (values) => {
          setError(false);
          setLoading(true);
          await wait(420);
          const range = values.orderRange || [];
          setFilters({
            orderId: String(values.orderId || '').trim(),
            customerName: String(values.customerName || '').trim(),
            status: values.status || allStatus,
            start: range[0] ? range[0].format('YYYY-MM-DD') : '',
            end: range[1] ? range[1].format('YYYY-MM-DD') : ''
          });
          setPageNumber(1);
          setLoading(false);
          message.success('查询条件已应用');
        };
        const resetFilters = () => {
          form.resetFields();
          setFilters({ orderId: '', customerName: '', status: allStatus, start: '', end: '' });
          setPageNumber(1);
          setError(false);
          message.info('已重置查询条件');
        };
        const retry = async () => { setError(false); setLoading(true); await wait(650); setLoading(false); message.success('订单数据已重新加载'); };
        const openCancel = (record) => {
          if (!record.cancelable) { message.warning('当前订单状态不支持取消'); return; }
          setDrawerRecord(null);
          setCancelRecord(record);
        };
        const closeCancel = () => { if (!canceling) setCancelRecord(null); };
        const confirmCancel = async () => {
          if (!cancelRecord) return;
          setCanceling(true);
          await wait(760);
          const updated = { ...cancelRecord, status: 'CANCELLED', statusLabel: '已取消', cancelable: false };
          setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
          setCanceling(false);
          setCancelRecord(null);
          setSuccess(true);
          message.success('订单 ' + updated.id + ' 已取消');
        };
        const openCreate = () => {
          createForm.resetFields();
          createForm.setFieldsValue({ orderedAt: dayjs() });
          setCreateOpen(true);
        };
        const closeCreate = () => { if (!creating) setCreateOpen(false); };
        const submitCreate = async () => {
          try {
            const values = await createForm.validateFields();
            setCreating(true);
            await wait(620);
            const now = dayjs();
            const id = 'YP' + now.format('YYYYMMDDHHmmss') + String(Math.floor(Math.random() * 90) + 10);
            const orderedAt = (values.orderedAt || now).format('YYYY-MM-DD HH:mm');
            const created = {
              id,
              customerName: values.customerName,
              customerPhone: values.customerPhone,
              amount: Number(values.amount),
              status: 'PENDING',
              statusLabel: '待支付',
              orderedAt,
              merchant: values.merchant,
              channel: values.channel,
              items: Number(values.items),
              productSummary: values.productSummary,
              address: values.address,
              remark: values.remark || '',
              cancelable: true
            };
            setRecords((current) => [created, ...current]);
            setCreateOpen(false);
            setCreating(false);
            setPageNumber(1);
            message.success('订单 ' + id + ' 已新增');
          } catch (validationError) {
            if (validationError?.errorFields) return;
            setCreating(false);
            message.error('订单新增失败，请重试');
          }
        };
        const statusBadge = (record) => h(Badge, { status: record.status === 'PENDING' ? 'warning' : record.status === 'PROCESSING' ? 'processing' : record.status === 'COMPLETED' ? 'success' : 'default', text: record.statusLabel });
        const columns = [
          { title: '订单号', dataIndex: 'id', width: 180, fixed: 'left', align: 'left', render: (value, record) => h(Button, { type: 'link', className: 'order-number-link', 'data-component': 'view-order-detail', onClick: () => setDrawerRecord(record) }, h('span', { className: 'order-number' }, value)) },
          { title: '客户', dataIndex: 'customerName', width: 180, align: 'left', render: (value, record) => h('div', null, [h('span', { key: 'name', className: 'order-customer' }, value), h('span', { key: 'phone', className: 'order-secondary' }, record.customerPhone)]) },
          { title: '金额', dataIndex: 'amount', width: 130, align: 'right', sorter: (a, b) => a.amount - b.amount, render: (value) => h('span', { className: 'order-amount' }, money(value)) },
          { title: '状态', dataIndex: 'statusLabel', width: 110, align: 'left', render: (value, record) => statusBadge(record) },
          { title: '下单时间', dataIndex: 'orderedAt', width: 170, align: 'left', sorter: (a, b) => a.orderedAt.localeCompare(b.orderedAt) },
          { title: '操作', key: 'action', width: 180, fixed: 'right', align: 'left', render: (_, record) => h(Space, { className: 'order-actions', size: 'middle' }, [h(Button, { key: 'detail', type: 'link', 'data-component': 'view-order-detail', onClick: () => setDrawerRecord(record) }, '详情'), h('span', { key: 'cancel-wrap', title: record.cancelable ? '取消订单' : '当前状态不支持取消' }, h(Button, { 'data-component': 'cancel-order', type: 'link', danger: true, disabled: !record.cancelable, onClick: () => openCancel(record) }, '取消订单'))]) }
        ];
        if (permissionDenied) return h('main', { className: 'order-page order-state' }, h(Result, { status: '403', title: '暂无订单查询权限', subTitle: '请联系管理员开通法币钱包流水查看权限。', extra: h(Button, { onClick: () => { window.location.hash = 'home'; } }, '返回首页') }));
        const headerNode = h('header', { key: 'header', id: 'order-list-header', className: 'order-header' }, h('div', { className: 'order-title-row' }, h('h1', { key: 'title', className: 'order-title' }, payload.pageName)));
        const filterNode = h('section', { key: 'filters', id: 'order-filters', className: 'order-filter-section', 'aria-label': '订单查询条件' }, h(Form, { form, layout: 'vertical', size: 'middle', initialValues: { status: allStatus }, onFinish: submitFilters }, h('div', { className: 'order-filter-grid' }, [
          h(Form.Item, { key: 'orderId', label: '订单号', name: 'orderId' }, h(Input, { allowClear: true, placeholder: '请输入订单号' })),
          h(Form.Item, { key: 'customerName', label: '客户名称', name: 'customerName' }, h(Input, { allowClear: true, placeholder: '请输入客户名称' })),
          h(Form.Item, { key: 'status', label: '订单状态', name: 'status' }, h(Select, { options: source.statuses || [] })),
          h(Form.Item, { key: 'orderRange', label: '下单时间', name: 'orderRange' }, h(DatePicker.RangePicker, { format: 'YYYY-MM-DD', placeholder: ['开始日期', '结束日期'], style: { width: '100%' } })),
          h('div', { key: 'actions', className: 'order-filter-actions' }, [h(Button, { key: 'reset', id: 'reset-filters', onClick: resetFilters }, '重置'), h(Button, { key: 'query', id: 'query-orders', type: 'primary', htmlType: 'submit', loading }, '查询')])
        ])));
        let resultBody;
        if (error) {
          resultBody = h('div', { className: 'order-state' }, h(Result, { status: 'error', title: '订单查询失败', subTitle: '演示数据暂时无法读取，请重新查询。', extra: h(Button, { type: 'primary', onClick: retry }, '重新查询') }));
        } else {
          resultBody = h(React.Fragment, null, [
            h(Table, { key: 'table', rowKey: 'id', columns, dataSource: visible, pagination: false, size: 'middle', loading, scroll: { x: 950 }, locale: { emptyText: h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: forcedEmpty ? '暂无订单数据' : '没有符合条件的订单' }) } }),
            h('div', { key: 'pagination', className: 'order-pagination' }, [
              h('span', { key: 'summary', className: 'order-page-summary' }, filtered.length ? '显示 ' + ((safePage - 1) * pageSize + 1) + '-' + Math.min(safePage * pageSize, filtered.length) + ' 条，共 ' + filtered.length + ' 条' : '显示 0 条，共 0 条'),
              h(Pagination, { key: 'pages', current: safePage, pageSize, total: filtered.length, showSizeChanger: false, onChange: setPageNumber, hideOnSinglePage: false })
            ])
          ]);
        }
        const resultNode = h('section', { key: 'results', id: 'order-results', className: 'order-results', 'aria-labelledby': 'order-results-title' }, [
          h('div', { key: 'head', className: 'order-results-head' }, [h('div', { key: 'title', id: 'order-results-title', className: 'order-results-title' }, ['订单结果', h('span', { key: 'count', className: 'order-results-count' }, '共 ' + filtered.length + ' 条')]), h(Button, { key: 'add', id: 'add-order', onClick: openCreate }, '新增订单')]),
          resultBody
        ]);
        const drawerBody = drawerRecord ? h(React.Fragment, null, [
          h('div', { key: 'amount', className: 'order-drawer-amount' }, [h('span', { key: 'label' }, '订单金额'), h('strong', { key: 'value' }, money(drawerRecord.amount))]),
          h(Descriptions, { key: 'details', column: 2, size: 'small', bordered: false }, [
            h(Descriptions.Item, { key: 'id', label: '订单号' }, drawerRecord.id),
            h(Descriptions.Item, { key: 'status', label: '订单状态' }, statusBadge(drawerRecord)),
            h(Descriptions.Item, { key: 'customer', label: '客户' }, drawerRecord.customerName + ' · ' + drawerRecord.customerPhone),
            h(Descriptions.Item, { key: 'merchant', label: '商户' }, drawerRecord.merchant),
            h(Descriptions.Item, { key: 'product', label: '商品摘要' }, drawerRecord.productSummary),
            h(Descriptions.Item, { key: 'items', label: '商品数量' }, drawerRecord.items + ' 件'),
            h(Descriptions.Item, { key: 'channel', label: '支付渠道' }, drawerRecord.channel),
            h(Descriptions.Item, { key: 'orderedAt', label: '下单时间' }, drawerRecord.orderedAt),
            h(Descriptions.Item, { key: 'address', label: '收货地址' }, drawerRecord.address)
          ])
        ]) : null;
        const drawerFooter = drawerRecord ? h(Space, null, [h(Button, { key: 'close', onClick: () => setDrawerRecord(null) }, '关闭'), drawerRecord.cancelable ? h(Button, { key: 'cancel', danger: true, onClick: () => openCancel(drawerRecord) }, '取消订单') : null]) : null;
        const drawerNode = h(Modal, { key: 'detail-modal', id: 'order-detail-modal', className: 'yipex-modal', title: '订单详情', open: Boolean(drawerRecord), width: window.innerWidth <= 680 ? 'calc(100vw - 32px)' : 720, onCancel: () => setDrawerRecord(null), footer: drawerFooter, centered: true }, drawerBody);
        const createFields = [
          h(Form.Item, { key: 'customerName', label: '客户名称', name: 'customerName', rules: [{ required: true, message: '请输入客户名称' }] }, h(Input, { placeholder: '请输入客户名称', allowClear: true })),
          h(Form.Item, { key: 'customerPhone', label: '联系电话', name: 'customerPhone', rules: [{ required: true, message: '请输入联系电话' }, { pattern: /^1[3-9]\\d{9}$/, message: '请输入正确的手机号' }] }, h(Input, { placeholder: '请输入手机号', allowClear: true })),
          h(Form.Item, { key: 'merchant', label: '商户', name: 'merchant', rules: [{ required: true, message: '请选择商户' }] }, h(Select, { placeholder: '请选择商户', options: source.merchants || [] })),
          h(Form.Item, { key: 'productSummary', label: '商品摘要', name: 'productSummary', rules: [{ required: true, message: '请输入商品或服务名称' }] }, h(Input, { placeholder: '请输入商品或服务名称', allowClear: true })),
          h(Form.Item, { key: 'items', label: '商品数量', name: 'items', rules: [{ required: true, message: '请输入商品数量' }] }, h(InputNumber, { min: 1, precision: 0, style: { width: '100%' }, placeholder: '请输入数量' })),
          h(Form.Item, { key: 'amount', label: '订单金额', name: 'amount', rules: [{ required: true, message: '请输入订单金额' }] }, h(InputNumber, { min: 0.01, precision: 2, style: { width: '100%' }, prefix: '¥', placeholder: '请输入金额' })),
          h(Form.Item, { key: 'channel', label: '支付渠道', name: 'channel', rules: [{ required: true, message: '请选择支付渠道' }] }, h(Select, { placeholder: '请选择支付渠道', options: source.channels || [] })),
          h(Form.Item, { key: 'orderedAt', label: '下单时间', name: 'orderedAt', rules: [{ required: true, message: '请选择下单时间' }] }, h(DatePicker, { showTime: true, format: 'YYYY-MM-DD HH:mm', style: { width: '100%' } })),
          h(Form.Item, { key: 'address', className: 'order-add-full', label: '收货地址', name: 'address', rules: [{ required: true, message: '请输入收货地址' }] }, h(Input.TextArea, { rows: 2, placeholder: '请输入完整收货地址', showCount: true, maxLength: 120 })),
          h(Form.Item, { key: 'remark', className: 'order-add-full', label: '备注', name: 'remark' }, h(Input.TextArea, { rows: 2, placeholder: '补充订单备注（选填）', showCount: true, maxLength: 120 }))
        ];
        const createDrawer = h(Drawer, { key: 'create-drawer', id: 'create-order-drawer', className: 'yipex-drawer', title: '新增订单', open: createOpen, placement: 'right', width: window.innerWidth <= 680 ? 'calc(100vw - 16px)' : 560, onClose: closeCreate, maskClosable: !creating, keyboard: !creating, destroyOnClose: true, footer: h(Space, null, [h(Button, { key: 'cancel', disabled: creating, onClick: closeCreate }, '取消'), h(Button, { key: 'submit', type: 'primary', loading: creating, onClick: submitCreate }, creating ? '提交中' : '保存订单')]) }, h(Form, { form: createForm, layout: 'vertical', size: 'middle', preserve: false }, h('div', { className: 'order-add-form-grid' }, createFields)));
        const modalBody = cancelRecord ? h(React.Fragment, null, [h(Alert, { key: 'warning', type: 'warning', showIcon: true, message: '取消后订单将无法继续处理', description: '该操作只更新当前演示数据，不会调用真实订单接口。' }), h(Descriptions, { key: 'summary', className: 'cancel-summary', column: 1, size: 'small' }, [h(Descriptions.Item, { key: 'id', label: '订单号' }, cancelRecord.id), h(Descriptions.Item, { key: 'customer', label: '客户' }, cancelRecord.customerName), h(Descriptions.Item, { key: 'amount', label: '订单金额' }, money(cancelRecord.amount)), h(Descriptions.Item, { key: 'status', label: '当前状态' }, cancelRecord.statusLabel)])]) : null;
        const modalNode = h(Modal, { key: 'cancel-modal', id: 'cancel-order-modal', className: 'yipex-modal', title: '取消订单', open: Boolean(cancelRecord), closable: !canceling, maskClosable: false, keyboard: !canceling, onCancel: closeCancel, footer: [h(Button, { key: 'close', disabled: canceling, onClick: closeCancel }, '暂不取消'), h(Button, { key: 'confirm', type: 'primary', danger: true, loading: canceling, onClick: confirmCancel }, canceling ? '取消中' : '确认取消')] }, modalBody);
        return h('main', { className: 'order-page', 'data-query-success': String(success) }, [headerNode, filterNode, resultNode, drawerNode, createDrawer, modalNode]);
      }
      ReactDOM.createRoot(document.getElementById('order-query-app')).render(h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { borderRadius: 8, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' }, components: { Table: { rowSelectedBg: '#F5F5F5', rowSelectedHoverBg: '#EDEDED' }, Select: { optionSelectedBg: '#F5F5F5', optionActiveBg: '#FAFAFA' } } } }, h(App)));
    })();
  `;
  const runtimeAssets = ['react.production.min.js', 'react-dom.production.min.js', 'dayjs.min.js', 'dayjs-zh-cn.js', 'antd.min.js', 'ant-design-icons.umd.js'];
  const preloads = runtimeAssets.map((asset) => `<link rel="preload" as="script" href="${vendorPath(asset)}">`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${vendorPath('antd-reset.css')}">${preloads}<title>${escape(metadata.pageName)} | YiPex</title><style>${shellCss}${pageCss}</style></head><body>${body}<script id="order-query-data" type="application/json">${embedded}</script><script defer src="${vendorPath('react.production.min.js')}"><\/script><script defer src="${vendorPath('react-dom.production.min.js')}"><\/script><script defer src="${vendorPath('dayjs.min.js')}"><\/script><script defer src="${vendorPath('dayjs-zh-cn.js')}"><\/script><script defer src="${vendorPath('antd.min.js')}"><\/script><script defer src="${vendorPath('ant-design-icons.umd.js')}"><\/script><script>${shellRuntime}</script><script>(() => { const start = () => { if (window.React && window.ReactDOM && window.antd && window.dayjs) { ${appScript} } else { window.requestAnimationFrame(start); } }; start(); })();</script></body></html>`;
}

function renderReceivingAccountCreate(pageSpec) {
  const { metadata, page } = pageSpec;
  const data = page.data || {};
  const shellDir = resolve(process.cwd(), 'modules/yipex/shell');
  const template = readFileSync(resolve(shellDir, 'shell.template.html'), 'utf8');
  const shellCss = readFileSync(resolve(shellDir, 'shell.css'), 'utf8');
  const shellRuntime = readFileSync(resolve(shellDir, 'shell-runtime.js'), 'utf8');
  const logo = readFileSync(resolve(shellDir, 'logo.svg')).toString('base64');
  const vendorPath = (file) => relative(dirname(specPath), resolve(shellDir, 'vendor', file)).split(sep).join('/');
  const shell = page.shell || {};
  const header = shell.header || {};
  const brand = shell.brand || {};
  const footer = shell.footer || {};
  const navigation = (shell.navigation || []).map((item) => `<a class="yipex-shell-nav-item${item.active ? ' active' : ''}" data-antd-component="Menu.Item" data-menu-key="${escape(item.id)}" href="#${escape(item.id)}" title="${escape(item.label || item.id)}" ${item.active ? 'aria-current="page"' : ''}><span class="nav-icon anticon" data-antd-icon="${escape(item.icon || 'AppstoreOutlined')}" aria-hidden="true"></span><span>${escape(item.label || item.id)}</span></a>`).join('');
  const content = '<div id="receiving-account-app" data-antd-component="ReceivingAccountCreateApp"><div class="receiving-initial-loading" role="status" aria-live="polite"><span class="receiving-loading-spinner" aria-hidden="true"></span><span>正在加载收款账户</span></div></div>';
  const values = {
    brandMark: brand.mark || 'Y',
    brandLogo: logo,
    brandName: brand.name || 'Yipex',
    welcome: header.welcome || metadata.pageName,
    userName: header.userName || '用户',
    email: header.email || 'user@yipex.tech',
    avatar: header.avatar || (header.userName || '用').slice(0, 1),
    copyright: footer.copyright || 'Copyright Somei E-Commerce Limited 2025. All rights reserved',
    navigation,
    content
  };
  const body = Object.entries(values).reduce((source, [key, value]) => source.replaceAll(`{{${key}}}`, value), template);
  const embedded = JSON.stringify({ data, initialState: page.states || {}, pageName: metadata.pageName }).replace(/</g, '\\u003c');
  const pageCss = `
    :root{--receiving-ink:#222;--receiving-text:rgba(0,0,0,.85);--receiving-muted:rgba(0,0,0,.65);--receiving-faint:rgba(0,0,0,.45);--receiving-line:#e7e8e8;--receiving-border:#d9d9d9;--receiving-brand:#4aa52e}
    .yipex-modal .ant-modal-content{padding:0;border-radius:8px;overflow:hidden}.yipex-modal .ant-modal-header{margin:0;padding:16px 24px;border-bottom:1px solid var(--receiving-line)}.yipex-modal .ant-modal-body{padding:24px}.yipex-modal .ant-modal-footer{margin:0;padding:16px 24px;border-top:1px solid var(--receiving-line);text-align:right}
    #receiving-account-app{min-height:100%}.receiving-initial-loading{min-height:420px;display:grid;place-content:center;justify-items:center;gap:12px;color:var(--receiving-muted);font-size:14px}.receiving-loading-spinner{width:22px;height:22px;border:2px solid var(--receiving-border);border-top-color:var(--receiving-brand);border-radius:50%;animation:receiving-spin .8s linear infinite}@keyframes receiving-spin{to{transform:rotate(360deg)}}
    .receiving-page{width:100%;max-width:1440px;margin:0 auto}.receiving-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.receiving-title-row{display:flex;align-items:center;gap:10px}.receiving-title{margin:0;color:var(--receiving-ink);font-size:20px;font-weight:500;line-height:28px}.receiving-filter-section{padding-bottom:16px;border-bottom:1px solid var(--receiving-line)}.receiving-filter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:end}.receiving-filter-grid .ant-form-item{margin-bottom:0}.receiving-filter-actions{grid-column:1 / -1;display:flex;justify-content:flex-end;gap:8px}
    .receiving-results{padding-top:16px}.receiving-results-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.receiving-results-title{display:flex;align-items:baseline;gap:8px;color:var(--receiving-text);font-size:16px;font-weight:500}.receiving-results-count{color:var(--receiving-faint);font-size:12px;font-weight:400}.receiving-card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.receiving-card-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.receiving-card-tags{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.receiving-card-holder{margin:16px 0 4px;color:var(--receiving-text);font-size:16px;font-weight:500;line-height:24px;overflow-wrap:anywhere}.receiving-card-id{color:var(--receiving-faint);font:400 12px/20px Roboto,-apple-system,sans-serif}.receiving-account-number{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin:16px 0;padding-bottom:16px;border-bottom:1px solid var(--receiving-line)}.receiving-account-number span{color:var(--receiving-faint);font-size:12px}.receiving-account-number strong{color:var(--receiving-ink);font:500 16px/24px Roboto,-apple-system,sans-serif}.receiving-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:0}.receiving-detail-item{min-width:0}.receiving-detail-item dt{margin:0 0 4px;color:var(--receiving-faint);font-size:12px;line-height:20px}.receiving-detail-item dd{margin:0;color:var(--receiving-text);font-size:14px;line-height:22px;overflow-wrap:anywhere}.receiving-card-footer{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding-top:16px}.receiving-card-update{color:var(--receiving-faint);font-size:12px;line-height:20px}.receiving-rejection{margin-top:12px;color:#ff4d4f;font-size:12px;line-height:20px}.receiving-state{min-height:340px;display:grid;place-items:center}.receiving-skeleton-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.receiving-skeleton-item{padding:16px;border:1px solid var(--receiving-line);border-radius:8px}
    .receiving-type-group{width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.receiving-type-card.ant-card{width:100%;height:100%;cursor:pointer;transition:border-color .2s,background-color .2s,box-shadow .2s}.receiving-type-card.ant-card:hover{background:var(--yipex-selection-hover,#ededed)}.receiving-type-card.ant-card:has(.ant-radio-checked){border-color:var(--receiving-ink);background:var(--yipex-selection,#f5f5f5);box-shadow:0 0 0 1px var(--receiving-ink)}.receiving-type-card.ant-card:focus-within{outline:2px solid var(--receiving-ink);outline-offset:2px}.receiving-type-radio.ant-radio-wrapper{width:100%;margin-inline-end:0;align-items:flex-start}.receiving-type-radio .ant-radio{margin-top:3px}.receiving-type-content{display:block;min-width:0}.receiving-type-heading{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.receiving-type-heading strong{color:var(--receiving-text);font-size:14px;font-weight:500;line-height:22px}.receiving-type-description{display:block;margin-top:8px;color:var(--receiving-muted);font-size:12px;line-height:20px}.receiving-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:16px}.receiving-span-full{grid-column:1 / -1}.receiving-form-grid .ant-form-item{margin-bottom:16px}
    @media(max-width:1040px){.receiving-card-grid,.receiving-skeleton-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:820px){.receiving-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:680px){.receiving-header{align-items:flex-start;flex-direction:column}.receiving-header .ant-btn{align-self:flex-end}.receiving-filter-grid,.receiving-card-grid,.receiving-skeleton-grid,.receiving-type-group,.receiving-form-grid{grid-template-columns:1fr}.receiving-filter-actions,.receiving-span-full{grid-column:auto}.receiving-detail-grid{grid-template-columns:1fr}}
  `;
  const appScript = `
    (() => {
      const h = React.createElement;
      const { ConfigProvider, Form, Select, Input, Button, Card, Tag, Modal, Radio, Empty, Result, Skeleton, message } = antd;
      const { PlusOutlined } = window.icons || {};
      const payload = JSON.parse(document.getElementById('receiving-account-data').textContent);
      const source = payload.data || {};
      const initial = payload.initialState || {};
      const previewState = new URLSearchParams(window.location.search).get('state') || '';
      const allValue = 'ALL';
      const accountStatusColors = { SUCCESS: 'green', REJECTED: 'red', REVIEWING: 'blue' };
      const orderStatusColors = { COMPLETED: 'green', PROCESSING: 'blue', CLOSED: 'default' };
      const lookup = (items, value, field = 'label') => items.find((item) => item.value === value)?.[field] || value;
      const wait = (milliseconds) => new Promise((resolveWait) => window.setTimeout(resolveWait, milliseconds));
      function App() {
        const [filterForm] = Form.useForm();
        const [createForm] = Form.useForm();
        const initialRecords = Boolean(initial.empty) || previewState === 'empty' ? [] : (source.records || []);
        const [records, setRecords] = React.useState(initialRecords);
        const [filters, setFilters] = React.useState({ type: allValue, accountStatus: allValue, orderStatus: allValue });
        const [loading, setLoading] = React.useState(Boolean(initial.loading) || previewState === 'loading');
        const [error, setError] = React.useState(Boolean(initial.error) || previewState === 'error');
        const [modalOpen, setModalOpen] = React.useState(Boolean(initial.modalOpen));
        const [creating, setCreating] = React.useState(Boolean(initial.creating));
        const permissionDenied = Boolean(initial['permission-denied']) || previewState === 'permission-denied';
        React.useEffect(() => {
          if (!loading) return undefined;
          const timer = window.setTimeout(() => setLoading(false), 900);
          return () => window.clearTimeout(timer);
        }, []);
        const filtered = records.filter((record) => (filters.type === allValue || record.type === filters.type) && (filters.accountStatus === allValue || record.accountStatus === filters.accountStatus) && (filters.orderStatus === allValue || record.orderStatus === filters.orderStatus));
        const typeFilterOptions = [{ value: allValue, label: '全部类型' }, ...(source.accountTypes || []).map((item) => ({ value: item.value, label: item.label }))];
        const applyFilters = async (values) => {
          setLoading(true);
          await wait(360);
          setFilters({ type: values.type || allValue, accountStatus: values.accountStatus || allValue, orderStatus: values.orderStatus || allValue });
          setLoading(false);
          message.success('查询条件已应用');
        };
        const resetFilters = () => {
          filterForm.resetFields();
          setFilters({ type: allValue, accountStatus: allValue, orderStatus: allValue });
          message.info('已重置查询条件');
        };
        const closeModal = () => {
          if (creating) return;
          setModalOpen(false);
          createForm.resetFields();
        };
        const createAccount = async (values) => {
          setCreating(true);
          await wait(850);
          const type = source.accountTypes.find((item) => item.value === values.type);
          const created = {
            id: 'RA-DEMO-' + String(Date.now()).slice(-6),
            type: values.type,
            typeLabel: type?.label || values.type,
            typeTag: type?.tag || '',
            accountHolder: String(values.accountHolder || '').trim(),
            openingLocation: lookup(source.openingLocations || [], values.openingLocation),
            bankName: lookup(source.banks || [], values.bankName),
            currency: values.currency,
            tradeRegions: (values.tradeRegions || []).map((value) => lookup(source.tradeRegions || [], value)),
            goodsCategory: lookup(source.goodsCategories || [], values.goodsCategory),
            accountStatus: 'REVIEWING',
            accountStatusLabel: '审核中',
            orderStatus: 'PROCESSING',
            orderStatusLabel: '处理中',
            accountNumber: '待分配',
            updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
            isNew: true
          };
          setRecords((current) => [created, ...current]);
          setFilters({ type: allValue, accountStatus: allValue, orderStatus: allValue });
          filterForm.resetFields();
          createForm.resetFields();
          setCreating(false);
          setModalOpen(false);
          message.success('收款账户创建申请已提交，当前状态为审核中');
        };
        const retry = async () => { setError(false); setLoading(true); await wait(650); setLoading(false); message.success('收款账户已重新加载'); };
        if (permissionDenied) return h('main', { className: 'receiving-page receiving-state' }, h(Result, { status: '403', title: '暂无收款账户权限', subTitle: '请联系管理员开通收款账户查看与新增权限。', extra: h(Button, { onClick: () => { window.location.hash = 'overview'; } }, '返回经营概览') }));
        const headerNode = h('header', { key: 'header', id: 'receiving-account-header', className: 'receiving-header' }, [
          h('div', { key: 'title', className: 'receiving-title-row' }, [h('h1', { key: 'text', className: 'receiving-title' }, payload.pageName), h(Tag, { key: 'demo' }, '演示数据')]),
          h(Button, { key: 'create', id: 'open-create-account', type: 'primary', icon: PlusOutlined ? h(PlusOutlined) : null, onClick: () => setModalOpen(true) }, '新增收款账户')
        ]);
        const filterNode = h('section', { key: 'filters', id: 'receiving-account-filters', className: 'receiving-filter-section', 'aria-label': '收款账户查询条件' }, h(Form, { form: filterForm, layout: 'vertical', size: 'middle', initialValues: { type: allValue, accountStatus: allValue, orderStatus: allValue }, onFinish: applyFilters }, h('div', { className: 'receiving-filter-grid' }, [
          h(Form.Item, { key: 'type', label: '账户类型', name: 'type' }, h(Select, { options: typeFilterOptions })),
          h(Form.Item, { key: 'accountStatus', label: '账户状态', name: 'accountStatus' }, h(Select, { options: source.accountStatuses || [] })),
          h(Form.Item, { key: 'orderStatus', label: '订单状态', name: 'orderStatus' }, h(Select, { options: source.orderStatuses || [] })),
          h('div', { key: 'actions', className: 'receiving-filter-actions' }, [h(Button, { key: 'reset', id: 'reset-account-filters', onClick: resetFilters }, '重置'), h(Button, { key: 'query', id: 'query-accounts', type: 'primary', htmlType: 'submit', loading }, '查询')])
        ])));
        const cardNodes = filtered.map((record) => h(Card, { key: record.id, bordered: true }, [
          h('div', { key: 'top', className: 'receiving-card-top' }, [
            h('div', { key: 'tags', className: 'receiving-card-tags' }, [h(Tag, { key: 'type' }, record.typeTag), record.isNew ? h(Tag, { key: 'new', color: 'green' }, '刚刚创建') : null]),
            h(Tag, { key: 'status', color: accountStatusColors[record.accountStatus] }, record.accountStatusLabel)
          ]),
          h('h3', { key: 'holder', className: 'receiving-card-holder' }, record.accountHolder),
          h('span', { key: 'id', className: 'receiving-card-id' }, record.id),
          h('div', { key: 'number', className: 'receiving-account-number' }, [h('span', { key: 'label' }, '收款账户'), h('strong', { key: 'value' }, record.currency + ' · ' + record.accountNumber)]),
          h('dl', { key: 'details', className: 'receiving-detail-grid' }, [
            h('div', { key: 'location', className: 'receiving-detail-item' }, [h('dt', null, '开户地'), h('dd', null, record.openingLocation)]),
            h('div', { key: 'bank', className: 'receiving-detail-item' }, [h('dt', null, '开户行'), h('dd', null, record.bankName)]),
            h('div', { key: 'region', className: 'receiving-detail-item' }, [h('dt', null, '贸易国家/地区'), h('dd', null, record.tradeRegions.join('、'))]),
            h('div', { key: 'category', className: 'receiving-detail-item' }, [h('dt', null, '商品大类'), h('dd', null, record.goodsCategory)])
          ]),
          record.rejectionReason ? h('div', { key: 'rejection', className: 'receiving-rejection' }, '驳回原因：' + record.rejectionReason) : null,
          h('div', { key: 'footer', className: 'receiving-card-footer' }, [h(Tag, { key: 'order', color: orderStatusColors[record.orderStatus] }, '订单' + record.orderStatusLabel), h('span', { key: 'updated', className: 'receiving-card-update' }, '更新于 ' + record.updatedAt)])
        ]));
        let resultBody;
        if (error) {
          resultBody = h('div', { className: 'receiving-state' }, h(Result, { status: 'error', title: '收款账户加载失败', subTitle: '演示数据暂时无法读取，请重试。', extra: h(Button, { type: 'primary', onClick: retry }, '重新加载') }));
        } else if (loading) {
          resultBody = h('div', { className: 'receiving-skeleton-grid', role: 'status', 'aria-live': 'polite' }, [0, 1, 2].map((index) => h('div', { key: index, className: 'receiving-skeleton-item' }, h(Skeleton, { active: true, paragraph: { rows: 6 } }))));
        } else if (!filtered.length) {
          resultBody = h('div', { className: 'receiving-state' }, h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: records.length ? '没有符合条件的收款账户' : '暂无收款账户' }));
        } else {
          resultBody = h('div', { className: 'receiving-card-grid' }, cardNodes);
        }
        const resultsNode = h('section', { key: 'results', id: 'receiving-account-results', className: 'receiving-results', 'aria-labelledby': 'receiving-results-title' }, [
          h('div', { key: 'head', className: 'receiving-results-head' }, h('div', { id: 'receiving-results-title', className: 'receiving-results-title' }, ['账户结果', h('span', { key: 'count', className: 'receiving-results-count' }, '共 ' + filtered.length + ' 个')])),
          resultBody
        ]);
        const typeRadios = (source.accountTypes || []).map((item) => h(Card, { key: item.value, size: 'small', hoverable: true, className: 'receiving-type-card', onClick: () => createForm.setFieldValue('type', item.value) }, h(Radio, { value: item.value, className: 'receiving-type-radio' }, h('span', { className: 'receiving-type-content' }, [h('span', { key: 'heading', className: 'receiving-type-heading' }, [h('strong', { key: 'label' }, item.label), h(Tag, { key: 'tag' }, item.tag)]), h('span', { key: 'description', className: 'receiving-type-description' }, item.description)]))));
        const modalNode = h(Modal, {
          key: 'modal',
          className: 'receiving-modal yipex-modal',
          title: '新增收款账户',
          open: modalOpen,
          closable: !creating,
          maskClosable: !creating,
          keyboard: !creating,
          onCancel: closeModal,
          footer: [h(Button, { key: 'cancel', id: 'cancel-create-account', disabled: creating, onClick: closeModal }, '取消'), h(Button, { key: 'create', id: 'create-account', type: 'primary', loading: creating, onClick: () => createForm.submit() }, creating ? '创建中' : '创建账户')]
        }, h(Form, { form: createForm, layout: 'vertical', size: 'middle', preserve: false, onFinish: createAccount, scrollToFirstError: true }, h('div', { className: 'receiving-form-grid' }, [
          h(Form.Item, { key: 'type', className: 'receiving-span-full', label: '账户类型', name: 'type', rules: [{ required: true, message: '请选择一种账户类型' }] }, h(Radio.Group, { className: 'receiving-type-group' }, typeRadios)),
          h(Form.Item, { key: 'holder', className: 'receiving-span-full', label: '账户持有人', name: 'accountHolder', rules: [{ required: true, message: '请输入账户持有人' }, { max: 80, message: '账户持有人不能超过 80 个字符' }] }, h(Input, { allowClear: true, maxLength: 80, placeholder: '请输入企业或个人持有人名称' })),
          h(Form.Item, { key: 'location', label: '开户地', name: 'openingLocation', rules: [{ required: true, message: '请选择开户地' }] }, h(Select, { showSearch: true, optionFilterProp: 'label', placeholder: '请选择开户地', options: source.openingLocations || [] })),
          h(Form.Item, { key: 'bank', label: '开户行', name: 'bankName', rules: [{ required: true, message: '请选择开户行' }] }, h(Select, { showSearch: true, optionFilterProp: 'label', placeholder: '请选择开户行', options: source.banks || [] })),
          h(Form.Item, { key: 'currency', label: '账户币种', name: 'currency', rules: [{ required: true, message: '请选择账户币种' }] }, h(Select, { showSearch: true, optionFilterProp: 'label', placeholder: '请选择账户币种', options: source.currencies || [] })),
          h(Form.Item, { key: 'category', label: '商品大类', name: 'goodsCategory', rules: [{ required: true, message: '请选择商品大类' }] }, h(Select, { placeholder: '请选择商品大类', options: source.goodsCategories || [] })),
          h(Form.Item, { key: 'regions', className: 'receiving-span-full', label: '贸易国家/地区', name: 'tradeRegions', rules: [{ required: true, type: 'array', min: 1, message: '请至少选择一个贸易国家/地区' }] }, h(Select, { mode: 'multiple', allowClear: true, optionFilterProp: 'label', maxTagCount: 'responsive', placeholder: '请选择贸易国家/地区', options: source.tradeRegions || [] }))
        ])));
        return h('main', { className: 'receiving-page' }, [headerNode, filterNode, resultsNode, modalNode]);
      }
      ReactDOM.createRoot(document.getElementById('receiving-account-app')).render(h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { borderRadius: 8, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' }, components: { Table: { rowSelectedBg: '#F5F5F5', rowSelectedHoverBg: '#EDEDED' }, Select: { optionSelectedBg: '#F5F5F5', optionActiveBg: '#FAFAFA' } } } }, h(App)));
    })();
  `;
  const runtimeAssets = ['react.production.min.js', 'react-dom.production.min.js', 'dayjs.min.js', 'dayjs-zh-cn.js', 'antd.min.js', 'ant-design-icons.umd.js'];
  const preloads = runtimeAssets.map((asset) => `<link rel="preload" as="script" href="${vendorPath(asset)}">`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${vendorPath('antd-reset.css')}">${preloads}<title>${escape(metadata.pageName)} | YiPex</title><style>${shellCss}${pageCss}</style></head><body>${body}<script id="receiving-account-data" type="application/json">${embedded}</script><script defer src="${vendorPath('react.production.min.js')}"><\/script><script defer src="${vendorPath('react-dom.production.min.js')}"><\/script><script defer src="${vendorPath('dayjs.min.js')}"><\/script><script defer src="${vendorPath('dayjs-zh-cn.js')}"><\/script><script defer src="${vendorPath('antd.min.js')}"><\/script><script defer src="${vendorPath('ant-design-icons.umd.js')}"><\/script><script>${shellRuntime}</script><script>(() => { const start = () => { if (window.React && window.ReactDOM && window.antd && window.dayjs) { ${appScript} } else { window.requestAnimationFrame(start); } }; start(); })();</script></body></html>`;
}

function renderSettlementRuleForm(pageSpec) {
  const { metadata, page } = pageSpec;
  const data = page.data || {};
  const props = page.root?.props || {};
  const shellDir = resolve(process.cwd(), 'modules/yipex/shell');
  const template = readFileSync(resolve(shellDir, 'shell.template.html'), 'utf8');
  const shellCss = readFileSync(resolve(shellDir, 'shell.css'), 'utf8');
  const shellRuntime = readFileSync(resolve(shellDir, 'shell-runtime.js'), 'utf8');
  const logo = readFileSync(resolve(shellDir, 'logo.svg')).toString('base64');
  const vendorPath = (file) => relative(dirname(specPath), resolve(shellDir, 'vendor', file)).split(sep).join('/');
  const shell = page.shell || {};
  const header = shell.header || {};
  const brand = shell.brand || {};
  const footer = shell.footer || {};
  const navigation = (shell.navigation || []).map((item) => `<a class="yipex-shell-nav-item${item.active ? ' active' : ''}" data-antd-component="Menu.Item" data-menu-key="${escape(item.id)}" href="#${escape(item.id)}" title="${escape(item.label || item.id)}" ${item.active ? 'aria-current="page"' : ''}><span class="nav-icon anticon" data-antd-icon="${escape(item.icon || 'AppstoreOutlined')}" aria-hidden="true"></span><span>${escape(item.label || item.id)}</span></a>`).join('');
  const content = '<div id="settlement-rule-app" data-antd-component="SettlementRuleFormApp"><div class="settlement-loading" role="status" aria-live="polite"><span class="settlement-loading-spinner" aria-hidden="true"></span><span>正在加载规则表单</span></div></div>';
  const values = {
    brandMark: brand.mark || 'Y',
    brandLogo: logo,
    brandName: brand.name || 'Yipex',
    welcome: header.welcome || metadata.pageName,
    userName: header.userName || '用户',
    email: header.email || 'user@yipex.tech',
    avatar: header.avatar || (header.userName || '用').slice(0, 1),
    copyright: footer.copyright || 'Copyright Somei E-Commerce Limited 2025. All rights reserved',
    navigation,
    content
  };
  const body = Object.entries(values).reduce((source, [key, value]) => source.replaceAll(`{{${key}}}`, value), template);
  const embedded = JSON.stringify({ data, initialState: page.states || {}, pageName: metadata.pageName, props }).replace(/</g, '\\u003c');
  const pageCss = `
    :root{--yipex-control-height:32px;--settlement-ink:#222;--settlement-text:rgba(0,0,0,.85);--settlement-muted:rgba(0,0,0,.58);--settlement-faint:rgba(0,0,0,.45);--settlement-line:#e7e8e8;--settlement-brand:#4aa52e}
    #settlement-rule-app{min-height:100%}.settlement-loading{min-height:420px;display:grid;place-content:center;justify-items:center;gap:12px;color:var(--settlement-muted);font-size:14px}.settlement-loading-spinner{width:22px;height:22px;border:2px solid #dfead9;border-top-color:var(--settlement-brand);border-radius:50%;animation:settlement-spin .8s linear infinite}@keyframes settlement-spin{to{transform:rotate(360deg)}}
    .settlement-page{width:100%;max-width:960px;margin:0 auto}.settlement-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:24px;border-bottom:1px solid var(--settlement-line)}.settlement-title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.settlement-title{margin:0;color:var(--settlement-ink);font-size:28px;font-weight:500;line-height:1.4}.settlement-demo{margin:0!important;border:0!important;border-radius:4px!important;background:#eff0f1!important;color:var(--settlement-muted)!important}.settlement-subtitle{margin:8px 0 0;color:var(--settlement-muted);font-size:14px;line-height:24px}
    .settlement-form-section{padding-top:24px}.settlement-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:20px}.settlement-section-title{margin:0;color:var(--settlement-text);font-size:16px;font-weight:500;line-height:24px}.settlement-required-note{color:var(--settlement-faint);font-size:12px}.settlement-required-note b{margin-right:4px;color:#ff4d4f;font-weight:400}.settlement-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:32px;row-gap:0}.settlement-span-full{grid-column:1 / -1}.settlement-form-grid .ant-form-item{margin-bottom:20px}.settlement-form-grid .ant-form-item-label{padding-bottom:6px}.settlement-form-grid .ant-form-item-label>label{color:var(--settlement-text);font-weight:400}.settlement-form-grid .ant-input-number,.settlement-form-grid .ant-picker{width:100%}.settlement-switch-box{min-height:calc(var(--yipex-control-height) + 16px);padding:9px 12px;border:1px solid #d9d9d9;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:20px}.settlement-switch-copy{min-width:0}.settlement-switch-copy strong{display:block;color:var(--settlement-text);font-size:14px;font-weight:500;line-height:22px}.settlement-switch-copy span{display:block;margin-top:2px;color:var(--settlement-faint);font-size:12px;line-height:20px}.settlement-error{margin-bottom:20px}.settlement-actions{position:sticky;bottom:-24px;z-index:5;display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:12px;padding:16px 0 8px;border-top:1px solid var(--settlement-line);background:#fff}.settlement-success{padding:calc(var(--yipex-control-height) + 8px) 0}.settlement-success .ant-result-title{font-size:20px}.settlement-success .ant-result-extra{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}.settlement-permission{padding:calc(var(--yipex-control-height) + 16px) 0}
    @media(max-width:680px){.settlement-page{max-width:none}.settlement-header{padding-bottom:20px}.settlement-title{font-size:28px}.settlement-form-section{padding-top:20px}.settlement-form-grid{grid-template-columns:1fr}.settlement-span-full{grid-column:auto}.settlement-section-head{align-items:flex-start;flex-direction:column;gap:4px}.settlement-actions{bottom:-24px}.settlement-actions .ant-btn{min-height:var(--yipex-control-height)}.settlement-success{padding:24px 0}.settlement-success .ant-result{padding-left:0;padding-right:0}}
  `;
  const appScript = `
    (() => {
      const h = React.createElement;
      const { ConfigProvider, Form, Input, InputNumber, Select, DatePicker, Switch, Button, Alert, Modal, Result, Tag, message, Spin } = antd;
      const payload = JSON.parse(document.getElementById('settlement-rule-data').textContent);
      const source = payload.data || {};
      const initial = payload.initialState || {};
      const submitConfig = source.demoSubmission || {};
      const wait = (milliseconds) => new Promise((resolveWait) => window.setTimeout(resolveWait, milliseconds));
      function App() {
        const [form] = Form.useForm();
        const [dirty, setDirty] = React.useState(Boolean(initial.unsaved));
        const [submitting, setSubmitting] = React.useState(Boolean(initial.submitting));
        const [submissionError, setSubmissionError] = React.useState(initial.error ? submitConfig.errorMessage : '');
        const [savedResult, setSavedResult] = React.useState(initial.success ? { id: 'SR-DEMO', name: '演示规则' } : null);
        const dirtyRef = React.useRef(dirty);
        React.useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
        React.useEffect(() => {
          const beforeUnload = (event) => { if (!dirtyRef.current) return; event.preventDefault(); event.returnValue = ''; };
          const interceptNavigation = (event) => {
            const link = event.target.closest('.yipex-shell-nav-item');
            if (!link || !dirtyRef.current) return;
            event.preventDefault();
            Modal.confirm({
              title: '离开此页面？',
              content: '当前修改尚未保存，离开后将无法恢复。',
              okText: '放弃修改',
              cancelText: '继续编辑',
              okButtonProps: { danger: true },
              onOk: () => { setDirty(false); window.location.hash = link.dataset.menuKey || 'settlement-rules'; }
            });
          };
          window.addEventListener('beforeunload', beforeUnload);
          document.addEventListener('click', interceptNavigation, true);
          return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', interceptNavigation, true); };
        }, []);
        const leavePage = () => {
          const discard = () => { form.resetFields(); setDirty(false); setSubmissionError(''); window.location.hash = 'settlement-rules'; message.info('已取消新增规则'); };
          if (!dirty) { discard(); return; }
          Modal.confirm({
            title: '放弃未保存的修改？',
            content: '当前填写的规则内容将不会保留。',
            okText: '放弃修改',
            cancelText: '继续编辑',
            okButtonProps: { danger: true },
            onOk: discard
          });
        };
        const submitRule = async (values) => {
          setSubmitting(true);
          setSubmissionError('');
          await wait(Number(submitConfig.latencyMs) || 900);
          const forcedFailure = submitConfig.mode === 'failure' || new URLSearchParams(window.location.search).get('submit') === 'failure';
          if (forcedFailure) {
            const errorText = submitConfig.errorMessage || '保存失败，请稍后重试';
            setSubmitting(false);
            setSubmissionError(errorText);
            message.error(errorText);
            return;
          }
          setSubmitting(false);
          setDirty(false);
          setSavedResult({ id: 'SR-DEMO-' + String(Date.now()).slice(-6), name: String(values.ruleName || '').trim() });
          message.success('结算规则已保存');
        };
        const continueCreating = () => {
          form.resetFields();
          setSavedResult(null);
          setSubmissionError('');
          setDirty(false);
          window.requestAnimationFrame(() => document.querySelector('#rule-name')?.focus());
        };
        if (initial['permission-denied']) {
          return h(Result, { className: 'settlement-permission', status: '403', title: '暂无配置权限', subTitle: '请联系管理员开通结算规则管理权限。', extra: h(Button, { onClick: () => { window.location.hash = 'settlement'; } }, '返回结算管理') });
        }
        if (initial.loading) return h('div', { className: 'settlement-loading' }, h(Spin, { tip: '正在加载规则表单' }));
        if (savedResult) {
          return h('main', { className: 'settlement-page settlement-success' }, h(Result, {
            status: 'success',
            title: '结算规则已保存',
            subTitle: savedResult.name + ' · 演示编号 ' + savedResult.id,
            extra: [
              h(Button, { key: 'back', onClick: () => { window.location.hash = 'settlement-rules'; } }, '返回规则列表'),
              h(Button, { key: 'continue', type: 'primary', onClick: continueCreating }, '继续新增')
            ]
          }));
        }
        const initialValues = { autoSettlement: true, ...(source.initialValues || {}) };
        return h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { borderRadius: 8, controlHeight: 32, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' }, components: { Table: { rowSelectedBg: '#F5F5F5', rowSelectedHoverBg: '#EDEDED' }, Select: { optionSelectedBg: '#F5F5F5', optionActiveBg: '#FAFAFA' } } } }, h('main', { className: 'settlement-page' }, [
          h('header', { key: 'header', id: 'form-header', className: 'settlement-header' }, h('div', null, [
            h('div', { key: 'row', className: 'settlement-title-row' }, [h('h1', { key: 'title', className: 'settlement-title' }, payload.pageName), h(Tag, { key: 'demo', className: 'settlement-demo' }, '演示数据')]),
            h('p', { key: 'subtitle', className: 'settlement-subtitle' }, payload.props.subtitle || '配置商户的结算周期、费率与生效方式')
          ])),
          h('section', { key: 'form-section', className: 'settlement-form-section', 'aria-labelledby': 'settlement-section-title' }, [
            h('div', { key: 'heading', className: 'settlement-section-head' }, [h('h2', { key: 'title', id: 'settlement-section-title', className: 'settlement-section-title' }, '规则信息'), h('span', { key: 'note', className: 'settlement-required-note' }, [h('b', { key: 'star' }, '*'), '为必填项'])]),
            submissionError ? h(Alert, { key: 'error', className: 'settlement-error', type: 'error', showIcon: true, closable: true, message: '规则保存失败', description: submissionError, onClose: () => setSubmissionError('') }) : null,
            h(Form, {
              key: 'form',
              id: 'settlement-rule-form',
              form,
              layout: 'vertical',
              requiredMark: true,
              validateTrigger: ['onChange', 'onBlur'],
              initialValues,
              onValuesChange: () => { setDirty(true); if (submissionError) setSubmissionError(''); },
              onFinish: submitRule,
              onFinishFailed: ({ errorFields }) => { if (errorFields.length) { form.scrollToField(errorFields[0].name, { block: 'center' }); message.error('请检查表单中的错误项'); } },
              scrollToFirstError: { block: 'center' }
            }, [
              h('div', { key: 'grid', className: 'settlement-form-grid' }, [
                h(Form.Item, { key: 'ruleName', className: 'settlement-span-full', label: '规则名称', name: 'ruleName', rules: [
                  { required: true, message: '请输入规则名称' },
                  { min: 2, max: 40, message: '规则名称需为 2-40 个字符' },
                  { validator: (_, value) => !value || value === value.trim() ? Promise.resolve() : Promise.reject(new Error('规则名称首尾不能包含空格')) }
                ] }, h(Input, { id: 'rule-name', allowClear: true, maxLength: 40, showCount: true, placeholder: '例如：华东区餐饮商户 T+1 结算' })),
                h(Form.Item, { key: 'merchantIds', className: 'settlement-span-full', label: '适用商户', name: 'merchantIds', rules: [{ required: true, type: 'array', min: 1, message: '请至少选择一个适用商户' }] }, h(Select, { mode: 'multiple', allowClear: true, showSearch: true, optionFilterProp: 'label', maxTagCount: 'responsive', placeholder: '请选择适用商户', options: source.merchants || [] })),
                h(Form.Item, { key: 'cycle', label: '结算周期', name: 'settlementCycle', rules: [{ required: true, message: '请选择结算周期' }] }, h(Select, { placeholder: '请选择结算周期', options: source.settlementCycles || [] })),
                h(Form.Item, { key: 'feeRate', label: '手续费率', name: 'feeRate', extra: '可输入 0-100，最多 4 位小数', rules: [{ required: true, message: '请输入手续费率' }, { type: 'number', min: 0, max: 100, message: '手续费率需在 0-100 之间' }] }, h(InputNumber, { min: 0, max: 100, precision: 4, step: 0.01, addonAfter: '%', placeholder: '0.00' })),
                h(Form.Item, { key: 'minimumAmount', label: '最低结算金额', name: 'minimumAmount', extra: '余额达到该金额后才发起结算', rules: [{ required: true, message: '请输入最低结算金额' }, { type: 'number', min: 0, max: 1000000, message: '金额需在 0-1,000,000 元之间' }] }, h(InputNumber, { min: 0, max: 1000000, precision: 2, step: 100, prefix: '¥', placeholder: '0.00' })),
                h(Form.Item, { key: 'effectiveAt', label: '生效时间', name: 'effectiveAt', rules: [{ required: true, message: '请选择生效时间' }, { validator: (_, value) => !value || value.isAfter(dayjs()) ? Promise.resolve() : Promise.reject(new Error('生效时间需晚于当前时间')) }] }, h(DatePicker, { showTime: { format: 'HH:mm', minuteStep: 15 }, format: 'YYYY-MM-DD HH:mm', placeholder: '请选择生效时间', disabledDate: (date) => date && date.isBefore(dayjs().startOf('day')) })),
                h(Form.Item, { key: 'autoSettlement', className: 'settlement-span-full', label: '自动结算（选填）' }, h('div', { className: 'settlement-switch-box' }, [h('div', { key: 'copy', className: 'settlement-switch-copy' }, [h('strong', { key: 'title' }, '按规则自动发起结算'), h('span', { key: 'description' }, '关闭后需由财务人员手动发起结算')]), h(Form.Item, { key: 'switch-field', name: 'autoSettlement', valuePropName: 'checked', noStyle: true }, h(Switch, { checkedChildren: '开启', unCheckedChildren: '关闭' }))])),
                h(Form.Item, { key: 'notes', className: 'settlement-span-full', label: '备注（选填）', name: 'notes', rules: [{ max: 200, message: '备注不能超过 200 个字符' }] }, h(Input.TextArea, { rows: 4, maxLength: 200, showCount: true, placeholder: '补充适用范围或审批说明' }))
              ]),
              h('div', { key: 'actions', id: 'form-actions', className: 'settlement-actions' }, [h(Button, { key: 'cancel', id: 'cancel-rule', disabled: submitting, onClick: leavePage }, '取消'), h(Button, { key: 'save', id: 'save-rule', type: 'primary', htmlType: 'submit', loading: submitting }, submitting ? '保存中' : '保存规则')])
            ])
          ])
        ]));
      }
      ReactDOM.createRoot(document.getElementById('settlement-rule-app')).render(h(ConfigProvider, { autoInsertSpaceInButton: true, theme: { token: { borderRadius: 8, controlHeight: 32, colorPrimary: '#222222', colorLink: '#4AA52E', colorLinkHover: '#357D21', controlItemBgActive: '#F5F5F5', controlItemBgActiveHover: '#EDEDED' }, components: { Table: { rowSelectedBg: '#F5F5F5', rowSelectedHoverBg: '#EDEDED' }, Select: { optionSelectedBg: '#F5F5F5', optionActiveBg: '#FAFAFA' } } } }, h(App)));
    })();
  `;
  const runtimeAssets = ['react.production.min.js', 'react-dom.production.min.js', 'dayjs.min.js', 'dayjs-zh-cn.js', 'antd.min.js', 'ant-design-icons.umd.js'];
  const preloads = runtimeAssets.map((asset) => `<link rel="preload" as="script" href="${vendorPath(asset)}">`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${vendorPath('antd-reset.css')}">${preloads}<title>${escape(metadata.pageName)} | YiPex</title><style>${shellCss}${pageCss}</style></head><body>${body}<script id="settlement-rule-data" type="application/json">${embedded}</script><script defer src="${vendorPath('react.production.min.js')}"><\/script><script defer src="${vendorPath('react-dom.production.min.js')}"><\/script><script defer src="${vendorPath('dayjs.min.js')}"><\/script><script defer src="${vendorPath('dayjs-zh-cn.js')}"><\/script><script defer src="${vendorPath('antd.min.js')}"><\/script><script defer src="${vendorPath('ant-design-icons.umd.js')}"><\/script><script>${shellRuntime}</script><script>(() => { const start = () => { if (window.React && window.ReactDOM && window.antd && window.dayjs) { ${appScript} } else { window.requestAnimationFrame(start); } }; start(); })();</script></body></html>`;
}

const registeredHtml = renderRegisteredPage(spec.page.extensions?.renderer, spec, { projectRoot: process.cwd(), specPath });
const html = registeredHtml || (spec.page.extensions?.renderer === 'order-analysis-dashboard-v1'
  ? renderOrderDashboard(spec)
  : spec.page.extensions?.renderer === 'order-analysis-dashboard-v2-antd-shell'
    ? renderAntOrderDashboard(spec)
  : ['query-list-v1', 'query-list-v2-antd-shell'].includes(spec.page.extensions?.renderer)
    ? renderAntQueryList(spec)
  : spec.page.extensions?.renderer === 'merchant-query-list-v1-antd-shell'
    ? renderMerchantQueryList(spec)
    : spec.page.extensions?.renderer === 'order-query-list-v2-antd-shell'
      ? renderOrderQueryList(spec)
    : spec.page.extensions?.renderer === 'receiving-account-create-v1-antd-shell'
      ? renderReceivingAccountCreate(spec)
    : spec.page.extensions?.renderer === 'settlement-rule-form-v1-antd-shell'
      ? renderSettlementRuleForm(spec)
    : renderDefaultShell(spec));

const output = resolve(dirname(specPath), 'preview.html');
writeFileSync(output, html);
console.log(`yipex-page-build: pass (${output})`);
