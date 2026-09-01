# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：商户查询
- 页面类型：merchant-query-list
- 页面族：list
- Shell：yipex-default
- 信息密度：compact
- 原始需求：创建一个商户查询列表，供平台运营人员查找和管理商户。支持按商户名称、商户编号、经营状态、签约日期和所属行业筛选；结果表格展示商户名称、联系人、交易规模、经营状态、创建时间和负责人。支持重置、查询、分页、导出、批量选择和查看商户详情；详情使用右侧抽屉。使用演示数据，并覆盖 loading、empty、error 和 permission-denied 状态。

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `merchant-list-header` | page-header | 标识商户查询任务和演示数据 |
| 2 | `merchant-filters` | query-controls | 按名称、编号、状态、签约日期和行业筛选商户 |
| 3 | `merchant-results` | result-list | 浏览、选择、导出并进入商户详情 |
| 4 | `merchant-detail-overlay` | detail-overlay | 在不离开列表的情况下查看商户完整信息 |

## 信息层级

- 第一优先级：快速找到目标商户并查看经营与归属信息
- 次级信息：批量选择和导出当前工作结果、在右侧抽屉核对商户详情

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 查询（`query-merchants`） | 筛选条件区底部右侧 | 按当前条件筛选演示数据并回到第一页 |
| 次操作 | 重置（`reset-filters`） | 查询按钮左侧 | 清空筛选条件并恢复全部商户 |
| 次操作 | 导出（`export-merchants`） | 结果标题右侧 | 导出已选商户；未选择时导出当前筛选结果 |

## 展现模式决策

本页未记录需要单独说明的展现模式决策。

## 状态覆盖

- loading
- empty
- error
- permission-denied

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 筛选条件使用四列网格，结果表格完整展示，11 项商户详情使用两列 Modal。 |
| Narrow | 筛选条件改为单列，查询操作保持右对齐；结果表格保留横向滚动，抽屉宽度适配手机视口。 |

## 规范依据

- `DESIGN.md`
- `01-foundations.md`
- `02-components.md`
- `03-query-list-patterns.md`
- `execution/page-contract-v2.md`
- `execution/capability-model/capability-model.md`

## 规范偏离

无规范偏离。

## 需求假设

- 未提供后端接口，查询、分页、批量选择、详情和导出均在浏览器内作用于演示数据。
- 交易规模按近 30 日交易金额与订单笔数展示，用于帮助运营人员快速判断商户体量。
- 签约日期筛选采用闭区间，包含开始日和结束日。
- 导出在浏览器内生成当前筛选结果或已选商户的 CSV 文件。
