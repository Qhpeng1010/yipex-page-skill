# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：新增用户
- 页面类型：user-create-form
- 页面族：form
- Shell：yipex-default
- 信息密度：standard
- 原始需求：新增用户表单：填写用户名、手机号、角色、用户状态，保存成功后返回用户管理列表并刷新数据

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `user-form` | form | 填写新增用户信息 |
| 2 | `user-form-actions` | action | 取消或保存用户信息 |

## 信息层级

- 第一优先级：完成用户信息填写并保存
- 次级信息：按基础信息和权限信息分组核对字段

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 保存（`save-user`） | 表单底部右侧 | 校验并保存新增用户，返回用户列表并刷新 |
| 次操作 | 取消（`cancel-user-create`） | 保存按钮左侧 | 放弃填写并返回用户列表 |

## 展现模式决策

本页未记录需要单独说明的展现模式决策。

## 状态覆盖

- loading
- submitting
- error
- success
- permission-denied

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 表单按主题分组并使用三列网格，底部操作区右对齐。 |
| Narrow | 字段改为单列，底部操作区保持可见。 |

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

- 未提供后端接口，保存使用浏览器内演示数据。
