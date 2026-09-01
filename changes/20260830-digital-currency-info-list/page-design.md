# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：数币信息管理
- 页面类型：digital-currency-info-query-list
- 页面族：list
- Shell：yipex-default
- 信息密度：compact
- 原始需求：/yipex:page 创建一个数币查询列表页面。条件：币种/类型、所属银行、所属国际地区、添加人、状态、时间。可以新增币种信息，12个表单项。列表：币种ID、币种/类型、所属银行、所属国际地区、添加人、状态、时间、操作（编辑、详情、禁用）

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `currency-header` | page-header | 标识数币信息管理任务 |
| 2 | `currency-query` | query-controls | 按币种类型、银行、地区、添加人、状态和时间筛选 |
| 3 | `currency-results` | result-list | 展示数币信息并执行编辑、详情和禁用操作 |
| 4 | `currency-detail` | detail-overlay | 在列表上下文中查看币种完整信息 |
| 5 | `currency-create` | form-overlay | 在大尺寸抽屉中新增或编辑 12 项币种信息 |

## 信息层级

- 第一优先级：查询并维护数币信息
- 次级信息：通过详情和状态操作核对币种归属与配置

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 查询（`query-currencies`） | 查询条件区末列 | 应用筛选并回到第一页 |
| 次操作 | 重置（`reset-currency-query`） | 查询按钮左侧 | 清空筛选并恢复全部记录 |
| 次操作 | 新增币种信息（`create-currency`） | 列表标题工具区最右侧 | 打开大尺寸新增抽屉 |
| 次操作 | 编辑（`edit-currency`） | 每行操作列 | 打开抽屉编辑当前币种信息 |
| 次操作 | 详情（`view-currency-detail`） | 每行操作列 | 打开详情抽屉查看 15 项信息 |
| 次操作 | 禁用（`disable-currency`） | 每行操作列 | 确认后将当前币种状态更新为已禁用 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `currency-results` | table | explicit | 需求明确要求查询列表 | Table + Pagination | 否 |
| `currency-create` | drawer-form | pattern-default | 新增包含 12 个表单项，按 7-16 项使用 Drawer | Drawer + Form controls | 否 |
| `currency-detail` | drawer | pattern-default | 详情包含 15 个字段，按 7-16 项使用 Drawer | Drawer + Descriptions (two columns) | 否 |

## 状态覆盖

- loading
- empty
- error
- permission-denied
- submitting
- success

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 六项筛选按四列网格换行，表格固定操作列，新增和详情使用官方大尺寸右侧抽屉。 |
| Narrow | 筛选条件改为单列，表格保留横向滚动，抽屉接近全宽且详情降为单列。 |

## 规范依据

- `execution/context-packs/core.md`
- `design-system/director-rules/01-visual-constitution.md`
- `design-system/director-rules/02-template-application-rules.md`
- `design-system/director-rules/03-interaction-acceptance-rules.md`
- `design-system/page-patterns/list.md`
- `execution/page-contract-v2.md`
- `execution/capability-model/capability-model.md`

## 规范偏离

无规范偏离。

## 需求假设

- 未提供后端接口，新增、编辑和禁用状态使用浏览器 localStorage 演示。
- 新增币种信息按基础信息、归属信息、配置与状态补充为 12 个字段，币种 ID 和创建时间由系统生成。
- 详情展示 15 个字段，保持列表上下文。
