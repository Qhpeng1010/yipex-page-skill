# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：新增结算规则
- 页面类型：form
- 页面族：form
- Shell：yipex-default
- 信息密度：compact
- 原始需求：创建一个新增结算规则表单，按基础信息、结算参数和补充设置分组，支持校验、保存和取消。

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `rule-form` | form | 按业务分组填写结算规则 |
| 2 | `form-actions` | action | 保存或取消当前规则 |

## 信息层级

- 第一优先级：完成结算规则配置并保存
- 次级信息：按分组快速定位字段

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 保存（`save-rule`） | 覆盖 Shell Footer 的固定吸底栏最右侧 | 校验字段并保存演示规则 |
| 次操作 | 取消（`cancel-rule`） | 保存按钮左侧 | 重置当前编辑内容 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `rule-form` | grouped-form-sections | explicit | 分模块展示，每个模块有标题；信息较多的分组表单默认三列，横向、纵向和模块间距均为 16px；外层不使用白色背景和 24px 内容内边距，模块 header 与 body 使用纯白背景并保留清晰的灰色分割线；面包屑在模块外展示且上方、左侧各保留 8px | Card + Form | 否 |

## 状态覆盖

- loading
- error
- success
- permission-denied

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 移除分组表单最外层白色背景和 24px 内容内边距；面包屑在模块外展示并在上方、左侧各保留 8px；每个业务模块的 header 和 body 使用纯白背景并保留清晰的 1px 灰色分割线，字段默认使用三列网格，水平、垂直及模块间距均为 16px；固定吸底操作栏从侧边栏右缘到窗口右缘左右通铺，按钮组右对齐。 |
| Narrow | 模块字段改为单列，纯白模块保持独立区分；面包屑保持可见，固定吸底操作栏从窗口左缘到右缘通铺。 |

## 规范依据

- `DESIGN.md`
- `01-foundations.md`
- `02-components.md`
- `05-form-patterns.md`
- `execution/presentation-intent.md`
- `execution/page-contract-v2.md`
- `execution/capability-model/capability-model.md`

## 规范偏离

无规范偏离。

## 需求假设

- 保存操作使用演示数据，不调用真实接口。
