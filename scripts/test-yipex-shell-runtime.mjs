#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const runtime = readFileSync(new URL('../modules/yipex/shell/shell-runtime.js', import.meta.url), 'utf8');
const shellCss = readFileSync(new URL('../modules/yipex/shell/shell.css', import.meta.url), 'utf8');
const listeners = new Map();

const makeNav = (key, title, active = false) => ({
  dataset: { menuKey: key },
  attributes: new Map([['title', title], ...(active ? [['aria-current', 'page']] : [])]),
  classList: { contains: (name) => active && name === 'active', toggle() {} },
  getAttribute(name) { return this.attributes.get(name) || null; },
  setAttribute(name, value) { this.attributes.set(name, value); },
  removeAttribute(name) { this.attributes.delete(name); },
  addEventListener(type, handler) { listeners.set(`${key}:${type}`, handler); },
  textContent: title
});

const home = makeNav('home', '首页');
const business = makeNav('receiving-account', '收款账户', true);
const page = {
  dataset: {},
  querySelector() { return {}; },
  set innerHTML(value) { this.html = value; },
  get innerHTML() { return this.html || ''; }
};
const shell = {
  querySelector(selector) { return selector === '#yipex-page' ? page : null; },
  querySelectorAll(selector) { return selector === '.yipex-shell-nav-item' ? [home, business] : []; },
  classList: { toggle() { return false; } }
};
let reloads = 0;
const context = {
  document: { querySelector() { return shell; }, addEventListener() {} },
  window: {
    icons: {},
    antd: { Empty: Object.assign(() => null, { PRESENTED_IMAGE_SIMPLE: {} }) },
    React: { createElement() { return {}; } },
    ReactDOM: { createRoot() { return { render() {} }; } },
    history: { length: 2, replaceState() {}, back() {} },
    location: { reload() { reloads += 1; }, assign() {} },
    setTimeout() {}
  },
  CustomEvent: class {}
};

vm.runInNewContext(runtime, context);
listeners.get('home:click')({ preventDefault() {} });
if (page.dataset.shellEmpty !== 'true') throw new Error('switching away must mark the shell empty state');
if (!page.innerHTML.includes('data-shell-empty="true"')) throw new Error('switching away must render the empty state');

listeners.get('receiving-account:click')({ preventDefault() {} });
if (reloads !== 1) throw new Error('switching back must reload the original page');

for (const requiredRule of [
  '.ant-modal:not(.ant-modal-confirm) .ant-modal-header',
  'border-bottom:1px solid var(--yipex-overlay-divider)',
  '.ant-modal:not(.ant-modal-confirm) .ant-modal-body{padding:var(--yipex-overlay-padding)}',
  'border-top:1px solid var(--yipex-overlay-divider)',
  '.ant-btn-default:not(:disabled):hover',
  'background:#f5f5f5!important',
  '.ant-btn-default:not(:disabled):focus',
  'background:#fff!important'
]) {
  if (!shellCss.includes(requiredRule)) throw new Error(`shell is missing Modal chrome rule: ${requiredRule}`);
}

console.log('yipex-shell-runtime: pass (navigation restore and Modal chrome)');
