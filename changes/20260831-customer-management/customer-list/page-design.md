# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：客户管理
- 页面类型：customer-query-list
- 页面族：list
- Shell：yipex-default
- 信息密度：compact
- 原始需求：/yipex:fast 生成客户管理流程，包含客户查询列表和新增客户表单两个页面。列表支持按客户名称、客户类型和状态查询，展示客户名称、类型、联系人、状态和创建时间。点击“新增客户”进入表单，表单分为基础信息、联系人和结算信息三组，支持校验、保存和取消。保存成功后返回列表并刷新数据，取消不保存。

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `customer-list-header` | page-header | 标识客户管理任务 |
| 2 | `customer-filters` | query-controls | 按关键词、客户类型和状态筛选客户 |
| 3 | `customer-results` | result-list | 浏览客户并进入新增流程 |

## 信息层级

- 第一优先级：快速定位并管理客户
- 次级信息：从列表进入新增客户页面、识别刚创建的客户

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 查询（`query-customers`） | 筛选条件区末列右侧 | 按当前条件筛选客户并回到第一页 |
| 次操作 | 重置（`reset-customer-filters`） | 查询按钮左侧 | 清空筛选条件并恢复全部客户 |
| 次操作 | 新增客户（`create-customer`） | 列表标题工具区最右侧 | 进入新增客户页面 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `customer-results` | table | pattern-default | 多记录、多字段筛选与列对齐需求 | Table + Pagination | 否 |

## 状态覆盖

- loading
- empty
- error
- permission-denied
- success

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 三项筛选使用四列网格，操作组与第三项同处末行右侧；客户表格按创建时间倒序展示。 |
| Narrow | 筛选条件改为单列，列表保留横向滚动，返回列表后的成功反馈使用 message，不改变行样式。 |

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

- 未提供后端接口，列表与新增操作使用浏览器本地演示数据。
- 客户列表按需求展示客户名称、类型、联系人、状态和创建时间，客户编号保留在演示记录中用于新增后的唯一标识。
- 新增客户提交后通过本地演示存储在列表中插入记录，并按创建时间倒序置顶；返回列表时由列表页显示成功 message。
