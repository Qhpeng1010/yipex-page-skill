# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：用户管理
- 页面类型：user-query-list
- 页面族：list
- Shell：yipex-default
- 信息密度：compact
- 原始需求：/yipex:page 生成用户管理查询列表页面。页面顶部提供用户名、手机号、用户状态、注册时间查询条件，支持查询和重置。下方展示用户列表，字段包括用户名、手机号、角色、状态、注册时间和操作。操作列提供‘查看详情’和‘编辑’，页面右上角提供‘新增用户’按钮。点击新增进入新增用户表单，保存成功后返回当前列表并刷新数据；点击查看详情进入用户详情页，详情页支持返回列表

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `user-list-header` | page-header | 标识用户管理任务并提供新增入口 |
| 2 | `user-filters` | query-controls | 按用户名、手机号、状态和注册时间筛选用户 |
| 3 | `user-results` | result-list | 分页浏览用户并进入详情或编辑流程 |

## 信息层级

- 第一优先级：快速定位并管理用户
- 次级信息：从列表新增用户、核对用户详情或编辑用户信息

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 查询（`query-users`） | 筛选条件区末列右侧 | 按当前条件筛选用户并回到第一页 |
| 次操作 | 重置（`reset-user-filters`） | 查询按钮左侧 | 清空筛选条件并恢复全部用户 |
| 次操作 | 新增用户（`create-user`） | 列表标题工具区最右侧 | 进入新增用户表单 |
| 次操作 | 查看详情（`view-user-detail`） | 用户列表操作列 | 进入当前用户详情页 |
| 次操作 | 编辑（`edit-user`） | 用户列表操作列 | 进入当前用户编辑表单 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `user-results` | table | explicit | 需求明确要求展示用户列表及多字段操作列 | Table + Pagination | 否 |

## 状态覆盖

- loading
- empty
- error
- permission-denied
- success

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 四个筛选条件使用四列网格，操作组位于末行右侧；表格固定操作列并保留分页。 |
| Tablet | 筛选条件收缩为两列，表格保留横向滚动。 |
| Narrow | 筛选条件改为单列，表格保留横向滚动，操作按钮保持可达。 |

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

- 未提供后端接口，列表、新增、编辑和详情使用浏览器内演示数据。
- 用户名是用户唯一标识；新增用户 ID 在浏览器内按时间生成。
- 注册时间筛选采用包含开始日和结束日的闭区间。
