---
name: yipex-page-skill
description: 为 YiPex 平台根据产品经理自然语言需求生成、设计、实现和评审页面。适用于列表、表单、详情、Dashboard、工作流及自定义业务页面；按需读取内置 YiPex 设计规范，但不强制套用固定模板或页面类型。明确要求其他产品系统时不适用。
---

# YiPex 页面生成技能

这是 YiPex 的双层页面生成入口。用户只需描述业务目标、角色、信息、操作、状态和期望体验，技能会在已验证的标准组合与开放式页面之间路由，并记录设计决策、能力依据和规则来源。

## 调用方式

Skill 提供完整页面、快速页面和产品需求三种快捷入口：

| 命令 | 交付 |
| --- | --- |
| `/yipex:page <页面需求>` | 自动选择标准组合或开放组合，完成需求理解、Page Contract、页面实现、预览、轻量检查和交付记录。 |
| `/yipex:fast <页面需求>` | 优先尝试已实现 Recipe；命中时快速生成标准预览，无法覆盖时回退开放式页面生成。 |
| `/yipex:prd <产品需求>` | 按 `modules/yipex/product/prd-standard.md` 产出 `requirement.md`，不生成页面预览。 |

未写命令而直接描述 YiPex 页面需求时，执行 `/yipex:page` 的完整流程。命令后的原始需求必须完整保留；未知的 `/yipex:*` 命令报告支持的命令列表，不回退到默认流程。命令契约位于 `modules/yipex/execution/command-contract.json`，快捷模式阶段说明位于 `modules/yipex/execution/mode-workflows.md`。

当前可由 `/yipex:fast` 直接尝试的已实现配方：查询列表、带汇总指标的查询列表、列表详情浮层、分组表单、分步表单、分组详情、结果工作流和 Dashboard 概览。开放自定义页面不属于固定配方；看板全局筛选、下钻、刷新、导出，以及表单复核仍需走开放组合或能力缺口流程，不能在快速模式中伪装成标准配方。

## 核心原则

- 用户明确的功能目标优先；YiPex 规范约束视觉一致性、交互质量、响应式和可访问性，不限制业务功能。
- 默认使用 Ant Design 官方组件、API、语义和状态。具体视觉、页面方案和交互规则分别读取导演规则 01–03，页面族特有结构再读取一个命中的 Page Pattern；入口不重复维护这些规则。
- 状态列默认使用 Ant Design `Badge` 的官方语义色（`success`、`processing`、`warning`、`error`、`default`）；业务状态值应在 Page Spec 的列配置中通过 `statusTone` 映射，未声明时仅使用渲染器的通用语义兜底，不得随意生成自定义颜色。
- 二次确认默认沿用 YiPex 主操作色 `#222222`；危险或不可逆操作的确认按钮使用 Ant Design `danger` 语义色，取消按钮使用官方中性按钮色并保留规范焦点态，不得回退为默认蓝色。
- 全局辅助按钮状态必须遵循统一规则：默认白底，hover 灰底 `#F5F5F5`，active 使用 `#EDEDED`，focus 保持白底并显示规范焦点态；生成 Portal 中的 Modal/Popconfirm 时也要显式覆盖 Ant 默认蓝色样式。
- `page-spec.json` 是页面唯一可编辑源；新页面默认使用 Page Spec V2，并在实现前声明页面族、结构、层级、操作、状态、响应式和偏离。
- 先运行一次页面族与能力路由，并在后续阶段复用路由结果。`auto` 在一个已实现 Recipe 及其本次装配的可选能力均可交付时使用标准渲染器，否则回到开放组合；`standard`/`strict` 缺能力时输出 `capability-gap.md`；`open` 显式保留开放 Contract。
- Recipe 是“Skeleton/Renderer + 基础能力 + 按需求装配的可选能力”，不是封闭模板。每次只选一个主 Recipe；跨页面任务使用 Page Composition、Binding 与 Transition 串联。
- Page Pattern 是参考方案而非能力白名单。影响主要区域或关键交互的展现判断写入 `page.extensions.presentationDecisions`；偏离规范时同步写入 `contract.deviations`，说明证据、原因、Token 和影响范围。
- 三份导演规则分别管理视觉底线、页面方案选择和交互验收；其中 `MUST` 是质量底线，`DEFAULT` 是可被明确需求覆盖的默认方案，`HEURISTIC` 只提供判断证据。未命中页面族、Recipe 或现有能力时，`auto` 必须回到 `custom/open`，不得为了套用模板改写产品需求。
- 每个关键交互都落实触发条件、处理中、成功、失败与恢复路径，并与 `page.states` 对齐；不得只交付静态外观。
- 多页面需求必须提供明确入口和可追踪的相对链接或声明式转场；取消、面包屑与提交结果返回 Contract 声明的目标，刷新非入口页时保持组合关系可恢复。
- 页面生成完成并构建 `preview.html` 后，默认提供预览路径；只有用户明确要求浏览器验收、截图或自动交互测试时才打开浏览器。多页面需求仍只交付 `entryHtml` 指向的入口。
- 载体和 Page Composition 判断必须先于 Spec 编写，并复用 dispatch 返回的 `strategy.presentationIntent`。具体矩阵与冲突处理读取导演规则 02；组件外观与详情列数读取 01，不在入口复制数值。
- 默认只实现固定 Shell 的 `content` 插槽，不重绘框架；Shell 规则与导航行为只在构建预览或修改 Shell 时读取 `modules/yipex/shell/`。
- 标准渲染器不得把具体业务字段、金额等特定校验、状态文案或操作组合写死；新增字段的类型、必填/范围校验、选项、默认值、成功反馈和记录派生规则，以及操作列动作，必须从 Page Spec 的声明式配置读取。已有旧格式只能作为兼容回退，新页面不得依赖业务专用 `format`。
- 不虚构后端接口或业务事实。不确定内容写入 `metadata.assumptions`；演示数据属性保留在规格、交付说明或必要反馈中。
- 自动验收只声明实际执行过的静态检查；浏览器视觉、交互体验和业务口径未经明确验收时标记为待人工验收。

## 验收边界

- 自动验收只覆盖本地静态能力：`page-spec.json` 结构、Contract 与组件/状态/交互/规则引用的一致性、派生文件存在、`#yipex-page` 根节点和页面 JavaScript 语法。
- 默认不启动浏览器，不生成验收截图，不做像素比较、响应式视觉检查或自动点击流程测试。
- 视觉效果、交互体验、业务口径和跨设备表现由人工验收；在 `review.md` 中标记为“待人工验收”，不得写成自动通过。
- 只有用户明确要求浏览器验收、截图或自动交互测试时，才执行对应检查。

## 渐进式加载

1. 读取 `modules/yipex/DOMAIN.md` 和轻量清单 `modules/yipex/rules-index.json`，运行一次 dispatch；dispatch 返回能力策略和规则上下文，不再重复运行规则路由。显式 `/yipex:prd` 改走产品模板工作流，显式 `/yipex:fast` 使用 `auto` 策略。
2. 按 dispatch 返回的 `contextFiles` 和 `referenceFiles` 读取资源；页面模式每次固定加载轻量 Core Context 与 `design-system/director-rules/` 中的 01–03，再按需加载 `design-system/page-patterns/` 中一个命中的 Pattern。`custom` 不加载 Pattern。
3. 在同一个 Page Spec 阶段完成展现判断、Contract、组件树、数据、状态和交互；展现规则已经归入导演规则 02，不再读取独立 Presentation Intent 说明。
4. 只有新增 Recipe/Capability、处理能力缺口或修改渲染器时，才读取 `execution/capability-model/` 的内部文档与注册表。
5. 页面模式根据策略生成标准或开放 Page Spec，必要时校验 Page Composition；构建预览并执行轻量静态检查。`page-design.md` 仅在需要审计追溯时显式生成，既有 V1 页面保持兼容，除非明确迁移，否则不改写为 V2。

经载体语义判定确认的多页面需求优先采用组合快速路径：规则与能力只路由一次，先生成 `page-composition.json` 和所有子页面 `page-spec.json`，再使用 `scripts/build-yipex-composition.mjs` 并行派生、构建和检查。不得仅因需求同时出现“列表”和“表单”，或使用“流程”“进入”“返回”等词就启动多页面路径。除非新增 Recipe、Capability、Shell 或共享渲染器，否则不重复执行能力模型回归。

## 交付目录

每个需求使用 `changes/YYYYMMDD-功能名称/`，常见产物为 `proposal.md`、`page-spec.json`、`preview.html`、`review.md`。需要设计审计时可额外生成 `page-design.md`，它不是编辑源。

## 执行入口

```bash
node scripts/dispatch-yipex-command.mjs --request "/yipex:page <页面需求>"
node scripts/dispatch-yipex-command.mjs --request "<页面需求>" --mode standard
node scripts/dispatch-yipex-command.mjs --request "<直接描述的页面需求>"
node scripts/scaffold-yipex-page.mjs changes/{change-id} --request "<原始需求>" --mode auto
node scripts/scaffold-yipex-page.mjs changes/{change-id} --request "<原始需求>" --page-family dashboard
node scripts/derive-yipex-page-design.mjs changes/{change-id}/page-spec.json
node scripts/build-yipex-page.mjs changes/{change-id}/page-spec.json
node scripts/build-yipex-page.mjs changes/{change-id}/page-spec.json --with-design-record
node scripts/validate-yipex-page-spec.mjs changes/{change-id}/page-spec.json
node scripts/check-yipex-page.mjs changes/{change-id}
node scripts/check-yipex-page.mjs changes/{change-id} --with-design-record
node scripts/build-yipex-composition.mjs changes/{composition-id}
node scripts/test-yipex-capability-model.mjs
node scripts/test-yipex-capability-policy.mjs
```

页面实现默认接入目标项目已有的 Ant Design 依赖；skill 不携带本地组件库。脚本只负责基础能力检查，完成后直接交付预览和人工验收清单。
