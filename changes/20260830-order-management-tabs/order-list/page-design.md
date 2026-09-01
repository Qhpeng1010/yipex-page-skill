# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：订单管理
- 页面类型：order-tab-query-list
- 页面族：list
- Shell：yipex-default
- 信息密度：compact
- 原始需求：/yipex:page 生成订单管理 Tab 查询列表页面。页面包含‘全部订单’‘待付款’‘已付款’‘已完成’‘已取消’五个 Tab，每个 Tab 对应不同订单状态。Tab 切换后保留统一的查询区域，查询条件包括订单号、客户名称、支付方式和下单时间。列表展示订单号、客户名称、订单金额、支付状态、下单时间和操作。操作列提供‘查看详情’和‘取消订单’，页面右上角提供‘新增订单’按钮。新增订单完成后返回‘全部订单’Tab，并刷新列表；查看详情后返回原 Tab 和原查询条件

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `order-list-header` | page-header | 标识订单管理任务并提供新增订单入口 |
| 2 | `order-tabs` | tab-navigation | 按订单状态切换结果范围 |
| 3 | `order-filters` | query-controls | 在当前 Tab 下按订单号、客户、支付方式和下单时间筛选 |
| 4 | `order-results` | result-list | 展示当前 Tab 的订单并支持详情与取消 |
| 5 | `order-detail-overlay` | detail-overlay | 按详情字段数量在列表上下文中使用 Modal 或 Drawer |
| 6 | `order-create-overlay` | form-overlay | 按录入字段数量在列表上下文中使用 Modal 或 Drawer |

## 信息层级

- 第一优先级：快速定位并处理订单
- 次级信息：按状态切换订单范围、查看详情或取消待付款订单

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 查询（`query-orders`） | 查询条件区末列右侧 | 按当前 Tab 和筛选条件刷新订单列表 |
| 次操作 | 重置（`reset-order-filters`） | 查询按钮左侧 | 清空查询条件并保留当前 Tab |
| 次操作 | 新增订单（`create-order`） | 列表标题工具区最右侧 | 按录入字段数量打开新增订单 Modal 或 Drawer，超过 16 项进入独立表单页 |
| 次操作 | 查看详情（`view-order-detail`） | 订单列表操作列 | 按详情字段数量打开 Modal 或 Drawer，超过 16 项进入独立详情页并保留当前列表上下文 |
| 次操作 | 取消订单（`cancel-order`） | 订单列表操作列 | 确认后将待付款订单更新为已取消 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `order-tabs` | standard-choice | explicit | 需求明确要求五个订单状态 Tab | Tabs | 否 |
| `order-results` | table | explicit | 需求明确要求列表字段、分页和操作列 | Table + Pagination | 否 |
| `order-detail-overlay` | drawer | inferred-high | 详情字段共 8 项，按数量规则落在 7-16 项 Drawer 区间 | Drawer + Descriptions | 否 |
| `order-create-overlay` | modal-form | inferred-high | 新增录入字段共 6 项，按数量规则落在 1-6 项 Modal 区间 | Modal + Form | 否 |

## 状态覆盖

- loading
- empty
- error
- permission-denied
- success
- canceling

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | Tab 横向展示，四项查询条件使用四列网格，结果表格固定操作列并保留分页。 |
| Tablet | Tab 可横向滚动，筛选条件改为两列，表格保留横向滚动。 |
| Narrow | Tab、筛选条件和操作区保持单列可滚动，表格保留横向滚动。 |

## 规范依据

- `DESIGN.md`
- `01-foundations.md`
- `02-components.md`
- `03-query-list-patterns.md`
- `05-form-patterns.md`
- `06-detail-patterns.md`
- `execution/presentation-intent.md`
- `execution/page-contract-v2.md`
- `execution/capability-model/capability-model.md`

## 规范偏离

无规范偏离。

## 需求假设

- 未提供后端接口，列表、新增、详情和取消使用浏览器内演示数据。
- 仅待付款订单允许取消；已付款、已完成和已取消订单的取消按钮不可用。
- 详情返回上下文通过列表内 Overlay 状态保留 Tab、查询条件和分页，不因上下文恢复要求创建独立详情页。
- 详情 8 项按数量规则使用 Drawer；新增 6 项按数量规则使用 Modal。
