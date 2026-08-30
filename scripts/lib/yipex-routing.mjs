function normalized(value) {
  return String(value || '').toLowerCase();
}

export function matchingSignals(source, signals = []) {
  const text = normalized(source);
  return signals.filter((signal) => text.includes(normalized(signal)));
}

export function resolvePageFamily(index, source, requestedFamily) {
  const families = index.pageFamilies || {};
  if (requestedFamily) {
    return {
      pageFamily: requestedFamily,
      route: families[requestedFamily] || families.custom || { files: [] },
      source: families[requestedFamily] ? 'explicit' : 'explicit-custom'
    };
  }

  const matches = Object.entries(families)
    .filter(([name]) => name !== 'custom')
    .map(([name, config]) => {
      const signals = matchingSignals(source, config.signals || []);
      const specificity = Math.max(0, ...signals.map((signal) => signal.length));
      return { name, config, specificity };
    })
    .filter((candidate) => candidate.specificity > 0)
    .sort((left, right) => right.specificity - left.specificity || (right.config.priority || 0) - (left.config.priority || 0));

  if (matches.length) {
    return { pageFamily: matches[0].name, route: matches[0].config, source: 'signals' };
  }
  return { pageFamily: 'custom', route: families.custom || { files: [] }, source: 'fallback' };
}
