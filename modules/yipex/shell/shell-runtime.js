(() => {
  const shell = document.querySelector('[data-shell="yipex-default"]');
  if (!shell) return;
  const page = shell.querySelector('#yipex-page');
  const navItems = [...shell.querySelectorAll('.yipex-shell-nav-item')];
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const initialKey = navItems.find((item) => item.classList.contains('active') || item.getAttribute('aria-current') === 'page')?.dataset.menuKey || '';
  const setActive = (key) => navItems.forEach((item) => {
    const active = item.dataset.menuKey === key;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  const renderEmptyState = (item) => {
    if (!page || !item) return;
    page.dataset.shellEmpty = 'true';
    const label = item.getAttribute('title') || item.textContent.trim();
    page.innerHTML = '<div class="yipex-shell-empty" data-shell-empty="true" role="status" aria-live="polite"><h1 class="yipex-shell-empty-title">' + escapeHtml(label) + '</h1><div class="yipex-shell-empty-content" data-shell-empty-mount></div></div>';
    const mount = () => {
      const Empty = window.antd?.Empty;
      const target = page.querySelector('[data-shell-empty-mount]');
      if (!Empty || !target || !window.React || !window.ReactDOM) { window.setTimeout(mount, 16); return; }
      const element = window.React.createElement(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: '暂无数据' });
      if (window.ReactDOM.createRoot) window.ReactDOM.createRoot(target).render(element);
      else if (window.ReactDOM.render) window.ReactDOM.render(element, target);
    };
    mount();
  };
  shell.querySelectorAll('[data-shell-action="toggle-sidebar"]').forEach((button) => button.addEventListener('click', () => {
    const collapsed = shell.classList.toggle('is-collapsed');
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? '展开导航' : '收起导航');
    button.setAttribute('title', collapsed ? '展开导航' : '收起导航');
  }));
  navItems.forEach((item) => item.addEventListener('click', (event) => {
    const key = item.dataset.menuKey || '';
    setActive(key);
    if (key === initialKey && page?.dataset.shellEmpty) {
      event.preventDefault();
      window.history.replaceState(null, '', '#' + encodeURIComponent(key));
      window.location.reload();
      return;
    }
    if (key && key !== initialKey) {
      event.preventDefault();
      window.history.replaceState(null, '', '#' + encodeURIComponent(key));
      renderEmptyState(item);
    }
  }));
  shell.querySelectorAll('[data-shell-action]').forEach((button) => {
    if (button.dataset.shellAction === 'toggle-sidebar') return;
    button.addEventListener('click', () => button.dispatchEvent(new CustomEvent('yipex-shell-action', { bubbles: true, detail: { action: button.dataset.shellAction } })));
  });
  const renderIcons = () => {
    const iconLibrary = window.icons;
    if (!iconLibrary || !window.React || !window.ReactDOM) { window.setTimeout(renderIcons, 16); return; }
    shell.querySelectorAll('[data-antd-icon]').forEach((node) => {
      if (node.dataset.iconMounted) return;
      const Icon = iconLibrary[node.dataset.antdIcon];
      if (!Icon) return;
      const element = window.React.createElement(Icon);
      if (window.ReactDOM.createRoot) window.ReactDOM.createRoot(node).render(element);
      else if (window.ReactDOM.render) window.ReactDOM.render(element, node);
      node.dataset.iconMounted = 'true';
    });
  };
  renderIcons();
  document.addEventListener('click', (event) => {
    const link = event.target.closest('.ant-breadcrumb a, .standard-page-breadcrumb a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) return;
    event.preventDefault();
    if (window.history.length > 1) window.history.back();
    else window.location.assign(href);
  });
})();
