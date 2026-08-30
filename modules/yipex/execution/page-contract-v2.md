# YiPex Page Contract v2

Page Contract 是 `page-spec.json` V2 中的设计决策层。它先声明本次页面采用的结构、层级、操作、状态、响应式和规范偏离，再由 `page.root`、`page.states` 与 `page.interactions` 描述具体实现。

能力策略记录在 `metadata.generation` 或 `page.extensions.generation`：标准页面必须包含已实现 Recipe 和能力集合；开放页面可省略 Recipe，但仍需遵守本契约。能力模型详见 `execution/capability-model/capability-model.md`。

## 1. 职责边界

```text
页面族 Pattern  →  同类页面的参考骨架
Page Contract   →  本次页面确认采用的设计方案
Page Spec       →  组件、数据、状态和交互的实现描述
```

当需求按导演规则 02 判断为多页面任务时，除各页面 Page Spec 外必须提供 Page Composition。Composition 声明入口页、页面间 transition/binding 和返回策略；交付包含一个入口 HTML，所有关联页面使用可靠的相对链接或声明式转场串联。

Contract 不复制组件树，也不限制业务功能。它负责让自由组合的页面在实现前形成可追踪的设计承诺。

在编写 Contract 前先按导演规则 02 判断主要区域和关键交互的展示模式。判断结果写入 `page.extensions.presentationDecisions`，并与 Contract 的 regions、responsive、deviations 保持一致。

## 2. Contract 字段

### `pageFamily`

页面所属族。当前内置路由支持 `dashboard`、`list`、`form`、`detail`、`result` 和 `custom`。没有合适 Pattern 时使用 `custom`，并完整声明本页结构。

### `shell`

页面使用的框架。后台业务页面默认使用 `yipex-default`；其他框架必须通过偏离项说明。

### `density`

页面信息密度：`comfortable`、`standard` 或 `compact`。它描述页面整体密度，不直接覆盖导演规则 01 的 Token。

### `regions`

页面区域及其顺序。每项包含：

- `id`：稳定且唯一的区域标识，应能映射到 `page.root` 中的组件 ID。
- `role`：区域在页面中的结构角色。
- `purpose`：该区域服务的用户目标。

### `hierarchy`

声明页面的信息与视觉优先级：

- `primary`：本页第一优先级信息或任务。
- `secondary`：需要展示但不能争夺第一视觉的信息。

### `operations`

声明本页操作层级：

- `primary`：主操作；没有主操作时显式填写 `null`。
- `secondary`：次要操作数组。

每个操作包含稳定 `id`、显示 `label`、`placement` 和预期 `outcome`。`id` 对应 `page.root` 中的操作组件 ID；该组件至少有一个事件映射到 `page.interactions`。

### `stateCoverage`

声明本页需要覆盖的状态。可使用 `loading`、`empty`、`error`、`permission-denied`、`success`，也可以增加业务状态。声明的状态应出现在 `page.states` 中。

### `responsive`

至少声明：

- `desktop`：桌面结构策略。
- `narrow`：窄屏结构变化与核心任务保留方式。

需要时可以补充 `tablet`。

### `deviations`

所有偏离全局规范或已选 Pattern 的决定。每项包含：

- `ruleRef`：被调整的规则或 Token。
- `change`：本页采用的值或行为。
- `reason`：为什么必须调整。
- `scope`：影响的区域或组件。

没有偏离时使用空数组 `[]`，不使用“无”等自由文本。

组件默认值和共享外观读取导演规则 01。明确需求或高置信度推断产生非标准外观时，必须同时记录 presentation decision 和 deviation，写明组件、Token、证据、原因和影响范围；Contract 不复制具体视觉数值。

`page.extensions.presentationDecisions` 记录自然语言到展示模式的判断。每项包含 `mode`、`confidence`、`evidence`、`baseComponent` 和 `requiresDeviation`；`requiresDeviation: true` 时必须存在相应的 `contract.deviations`。该字段记录决策依据，不替代组件树。

## 3. V1 兼容策略

- 既有 `schemaVersion: 1` 页面继续按 V1 读取、构建和基础校验，不要求补写 Contract。
- 新脚手架默认生成 `schemaVersion: 2` 和 Contract。
- V1 页面只有在主动迁移时才升级，不做批量隐式改写。
- V2 的 `page-spec.json` 仍是唯一可编辑源；设计和规则追溯直接保存在其 `metadata` 与 `contract` 中，审计时可再派生记录文件。

## 4. 设计记录

V2 可从 `contract`、`metadata.ruleRefs` 和 `metadata.assumptions` 派生一个可选的 `page-design.md`。该文件同时记录设计决定、规范来源和偏离原因，不再为新页面生成独立的 `rules-read.md`；默认页面交付不需要生成它。

`page-design.md` 是可选追溯文件，不是编辑源。修改页面设计时更新 `page-spec.json`，需要审计记录时再使用 `--with-design-record` 派生。

## 5. 渐进式加载

生成页面时始终读取导演规则 01–03，再根据需求只解析一个 `pageFamily` 并加载 `design-system/page-patterns/` 中对应 Pattern。`custom` 不加载页面族 Pattern；Contract 是本次生成的输出，不要求预先加载所有页面族文件。
