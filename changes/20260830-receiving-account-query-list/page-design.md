# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：收款账户
- 页面类型：receiving-account-query-list
- 页面族：list
- Shell：yipex-default
- 信息密度：compact
- 原始需求：帮我做一个收款账户列表。查询条件：开户地、开户时间、开户币种、账户币种、商品类型。列表：开户地、国家、类型、开户行、账户持有人、开户时间、操作（编辑、查看详情：15个详细字段）。可以提交申请收款账户：新建收款订单（支持SWIFT电汇,覆盖全球银行网络,适合多币种跨境收款）；本地收款账户（特定国家/地区本地清算网络,到账快、费用低）。信息：账户持有人、开户地、开户行、账户币种、贸易国家/地区、商品大类、开户行。

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `receiving-account-header` | page-header | 标识收款账户管理任务并提供申请入口 |
| 2 | `receiving-account-filters` | query-controls | 按开户地、开户时间、开户币种、账户币种和商品类型筛选账户 |
| 3 | `receiving-account-results` | result-list | 展示收款账户开户信息并提供编辑和详情操作 |
| 4 | `receiving-account-detail` | detail-overlay | 在列表上下文中查看收款账户 15 项完整信息 |
| 5 | `receiving-account-create` | create-overlay | 选择账户类型并提交收款账户申请 |

## 信息层级

- 第一优先级：快速找到收款账户并完成申请或维护
- 次级信息：按开户信息筛选账户、查看完整详情或编辑账户

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 查询（`query-receiving-accounts`） | 查询条件区末列 | 按当前条件筛选收款账户并回到第一页 |
| 次操作 | 重置（`reset-receiving-account-filters`） | 查询按钮左侧 | 清空筛选条件并恢复全部收款账户 |
| 次操作 | 申请收款账户（`apply-receiving-account`） | 列表标题工具区最右侧 | 打开抽屉选择账户类型并填写申请信息 |
| 次操作 | 编辑（`edit-receiving-account`） | 每行操作列 | 打开编辑抽屉并保存账户信息 |
| 次操作 | 查看详情（`view-receiving-account-detail`） | 每行操作列 | 在右侧抽屉查看 15 个账户详情字段 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `receiving-account-results` | table | pattern-default | 需求明确要求收款账户列表和固定业务列 | Table + Pagination | 否 |
| `receiving-account-detail` | drawer | pattern-default | 详情包含 15 个字段，超过全局 12 项阈值；列表上下文中查看完整账户信息 | Drawer + Descriptions (basic, two columns) | 否 |
| `receiving-account-create` | drawer-form | explicit | 用户要求提交申请收款账户；账户类型需要唯一单选并展示两段副描述 | Drawer + Radio.Group + Form controls | 否 |

## 状态覆盖

- loading
- empty
- error
- permission-denied
- creating
- success

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 五项筛选使用四列网格；结果表格展示 7 列业务信息与操作列，详情和申请使用右侧抽屉。 |
| Narrow | 筛选条件改为单列，结果表格保留横向滚动；抽屉接近全宽并保持单列字段。 |

## 规范依据

- `execution/context-packs/core.md`
- `execution/context-packs/interaction.md`
- `execution/context-packs/accessibility.md`
- `execution/context-packs/layout.md`
- `execution/context-packs/components.md`
- `design-system/03-query-list-patterns.md`
- `execution/presentation-intent.md`
- `execution/page-contract-v2.md`
- `execution/capability-model/capability-model.md`

## 规范偏离

无规范偏离。

## 需求假设

- 未提供后端接口，筛选、分页、详情、编辑和申请均在浏览器内作用于演示数据。
- 需求中的“开户币种”和“账户币种”按两个独立字段处理；开户币种表示开户行支持的结算币种，账户币种表示该收款账户实际入账币种。
- 开户行在申请信息中重复出现，合并为一个必填字段。
- 申请收款账户使用唯一单选账户类型；提交后默认进入审核中，并按创建时间倒序置于首条。
- 查看详情使用 15 个只读字段，超过全局 12 项阈值，因此使用右侧 Drawer。
