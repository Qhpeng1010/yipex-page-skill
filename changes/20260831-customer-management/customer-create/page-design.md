# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：新增客户
- 页面类型：customer-create-form
- 页面族：form
- Shell：yipex-default
- 信息密度：compact
- 原始需求：/yipex:fast 生成客户管理流程，包含客户查询列表和新增客户表单两个页面。列表支持按客户名称、客户类型和状态查询，展示客户名称、类型、联系人、状态和创建时间。点击“新增客户”进入表单，表单分为基础信息、联系人和结算信息三组，支持校验、保存和取消。保存成功后返回列表并刷新数据，取消不保存。

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `customer-form` | form | 按基础信息、联系人和结算信息分组录入客户 |
| 2 | `customer-form-actions` | action | 提交客户或取消返回列表 |

## 信息层级

- 第一优先级：完成客户资料录入并提交
- 次级信息：按信息分组核对字段、取消时不保存并返回客户列表

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 保存（`save-customer`） | 固定吸底栏最右侧 | 校验并保存客户，返回列表后置顶新客户并提示成功 |
| 次操作 | 取消（`cancel-customer`） | 提交按钮左侧 | 不保存当前内容并返回客户列表 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `customer-form` | grouped-form-sections | explicit | 新增页面明确包含基础信息、联系人和结算信息三个业务分组 | Card + Form | 否 |

## 状态覆盖

- loading
- submitting
- error
- success
- permission-denied

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 三个业务模块使用三列字段网格，固定吸底操作栏右对齐。 |
| Narrow | 字段改为单列，模块保持清晰分组，操作栏覆盖全宽。 |

## 规范依据

- `DESIGN.md`
- `01-foundations.md`
- `02-components.md`
- `05-form-patterns.md`
- `execution/presentation-intent.md`
- `execution/page-contract-v2.md`
- `execution/capability-model/capability-model.md`

## 规范偏离

无规范偏离。

## 需求假设

- 基础信息包含客户编号、客户名称、客户类型；联系人包含姓名、手机号、邮箱；结算信息包含结算周期、结算币种和结算账户。
- 未提供后端接口，提交和返回使用浏览器本地演示数据。
- 客户编号由录入人员填写，并作为列表记录的唯一标识。
