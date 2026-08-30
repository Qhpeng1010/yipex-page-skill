# YiPex 后台 2.0 Design System（历史归档）

> 本文件是 V0.4 以前的历史规则快照，仅用于解释旧 Page Spec 的 `ruleRefs`。新页面生成不读取本文件，设计师也不维护本文件；当前规则以 `design-system/director-rules/` 下 01–03 为准。

> Version: V0.4\
> Source: Figma「Yipex后台2.0」\
> Scope: YiPex 后台业务页面

## 1. Design System 定位

本规范用于约束 YiPex 后台 2.0 的页面视觉、组件与业务页面生成。当前版本包含查询列表、Dashboard、表单、详情和结果页面族规则，并可在此基础上继续扩展。

既有 Page Pattern 是参考方案，不是能力白名单。用户的功能目标决定页面需要实现什么；本规范约束页面如何保持 YiPex 的视觉一致性、可用性、响应式和可访问性。

`director-rules/` 是每次页面生成读取的上层决策入口，分别管理视觉底线、页面方案选择和交互验收。本文件、Foundations、Components 与 Page Pattern 保留为按需读取的详细设计知识，不改变 Page Spec、Contract、Capability Model、Shell 或模板接口。

## 2. 上层设计价值观

YiPex 以 [Ant Design 设计价值观](https://ant.design/docs/spec/values-cn) 作为页面生成和规范演进的上层判断依据。价值观用于回答“为什么这样设计”；具体视觉数值、组件用法和页面结构仍分别由 Foundations、Components 与 Page Pattern 决定，不在本节重复定义。

### 2.1 自然

- **感知自然**：布局、层级、文案和反馈应符合用户已有认知，优先使用熟悉的后台信息结构和 Ant Design 官方组件，降低识别与学习成本。
- **行为自然**：先理解角色、任务目标、业务对象和上下文，再组织功能与操作。自然语言中的展示意图必须由业务证据驱动；帮助用户决策、减少无效步骤，而不是为了视觉变化自行改变组件形态。

### 2.2 确定性

- **设计者确定**：使用精简且可追溯的 Token、组件契约、Page Pattern 和 Page Contract。相同语义应产生一致的组件、状态和交互，避免随机数值、临时皮肤与单页特例。
- **保持克制**：聚焦最有价值的业务功能，以尽可能少的设计元素表达层级。标准组件优先保留官方实现，不因“更有设计感”而增加无业务意义的 Card、阴影、颜色或装饰。
- **模块化与复用**：优先复用官方组件、已有 Pattern 和可组合区域。需要偏离时通过 `presentationDecisions` 与 `contract.deviations` 显式记录，不把偏离伪装成默认规则。
- **用户确定**：跨页面、页面族和状态保持一致的外观与交互，使用户可以依靠既有经验完成任务。

### 2.3 意义感

- 页面围绕用户的工作使命、主目标和关键子目标组织，视觉层级服务于任务完成，而不是成为页面目的。
- 非必要不增加页面级标题、页面级状态和副描述。Shell、面包屑或首个业务模块已经能说明页面位置与任务时，直接展示业务内容；只有缺少这些信息会妨碍理解、决策或操作时才增加。该原则不省略必要的模块标题、字段状态和业务反馈。
- 每个关键操作都应提供及时、明确、与结果相称的反馈；Loading、Empty、Error、Permission denied 和成功状态必须表达用户下一步可以做什么。
- 如无必要，勿增实体。卡片化、弹层、强调色和动效只有在帮助理解、比较、决策或反馈时才有意义。

### 2.4 生长性

- 设计系统应允许新业务对象、页面族和交互模式在现有 Token、Contract 与组合机制上扩展，而不是依赖复制页面或持续增加局部覆盖。
- Page Pattern 是可演进的参考方案，不是能力白名单；高频且稳定的 deviation 可以作为规范升级信号，但在正式纳入前仍保持可追溯。
- 新能力应兼顾当前任务与后续维护，优先形成可复用的规则、组件组合或 Schema 字段，避免只解决单个页面截图。

### 2.5 价值观的使用顺序

1. 用“自然”和“意义感”判断页面是否符合用户任务、是否真正帮助理解与决策。
2. 用“确定性”约束实现，使结果遵循已有 Token、组件、Pattern 和 Contract；它是默认执行基线。
3. 用“生长性”评估新方案是否值得沉淀为可复用规则；生长性不构成绕过现有规范或省略 deviation 的理由。

## 3. 文件结构与职责

- `director-rules/01-visual-constitution.md`：视觉气质、全部 Token、组件外观与开放演进原则。
- `director-rules/02-template-application-rules.md`：页面家族、标准与开放组合、载体及新能力沉淀。
- `director-rules/03-interaction-acceptance-rules.md`：全局交互质量底线与 MVP 验收证据。
- `DESIGN.md`：入口、Ant Design 上层价值观、规则优先级和生成约束。
- `03-query-list-patterns.md`：查询、重置、分页、列表操作和详情联动模板。
- `04-dashboard-patterns.md`：Dashboard 的筛选、指标、分析、下钻和状态模板。
- `05-form-patterns.md`：普通、分组与分步表单的布局、校验、提交和离开模板。
- `06-detail-patterns.md`：独立详情、分组详情及关联明细的查看与操作模板。
- `07-result-patterns.md`：成功、失败、处理中和重试结果模板。

新增规则只在其所属层定义一次。视觉数值只在 Foundations 定义；导演规则负责决策，组件和 Page Pattern 只补充对应层的详细知识。

## 4. 规范优先级

用户的明确功能目标优先。用户明确指定视觉或交互要求时，在不破坏法律、安全、权限、信息真实性、可访问性和核心可用性的前提下执行，并记录 deviation；冲突按以下顺序处理：

1. 法律、安全、权限、信息真实性、可访问性及导演规则中的 `MUST`。
2. 用户明确的功能目标与表现要求。
3. 导演规则中的 `DEFAULT`、01 视觉 Token 与组件默认契约。
4. `rules-index.json` 路由命中的单个页面族 Pattern。
5. 导演规则中的 `HEURISTIC` 与组件库默认行为。

用户明确要求偏离现有视觉规范时可以执行，但必须写入 `contract.deviations` 说明原因和影响范围；需要审计时再派生页面设计记录。未明确要求偏离时，不得自行覆盖高优先级规则。

全局常规控件使用 Foundations `Middle Control`；任何非默认控件尺寸都必须在 `contract.deviations` 中记录 Token、原因和影响范围。

## 5. AI Generation Contract

- 必须优先复用已有 Token。
- 不得无理由新增颜色、字号、圆角或阴影。
- 标准控件优先使用 Ant Design 官方组件和 API，不重复实现已有组件能力；语义、状态和组合优先使用官方能力。Modal 与 Drawer 直接遵循 `director-rules/01-visual-constitution.md`，不在页面 Pattern 中重复其外观细节。
- Card、Table、Modal、Drawer 和选择形态由 `execution/presentation-intent.md` 根据自然语言与业务结构决定；明确要求或高置信度推断必须写入 `page.extensions.presentationDecisions`，证据不足时使用 Page Pattern 默认。
- 核心按钮默认使用主操作色，不使用品牌绿替代。
- Ant Design 组件的 hover、active、selected、focus 状态默认使用 YiPex Foundations 中的主题色与状态色；不自动采用 Ant Design 蓝色。颜色读取和映射以后续色彩规范为准，除非页面在 `contract.deviations` 中明确记录。
- 品牌绿与辅助绿只用于规定的品牌识别、业务状态和辅助场景。
- 全局文字使用 Foundations `Page Title`、`Module Title`、`Body` 与 `Auxiliary` 四档样式，默认字间距为 `0`；中文使用 PingFang SC，英文与数字优先使用 Roboto，所有页面与 Ant Design 组件使用同一字体链。
- 查询列表、Dashboard、表单、详情和结果场景分别读取 `03` 至 `07` 的单个页面类型 Pattern；未命中时使用 `custom` 并在 Page Contract 中声明结构和交互。
- 页面类型内部的普通、分组、分步、含汇总或含明细等差异作为 Pattern 变体处理，不新增并列页面族。
- Shell 的结构、导航目录和框架交互只由 `modules/yipex/shell/` 维护；页面 Pattern 只声明业务内容如何挂载到 Shell 内容插槽。

## 6. Accessibility & Interaction

- 主要操作控件必须保持足够的触控面积。
- Focus 状态必须有明确反馈。
- Disabled 状态不能只依赖颜色区分。
- Error 状态不能只依赖颜色，必须同时提供文字或图标信息。
- 每个页面 Pattern 必须按“触发事件 → 前置条件 → 处理中状态 → 成功结果 → 失败反馈与恢复”定义关键交互，不得只描述静态布局。
- Page Contract 中的操作必须映射到 `page.interactions`；Loading、Empty、Error、Permission Denied 和 Success 等状态必须映射到 `page.states`。
- 异步操作开始后必须阻止重复提交；完成后应恢复可操作状态，并用与影响范围一致的局部或页面级反馈说明结果。
- 危险或不可逆操作必须在执行前确认，并在执行后说明结果；失败反馈必须提供重试、返回或修改输入等可执行恢复路径。

## 7. Restrictions

### Forbidden

- 随意新增品牌颜色。
- 随意改变主操作按钮颜色。
- 使用与 YiPex 明显冲突的视觉风格。
- 无业务需求时大量使用渐变、强玻璃效果或装饰性动效。

### Allowed

- 根据业务增加表单字段和业务组件。
- 根据屏幕尺寸进行响应式适配。
- 根据业务状态使用已有品牌绿或辅助绿 Token。
- 允许组合 Ant Design 组件并使用页面布局样式；Modal 与 Drawer 遵循 `director-rules/01-visual-constitution.md`。明确要求或 `presentation-intent.md` 的高置信度推断产生非标准外观时，必须同时记录 `presentationDecisions` 与 `contract.deviations`。
- 任何页面都可以基于明确业务需求调整控件高度，但必须记录完整的 `contract.deviations`，不得只在 Pattern 或 CSS 中局部覆盖。
