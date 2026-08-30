import { renderStandardQueryTable } from '../renderers/yipex-standard-query-table.mjs';
import { renderStandardGroupedForm } from '../renderers/yipex-standard-grouped-form.mjs';
import { renderStandardSteppedForm } from '../renderers/yipex-standard-stepped-form.mjs';
import { renderStandardGroupedDetail } from '../renderers/yipex-standard-grouped-detail.mjs';
import { renderStandardResultWorkflow } from '../renderers/yipex-standard-result-workflow.mjs';
import { renderStandardDashboardOverview } from '../renderers/yipex-standard-dashboard-overview.mjs';
import {
  queryTableScaffold,
  groupedFormScaffold,
  steppedFormScaffold,
  groupedDetailScaffold,
  resultWorkflowScaffold,
  dashboardOverviewScaffold
} from './yipex-standard-scaffolds.mjs';

const definitions = [
  { id: 'yipex-standard-query-table-v1', pageFamily: 'list', render: renderStandardQueryTable, createScaffold: queryTableScaffold },
  { id: 'yipex-standard-dashboard-overview-v1', pageFamily: 'dashboard', render: renderStandardDashboardOverview, createScaffold: dashboardOverviewScaffold },
  { id: 'yipex-standard-grouped-form-v1', pageFamily: 'form', render: renderStandardGroupedForm, createScaffold: groupedFormScaffold },
  { id: 'yipex-standard-stepped-form-v1', pageFamily: 'form', render: renderStandardSteppedForm, createScaffold: steppedFormScaffold },
  { id: 'yipex-standard-grouped-detail-v1', pageFamily: 'detail', render: renderStandardGroupedDetail, createScaffold: groupedDetailScaffold },
  { id: 'yipex-standard-result-workflow-v1', pageFamily: 'result', render: renderStandardResultWorkflow, createScaffold: resultWorkflowScaffold }
];

const registry = new Map(definitions.map((definition) => [definition.id, Object.freeze(definition)]));

function getRendererDefinition(rendererId) {
  return rendererId ? registry.get(rendererId) || null : null;
}

function createRendererScaffold(rendererId, context = {}) {
  const definition = getRendererDefinition(rendererId);
  if (!definition) throw new Error(`Unknown YiPex standard renderer: ${rendererId}`);
  const scaffold = definition.createScaffold(context);
  return structuredClone(scaffold);
}

function renderRegisteredPage(rendererId, pageSpec, context) {
  const definition = getRendererDefinition(rendererId);
  return definition ? definition.render(pageSpec, context) : null;
}

function listRendererDefinitions() {
  return [...definitions];
}

export { createRendererScaffold, getRendererDefinition, listRendererDefinitions, renderRegisteredPage };
