export function deriveStandardBreadcrumb(shell = {}, pageName = '', fallbackHref = '') {
  const activeNavigation = (shell.navigation || []).find((item) => item.active);
  const items = [];
  if (activeNavigation?.label && activeNavigation.label !== pageName) {
    items.push({ title: activeNavigation.label, href: fallbackHref || `#${activeNavigation.id}` });
  }
  if (pageName) items.push({ title: pageName });
  return items;
}

export const standardBreadcrumbCss = '.standard-page-breadcrumb{margin:0 0 16px 8px}';
