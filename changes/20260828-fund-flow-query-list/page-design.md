# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：资金流水查询
- 页面类型：fund-flow-query-list
- 页面族：list
- Shell：yipex-default
- 信息密度：compact
- 原始需求：/yipex:page 生成资金流水查询页面。查询条件：日期、订单类型、订单状态、地址条件，支持重置和查询。表格展示：流水编号、类型、对手方名称、金额、币种、流水状态、创建时间。操作查看详情和取消订单。查询列表有新增流水记录的功能，新增用抽屉展示信息，信息帮我补充一下。

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `fund-flow-list-header` | page-header | 标识资金流水查询任务 |
| 2 | `fund-flow-filters` | query-controls | 按日期、订单类型、订单状态和地址筛选流水 |
| 3 | `fund-flow-results` | result-list | 浏览流水记录并执行详情和取消操作 |
| 4 | `fund-flow-detail-overlay` | detail-overlay | 在不离开列表的情况下查看流水完整信息 |
| 5 | `fund-flow-create-drawer` | create-overlay | 在当前列表上下文中录入新的资金流水 |

## 信息层级

- 第一优先级：快速定位流水并核对资金状态
- 次级信息：新增一笔资金流水、查看流水详情或取消待处理订单

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 查询（`query-fund-flows`） | 筛选条件区末列右侧 | 按当前条件筛选演示流水并回到第一页 |
| 次操作 | 重置（`reset-fund-flow-filters`） | 查询按钮左侧 | 清空筛选条件并恢复全部流水 |
| 次操作 | 新增流水记录（`create-fund-flow`） | 结果标题右侧 | 打开右侧抽屉录入并新增一笔流水 |
| 次操作 | 详情（`view-fund-flow-detail`） | 每行操作列 | 在右侧抽屉查看当前流水详情 |
| 次操作 | 取消订单（`cancel-fund-flow`） | 每行操作列 | 确认后将待处理流水更新为已取消 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `fund-flow-results` | table | pattern-default | 需求要求查询列表、多字段筛选和多字段列对齐 | Table + Pagination | 否 |
| `fund-flow-detail-overlay` | modal | pattern-default | 流水详情使用 10 个 Descriptions.Item，按全局规则不超过 12 项使用 Modal | Modal + Descriptions (basic, two columns) | 否 |
| `fund-flow-create-drawer` | drawer-form | explicit | 新增流水记录用抽屉展示信息 | Drawer + Form | 否 |

## 状态覆盖

- loading
- empty
- error
- permission-denied

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 四项筛选使用四列网格，结果表格完整展示；详情和新增均使用右侧 520px 抽屉。 |
| Narrow | 筛选条件改为单列；结果表格保留横向滚动；抽屉宽度适配手机视口，新增表单保持单列。 |

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

- 未提供后端接口，查询、分页、详情、取消和新增均在浏览器内作用于演示数据。
- 地址条件按付款地址、收款地址和对手方名称进行模糊匹配。
- 日期筛选采用闭区间，包含开始日和结束日。
- 新增流水记录补充方向、对手方、金额、币种、付款地址、收款地址、备注和到账时间，便于完成一笔流水的完整录入。
- 取消订单仅对待处理流水开放，并在浏览器内更新为已取消状态。
