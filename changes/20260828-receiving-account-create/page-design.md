# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：收款账户
- 页面类型：receiving-account-list-create
- 页面族：list
- Shell：yipex-default
- 信息密度：standard
- 原始需求：创建一个收款账户的新增页面，有新增按钮，点击后弹窗展示内容。内容：可以选择2个类型（唯一的）。页面查询条件有：账户类型、账户状态、订单状态。1：新建收款订单（支持SWIFT电汇,覆盖全球银行网络,适合多币种跨境收款）。2：本地收款账户（特定国家/地区本地清算网络,到账快、费用低）。表单项：账户持有人、开户地、开户行、账户币种、贸易国家/地区、商品大类、开户行。创建完成后在页面以卡片的形态展示，状态有：成功、驳回、审核中。

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `receiving-account-header` | page-header | 标识收款账户管理任务并提供新增入口 |
| 2 | `receiving-account-filters` | query-controls | 按账户类型、账户状态和订单状态筛选账户 |
| 3 | `receiving-account-results` | card-list | 以卡片浏览账户类型、开户信息和当前状态 |
| 4 | `create-account-modal` | create-dialog | 互斥选择账户类型并填写收款账户资料 |

## 信息层级

- 第一优先级：新增收款账户并确认创建结果
- 次级信息：按类型与状态筛选已有账户、快速识别成功、驳回和审核中账户

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 新增收款账户（`open-create-account`） | 页面标题区右侧 | 打开新增弹窗并聚焦账户类型选择 |
| 次操作 | 查询（`query-accounts`） | 筛选条件区底部右侧 | 应用账户类型、账户状态和订单状态筛选 |
| 次操作 | 重置（`reset-account-filters`） | 查询按钮左侧 | 清空筛选条件并恢复全部账户卡片 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `results` | card-grid | explicit | 创建完成后在页面以卡片的形态展示 | Card | 是 |
| `accountType` | selectable-card | inferred-high | 两个账户类型且必须唯一选择；每种类型包含标题、标签和较长能力说明 | Radio.Group + Radio + Card | 是 |

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
| Desktop | 筛选区使用四列网格，账户结果使用三列卡片；新增弹窗双列表单并完整展示两种类型说明。 |
| Narrow | 筛选区和卡片网格改为单列；新增弹窗适配手机宽度，表单改为单列且底部操作保持可触控。 |

## 规范依据

- `DESIGN.md`
- `01-foundations.md`
- `02-components.md`
- `03-query-list-patterns.md`
- `execution/presentation-intent.md`
- `execution/page-contract-v2.md`

## 规范偏离

| 原规则 | 本页调整 | 原因 | 影响范围 |
| --- | --- | --- | --- |
| 03-query-list-patterns.md §4 结果列表 | 结果区使用 Ant Design Card 响应式网格，而不是 Table。 | 用户明确要求创建完成后以卡片形态展示收款账户。 | receiving-account-results |
| 02-components.md § Selectable Card | 账户类型使用 Radio.Group + Radio 保留单选语义，并以 Ant Design Card 承载每项标题、标签和说明。 | 需求包含 2 个互斥账户类型，且每项同时具有标题、能力标签和较长适用范围说明，满足高置信度卡片式选择信号。 | create-account-modal.account-type |

## 需求假设

- 需求中“开户行”重复出现两次，合并为一个必填字段。
- 两种账户类型必须唯一选择，使用 Radio.Group 实现互斥单选。
- 账户状态使用成功、驳回、审核中；订单状态解释为申请流程状态，使用处理中、已完成、已关闭。
- 未提供后端接口，查询和创建均在浏览器内作用于演示数据；新建记录默认进入审核中。
