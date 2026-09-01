# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：数币钱包地址管理
- 页面类型：digital-currency-wallet-list
- 页面族：list
- Shell：yipex-default
- 信息密度：compact
- 原始需求：帮我生成一个查询列表，数字货币场景的，可以新增信息和查看详情

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `wallet-header` | page-header | 标识数币钱包地址管理任务 |
| 2 | `wallet-query` | query-controls | 按关键词、币种、网络和状态筛选钱包地址 |
| 3 | `wallet-results` | result-list | 展示钱包地址及其审核状态 |
| 4 | `wallet-detail` | detail-overlay | 在列表上下文中查看钱包地址完整信息 |
| 5 | `wallet-create` | form-overlay | 在列表上下文中新增钱包地址 |

## 信息层级

- 第一优先级：快速定位并维护数字货币钱包地址
- 次级信息：查看钱包地址的网络、用途和审核信息

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 查询（`query-wallets`） | 查询条件区末列 | 按当前条件筛选并回到第一页 |
| 次操作 | 重置（`reset-wallet-query`） | 查询按钮左侧 | 清空查询条件并恢复全部记录 |
| 次操作 | 新增钱包地址（`create-wallet`） | 列表标题工具区最右侧 | 打开新增抽屉并录入钱包地址 |
| 次操作 | 查看详情（`view-wallet-detail`） | 每行操作列 | 打开详情抽屉查看完整信息 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `wallet-results` | table | pattern-default | 需求明确要求查询列表 | Table + Pagination | 否 |
| `wallet-detail` | drawer | pattern-default | 详情包含 12 个字段，适合保留列表上下文查看 | Drawer + Descriptions (two columns) | 否 |
| `wallet-create` | drawer-form | pattern-default | 新增包含 7 个录入字段 | Drawer + Form controls | 否 |

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
| Desktop | 四项筛选使用四列网格；表格横向稳定展示，新增与详情使用官方大尺寸右侧抽屉。 |
| Narrow | 筛选条件改为单列，表格保留横向滚动；抽屉接近全宽，详情描述列表降为单列。 |

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

- 需求未指定具体数字货币业务对象，本页按常见的钱包地址管理场景实现。
- 未提供后端接口，查询、新增和详情均基于浏览器演示数据；新增记录保存在 localStorage。
- 新增钱包地址默认进入审核中，并按创建时间倒序显示在列表第一条。
