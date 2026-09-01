# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：客户查询
- 页面类型：customer-query-list
- 页面族：list
- Shell：yipex-default
- 信息密度：compact
- 原始需求：生成一个客户查询列表，支持客户名称、等级和注册日期筛选，支持导出和查看详情。

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `customer-list-header` | page-header | 标识客户查询任务和演示数据 |
| 2 | `customer-filters` | query-controls | 按客户名称、编号、等级、状态和注册日期筛选客户 |
| 3 | `customer-results` | result-list | 浏览、导出客户并进入详情 |
| 4 | `customer-detail-overlay` | detail-overlay | 在不离开列表的情况下查看客户完整信息 |

## 信息层级

- 第一优先级：快速找到目标客户并核对客户信息
- 次级信息：导出当前筛选结果、在右侧抽屉查看客户详情

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 查询（`query-customers`） | 筛选条件区末列右侧 | 按当前条件筛选演示数据并回到第一页 |
| 次操作 | 重置（`reset-customer-filters`） | 查询按钮左侧 | 清空筛选条件并恢复全部客户 |
| 次操作 | 导出（`export-customers`） | 结果标题右侧 | 导出当前筛选结果为 CSV 文件 |
| 次操作 | 详情（`view-customer-detail`） | 每行操作列 | 在右侧抽屉查看当前客户详情 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `customer-results` | table | pattern-default | 需求要求客户查询列表，并支持多字段筛选和导出 | Table + Pagination | 否 |
| `customer-detail-overlay` | modal | pattern-default | 客户详情使用 11 个 Descriptions.Item，按全局规则不超过 12 项使用 Modal；详情使用 Descriptions 基本形态并采用两列流式布局 | Modal + Descriptions (basic, two columns) | 否 |

## 状态覆盖

- loading
- empty
- error
- permission-denied

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 五项筛选使用四列网格；前四项位于首行，第五项与右对齐操作组位于第二行；结果表格完整展示，11 项客户详情使用两列 Modal。 |
| Narrow | 筛选条件改为单列，查询操作位于最后一行；结果表格保留横向滚动，抽屉宽度适配手机视口。 |

## 规范依据

- `DESIGN.md`
- `01-foundations.md`
- `02-components.md`
- `03-query-list-patterns.md`
- `execution/presentation-intent.md`
- `execution/page-contract-v2.md`
- `execution/capability-model/capability-model.md`

## 规范偏离

无规范偏离。

## 需求假设

- 未提供后端接口，查询、分页、详情和导出均在浏览器内作用于演示数据。
- 客户等级采用普通、银牌、金牌和 VIP 四级枚举。
- 客户状态采用正常、待认证和已停用三种演示状态。
- 注册日期筛选采用闭区间，包含开始日和结束日。
- 导出在浏览器内生成当前筛选结果的 CSV 文件。
- 查看详情使用右侧抽屉，以保留当前筛选和分页上下文。
