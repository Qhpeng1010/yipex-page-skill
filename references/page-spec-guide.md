# YiPex Page Spec 基础说明

新页面默认使用 Page Spec V2。`page-spec.json` 由元数据、Page Contract 和页面实现三层组成：

```text
metadata  →  需求、假设与实际规则来源
contract  →  结构、层级、操作、状态、响应式与偏离
page      →  组件树、数据、状态与交互实现
```

```json
{
  "schemaVersion": 2,
  "metadata": {
    "changeId": "20260827-order-dashboard",
    "pageName": "订单分析",
    "pageType": "dashboard",
    "componentLibrary": { "name": "antd", "source": "official" },
    "assumptions": [],
    "ruleRefs": [
      "design-system/director-rules/01-visual-constitution.md",
      "design-system/director-rules/02-template-application-rules.md",
      "design-system/director-rules/03-interaction-acceptance-rules.md",
      "design-system/page-patterns/dashboard.md"
    ]
  },
  "contract": {
    "pageFamily": "dashboard",
    "shell": "yipex-default",
    "density": "compact",
    "regions": [
      { "id": "dashboard-main", "role": "main-content", "purpose": "展示经营分析与异常任务" }
    ],
    "hierarchy": {
      "primary": "核心经营指标与异常任务",
      "secondary": ["趋势和状态分布"]
    },
    "operations": {
      "primary": null,
      "secondary": []
    },
    "stateCoverage": ["loading", "empty", "error", "permission-denied"],
    "responsive": {
      "desktop": "分析区使用双栏",
      "narrow": "改为单栏并保留表格横向滚动"
    },
    "deviations": []
  },
  "page": {
    "shell": { "id": "yipex-default" },
    "root": {
      "id": "page-root",
      "type": "page",
      "children": [
        { "id": "dashboard-main", "type": "dashboard-main", "children": [] }
      ]
    },
    "data": {},
    "states": {
      "loading": false,
      "empty": false,
      "error": false,
      "permission-denied": false
    },
    "interactions": [],
    "extensions": {}
  }
}
```

组件至少包含唯一 `id` 和描述性的 `type`。`props` 放展示属性，`children` 放嵌套结构，`events` 放交互声明，`state` 放组件局部状态。未被基础渲染器识别的组件仍可通过 `extensions` 扩展。

`contract.regions`、`contract.operations` 和 `contract.stateCoverage` 必须能映射到 `page` 中的实际实现。常规控件默认使用 Ant Design `middle` / `32px`；任何非默认控件尺寸都必须在 `contract.deviations` 中记录其规则、原因和范围。`metadata.ruleRefs` 记录实际采用的规则文件，`metadata.assumptions` 记录需求中无法确认的业务事实。

`page-design.md` 可通过 `--with-design-record` 从 V2 Spec 派生，用于需要审计时的规则追溯；它不单独编辑，也不阻塞默认页面交付。完整字段说明见 `modules/yipex/execution/page-contract-v2.md`；既有 V1 页面继续兼容，不强制迁移。
