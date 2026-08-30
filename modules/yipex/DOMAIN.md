# YiPex 页面生成域

YiPex 是一个允许通过自然语言生成后台及业务页面的平台。它不预设唯一业务域、页面族或固定 Shell；页面结构由当前需求决定，设计规范内置在本 skill 的 `design-system/` 中。

## 路由边界

- 显式提到 YiPex、Yipex 或 `$yipex-page-skill` 的页面需求进入本域。
- 技能被显式调用后，未写产品名称也按 YiPex 处理。
- 明确要求易账通、老板管账、易宝开放平台等其他系统时不进入本域；同时提到多个系统且目标不清时先确认。

## 生成边界

- 默认不以能力白名单限制开放模式，不因缺少既有模板而拒绝合理页面需求；标准/严格模式使用能力模型和已验证 Recipe 作为交付边界。
- 设计规范是视觉和交互质量的依据，不替代产品需求，也不限制业务功能。
- 页面可使用既有模式，也可声明自定义布局、组件和交互。
- 标准控件优先映射到 Ant Design 官方组件，并使用官方语义、状态与组合能力。自定义组件只用于官方组件无法表达的产品能力；页面 CSS 只负责布局，非标准外观必须记录 deviation。
- 对不确定的业务语义记录假设，不自行编造接口、权限或数据结论。
- 新需求先经过能力策略解析：命中已实现 Recipe 时可标准化生成，未命中时进入开放组合；标准/严格模式未满足能力时必须输出能力缺口。

## 渐进式资源

`rules-index.json` 是规则读取入口。每次只加载轻量 Core Context、`design-system/director-rules/` 下 01–03 三份设计师维护规则，并只解析一个 `pageFamily`。命中 `dashboard`、`list`、`form`、`detail` 或 `result` 时，再读取 `design-system/page-patterns/` 中一个对应 Pattern；未命中时使用 `custom/open`。不要为了寻找模板加载全部页面族，也不要把新能力改写成最接近的旧页面。实际规则来源写入 `page-spec.json` 的 `metadata.ruleRefs`，展现判断写入 `page.extensions.presentationDecisions`；需要审计时再派生 `page-design.md`。

能力策略读取 `execution/capability-model/` 的注册表与组合规则。`metadata.generation` 记录本次采用的模式、策略、Recipe、Skeleton 和能力集合。

## 运行时契约

快捷命令契约位于 `execution/command-contract.json`：`/yipex:page` 走完整页面流程，`/yipex:fast` 以 `auto` 策略优先尝试已实现 Recipe，`/yipex:prd` 读取 `product/prd-standard.md` 只产出产品需求文档。快捷命令只改变交付模式，不改变 YiPex 的页面、能力和 Shell 边界。

`execution/page-spec.schema.json` 保留 V1 兼容；新页面使用 `execution/page-spec-v2.schema.json`，并按 `execution/page-contract-v2.md` 声明结构、操作、状态、响应式和偏离。`page-spec.json` 是唯一编辑源，`preview.html` 是默认派生产物，`page-design.md` 是可选审计产物。生产页面使用目标项目提供的 Ant Design 官方依赖；独立预览可以使用 Shell 中锁定的官方运行时。
