# YiPex 能力模型

YiPex 使用双层能力策略：稳定、重复的业务场景走已验证的标准组合；新业务和非标准页面继续走开放式 Page Contract。能力模型描述可复用的任务结构，不取代具体页面的业务需求。

## 四层结构

1. **Skeleton**：稳定的任务结构，例如 `query-workbench`、`form-workflow`、`detail-workbench` 和 `dashboard-overview`。
2. **Region**：骨架中的业务区域，例如 `query`、`summary`、`table`、`form`、`detail` 和 `chart`。
3. **Capability**：区域允许声明的可交付行为，例如 `table.pagination`、`form.validation` 或 `detail.overlay`。
4. **Binding / Transition**：声明区域间的数据传递和跨页面操作，不允许在规格中注入任意脚本。

## Recipe 组合方式

Recipe 不是封闭模板，而是“一个已验证的 Skeleton/Renderer + 基础能力 + 可选能力”的组合配方。路由先从需求中识别能力和未登记功能，再结合 `strongSignals`、`negativeSignals`、专用能力条件和 `priority` 选择 Recipe。只有 Recipe 覆盖全部已识别能力时才进入标准渲染器；载体与页面组合读取导演规则 02 和 `rules-index.json` 的机器镜像。

每次仍只选择一个主 Recipe 和一个渲染器，避免多个模板互相覆盖；跨页面任务使用 Page Composition、Binding 与 Transition 连接。若需求命中了 Recipe 未允许或尚未实现的能力，`auto` 回到开放式 Contract，`standard`/`strict` 输出能力缺口。

机器可读文件：

- `capability-registry.json`：骨架、区域和能力注册表。
- `composition-rules.json`：区域顺序、标准 Recipe 和转场规则。
- `scripts/lib/yipex-renderer-registry.mjs`：标准渲染器与对应脚手架工厂的运行时注册表。
- `page-composition.schema.json`：跨区域/跨页面组合的可选契约。
- `data-binding.schema.json`：声明式数据绑定契约。

## 生成策略

- `auto`：默认模式。基础 Recipe 及本次装配的可选能力均已实现时使用 `standard`，否则使用 `open`。
- `standard`：要求命中已实现 Recipe；未命中时输出能力缺口，不生成伪标准页面。
- `open`：允许 `custom` 和新组合，但仍必须遵守 Page Spec、设计系统、可访问性和静态检查。
- `strict`：与 `standard` 相同，并要求所有声明能力均为 `implemented`。

标准组合仍使用 Page Spec V2 作为页面业务唯一编辑源；组合式 Page Spec 用于需要多个区域、步骤或页面转场的场景，待对应渲染器能力开放后再构建预览。

## 状态含义

- `implemented`：固定渲染器已支持，可进入标准预览。
- `declared-only`：已登记但还不能作为标准预览交付。
- `model-only`：只有模型和规则，尚未开放生成。

开放模式不会因为能力未登记而拒绝合理需求；标准/严格模式必须报告 `capability-gap`。新增标准模板时，Recipe 通过 `rendererId` 指向运行时注册表；注册表同时提供渲染函数和默认 Page Spec 脚手架。新增能力时同步更新注册表、组合规则、Schema、渲染器和回归测试。

## 兼容原则

- V1、V2 Page Spec 继续兼容，不批量迁移历史 Change。
- 标准策略只写入新规格的 `metadata.generation`，不改变既有 `page.root` 结构。
- 页面样式由 Design System 和渲染器统一提供，能力模型只决定结构和行为边界。
