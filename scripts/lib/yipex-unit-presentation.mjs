const safeText = (value) => String(value ?? '').trim();

export function resolveDisplayUnit(item = {}) {
  const explicitUnit = safeText(item.unit);
  if (explicitUnit) return explicitUnit;
  if (item.unitKey) return '';

  const suffix = safeText(item.suffix);
  if (suffix) return suffix;

  const currency = safeText(item.currency);
  if (currency) return currency;

  const prefix = safeText(item.prefix);
  if (prefix) return prefix === '¥' ? '元' : prefix;

  return item.format === 'currency' || item.format === 'amount' ? '元' : '';
}

export function formatUnitTitle(label, unit) {
  const title = safeText(label);
  const normalizedUnit = safeText(unit);
  if (!normalizedUnit || title.endsWith(`(${normalizedUnit})`)) return title;
  return `${title} (${normalizedUnit})`;
}

export function normalizeUnitItem(item = {}) {
  const unit = resolveDisplayUnit(item);
  if (!unit) {
    const displayLabel = safeText(item.label || item.key);
    return {
      ...item,
      label: displayLabel,
      displayLabel,
      unitPlacement: item.unitKey ? 'value' : 'none'
    };
  }

  const displayLabel = formatUnitTitle(item.label || item.key, unit);
  const normalized = {
    ...item,
    label: displayLabel,
    displayLabel,
    displayUnit: unit,
    unitPlacement: 'title'
  };
  delete normalized.prefix;
  delete normalized.suffix;
  return normalized;
}

export function normalizeUnitPresentationData(data = {}) {
  return {
    ...data,
    metrics: Array.isArray(data.metrics) ? data.metrics.map(normalizeUnitItem) : data.metrics,
    columns: Array.isArray(data.columns) ? data.columns.map(normalizeUnitItem) : data.columns,
    detailFields: Array.isArray(data.detailFields) ? data.detailFields.map(normalizeUnitItem) : data.detailFields,
    sections: Array.isArray(data.sections)
      ? data.sections.map((section) => ({
          ...section,
          fields: Array.isArray(section.fields) ? section.fields.map(normalizeUnitItem) : section.fields
        }))
      : data.sections,
    relatedTables: Array.isArray(data.relatedTables)
      ? data.relatedTables.map((table) => ({
          ...table,
          columns: Array.isArray(table.columns) ? table.columns.map(normalizeUnitItem) : table.columns
        }))
      : data.relatedTables
  };
}
