# YiPex 页面生成技能

这是一个用于根据自然语言需求生成、设计、实现和评审 YiPex 业务页面的规则工程。它把页面需求先路由到合适的页面族和交付策略，再依据内置设计规范、能力模型和固定渲染器生成可复查的 Page Spec 与预览页面。

本仓库服务于 YiPex 页面生成场景，支持标准页面组合，也支持在标准能力无法覆盖时保留开放式自定义页面结构。

## 调用模式

未指定快捷命令时，直接描述 YiPex 页面需求即可执行完整的页面生成工作流。请求开头也可以使用：

| 命令 | 目标 |
| --- | --- |
| `/yipex:page` | 完成需求理解、页面族与能力路由、Page Spec、页面实现、预览、轻量检查和交付记录。 |
| `/yipex:fast` | 优先尝试已实现 Recipe；命中时快速生成标准预览，无法覆盖时回退到开放式页面生成。 |
| `/yipex:prd` | 按 YiPex 产品需求模板产出 `requirement.md`，只生成需求文档，不生成页面预览。 |

统一入口会保留原始需求，并返回当前请求的模式、页面族、资源、能力和交付阶段：

```bash
node scripts/dispatch-yipex-command.mjs --request "/yipex:page 账户查询页面"
```

显式模式的通用执行方式：

```bash
node scripts/scaffold-yipex-page.mjs changes/{change-id} --request "<原始需求>" --mode auto
node scripts/build-yipex-page.mjs changes/{change-id}/page-spec.json
node scripts/check-yipex-page.mjs changes/{change-id}
```

命令契约位于 [`modules/yipex/execution/command-contract.json`](modules/yipex/execution/command-contract.json)，产品需求模板位于 [`modules/yipex/product/prd-standard.md`](modules/yipex/product/prd-standard.md)。未知的 `/yipex:*` 命令会报告支持的命令，不会悄悄回退到默认流程。

## 先从哪里看

如果你是产品、设计或研发同学，建议按以下顺序了解本仓库：

1. [`SKILL.md`](SKILL.md)：技能的触发范围、生成边界、交付流程和验收边界。
2. [`modules/yipex/DOMAIN.md`](modules/yipex/DOMAIN.md)：YiPex 业务域、路由边界和页面生成原则。
3. [导演规则](modules/yipex/design-system/director-rules/01-visual-constitution.md)：视觉、页面模板和交互验收的设计决策来源。
4. [能力策略](modules/yipex/execution/generation-policy.json)：确认当前页面族和组件能力的开放状态。
5. [能力模型](modules/yipex/execution/capability-model/capability-model.md)：了解 Recipe、区域、能力、绑定和多页面组合规则。

## 目录说明

```text
yipex-page-skill/
├── SKILL.md                         技能入口、路由范围和交付规则
├── README.md                        本说明
├── agents/                          Codex 界面的技能元数据
├── references/                      兼容规则和历史参考资料
├── modules/
│   └── yipex/                       YiPex 页面生成业务域
│       ├── design-system/           导演规则和页面族 Pattern
│       ├── execution/               命令契约、能力模型、Page Spec 和策略
│       ├── product/                 产品需求文档模板
│       ├── shell/                   固定后台 Shell、品牌资产和预览运行时
│       ├── DOMAIN.md                 业务域路由和生成边界
│       ├── frontend.md               前端实现约定
│       └── rules-index.json          规则资源索引
├── scripts/                         路由、脚手架、构建、校验和回归测试工具
├── changes/                         页面需求、规格和预览交付目录
├── basic-page-types.html             六类基础页面的快速预览入口
└── preview-index.html                已生成页面的完整预览入口
```

`SKILL.md` 负责把请求送入 YiPex 页面生成流程。视觉、模板、交互和页面族规则由 `modules/yipex/design-system/` 维护；能力策略、Page Spec 契约、固定 Shell 和渲染器分别位于 `execution/` 与 `shell/`。`page-spec.json` 是单页的唯一编辑源，`preview.html` 是默认派生产物。

## 当前能力

页面是否可以按标准方式生成，以 [能力策略](modules/yipex/execution/generation-policy.json)、已实现 Recipe 和能力模型为准。未命中标准 Recipe 时，开放模式仍可保留合理的自定义页面结构；标准或严格模式缺少能力时必须输出能力缺口，不能用相似模板替代真实需求。

| 页面族 | 当前状态 | 已覆盖能力 |
| --- | --- | --- |
| 查询列表 | 可用 | 查询与重置、分页、列配置、状态和金额列、列表操作、详情抽屉或关联页面。 |
| 表单 | 可用 | 普通分组表单、分步表单、字段校验、固定操作区和提交结果。 |
| 详情 | 可用 | 分组信息、摘要指标、状态展示和嵌入式表格。 |
| 结果 / 工作流 | 可用 | 成功、失败、处理中、重试和返回目标页面等结果状态。 |
| Dashboard | 可用 | 指标、趋势、分布和概览型数据展示。复杂筛选、下钻、导出等能力按需求单独路由。 |
| 自定义页面 | 开放组合 | 在标准 Page Pattern 无法表达时声明自定义布局、组件和交互，并记录设计决策与偏离。 |

当前已实现的稳定 Recipe 包括查询列表、带汇总指标的查询列表、列表详情浮层、分组表单、分步表单、分组详情、结果工作流和 Dashboard 概览。跨页面需求可使用 Page Composition、Binding 和 Transition 串联，并由组合构建器生成统一入口。

## 页面如何生成

YiPex 使用 Page Spec 驱动的固定渲染链路。AI 负责理解需求并填写声明式规格，固定渲染器负责生成页面预览，避免同一类需求被手工实现成不一致的结构和交互。

```text
业务需求
  -> 判断是否属于 YiPex，并路由到页面族、载体和生成策略
  -> 读取 Core Context、导演规则、Page Pattern 与当前能力
  -> 创建 Change 并填写 page-spec.json，或先填写 page-composition.json
  -> 固定渲染器生成 preview.html
  -> 运行 Page Spec、Contract、派生产物和脚本语法检查
  -> 业务与设计人员人工验收视觉、交互和业务口径
  -> 交付
```

`auto` 会在已实现 Recipe 和本次装配能力可交付时使用标准渲染器，否则回到 `custom/open`；`standard` 或 `strict` 在能力不足时输出能力缺口。页面生成默认只实现固定 Shell 的 `content` 插槽，不重复绘制后台框架。

## 导演规则与单页需求

导演规则管理“同类页面长期应遵守什么”，例如视觉密度、查询区与结果区的组合方式、危险操作确认、状态语义和交互验收标准。

单页需求管理“这一页展示什么”，例如业务对象、筛选条件、列表字段、状态文案、默认值、操作入口和页面之间的返回关系。

| 目标 | 唯一维护位置 | 不应直接修改 |
| --- | --- | --- |
| 全局视觉、组件气质和页面密度 | `design-system/director-rules/01-visual-constitution.md` | 单页预览与固定生成样式 |
| 页面家族、模板选择和页面组合 | `design-system/director-rules/02-template-application-rules.md` | 已生成的页面文件 |
| 流程、状态、风险确认和验收 | `design-system/director-rules/03-interaction-acceptance-rules.md` | 预览 HTML、CSS 和 JavaScript |
| 单页字段、文案、数据和默认值 | 当前 Change 的 `page-spec.json` | 跨页面导演规则 |
| 页面能力是否开放 | `execution/generation-policy.json`、`execution/capability-model/` | 仅修改 Markdown 规则不能越过工程能力边界 |
| 导航、侧栏、页脚和预览运行时 | `shell/` 对应固定实现 | 单页 Page Spec |

路由和渐进式加载按规则索引执行：先读取 `DOMAIN.md` 与 `rules-index.json`，再按页面族加载对应的 Core Context、三份导演规则和一个 Page Pattern；只有命中组合页面、能力缺口或渲染器变更时，才继续读取能力模型和相关内部文档。规则来源会写入 `page-spec.json` 的 `metadata.ruleRefs`，展现判断会写入 `page.extensions.presentationDecisions`。

## 如何提出一个新页面

用清晰的业务语言描述需求即可，无需指定代码或组件。建议包含以下信息：

```text
所属平台：YiPex
使用者：运营人员
主要任务：查询、核对和处理业务记录
查询条件：名称、编号、状态、时间范围
列表字段：编号、名称、金额、状态、更新时间
允许操作：查看详情、新建、编辑、重试
风险要求：危险操作前须明确对象、影响和操作后状态
```

如果希望使用抽屉、弹窗、全页表单或步骤流程，也应说明字段数量、是否需要分组、上传、复核、联动和前后依赖。技能会根据页面族、展现判断和能力策略选择合适的 Recipe 或开放组合。

## Change 交付目录

每个页面需求在本地使用独立的 `changes/YYYYMMDD-功能名称/` 目录。常见内容如下：

```text
changes/YYYYMMDD-功能名称/
├── proposal.md               需求理解与范围
├── page-design.md            页面设计与规则选择（可选）
├── page-spec.json            唯一可编辑的页面规格
├── page-composition.json     多页面组合规格（组合需求使用）
├── preview.html              可直接打开的评审预览
└── review.md                 静态检查与人工验收记录
```

`page-spec.json` 是单页面的唯一编辑源；`page-composition.json` 是多页面需求的组合入口。`preview.html`、业务 CSS、Shell 运行时和派生设计记录由脚本生成，不应手工修改。需要设计审计时可生成 `page-design.md`，它不是编辑源。

## 生成与校验

创建并构建 Page Spec：

```bash
node scripts/scaffold-yipex-page.mjs changes/{change-id} --request "<原始需求>" --mode auto
node scripts/build-yipex-page.mjs changes/{change-id}/page-spec.json
node scripts/validate-yipex-page-spec.mjs changes/{change-id}/page-spec.json
node scripts/check-yipex-page.mjs changes/{change-id}
```

生成设计记录并执行带设计记录的检查：

```bash
node scripts/derive-yipex-page-design.mjs changes/{change-id}/page-spec.json
node scripts/check-yipex-page.mjs changes/{change-id} --with-design-record
```

创建、构建并校验组合式页面：

```bash
node scripts/build-yipex-composition.mjs changes/{composition-id}
node scripts/validate-yipex-page-composition.mjs changes/{composition-id}/page-composition.json
```

运行能力、命令和 Shell 回归检查：

```bash
node scripts/test-yipex-capability-model.mjs
node scripts/test-yipex-capability-policy.mjs
node scripts/test-yipex-command-routing.mjs
node scripts/test-yipex-shell-runtime.mjs
```

生成后的 `preview.html` 可直接在浏览器中打开，也可以在项目根目录启动静态服务器：

```bash
python3 -m http.server 8080
```

预览用于设计和业务评审，不等同于正式生产前端工程。自动检查只覆盖本地静态能力；视觉、交互、业务口径和跨设备表现仍需人工确认。

## 常见问题

**为什么页面没有按标准方式生成？**

通常是需求未命中现有 Recipe，或标准模式所需能力尚未开放。开放模式会保留合理的自定义页面结构；标准或严格模式则应报告能力缺口。

**为什么改了规则，预览没有变化？**

规则文件定义设计决策，固定渲染器决定页面如何落地。若变更涉及新的组件能力、页面结构或渲染行为，还需要同步调整能力策略、Page Spec 契约、渲染器和回归测试。

**预览可以直接交付上线吗？**

不可以。预览用于产品、设计和业务验收；正式上线仍需按研发流程完成接口、权限、真实数据、异常处理和工程化验证。
