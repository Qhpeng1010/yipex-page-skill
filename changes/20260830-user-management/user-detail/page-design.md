# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：用户详情
- 页面类型：user-detail
- 页面族：detail
- Shell：yipex-default
- 信息密度：standard
- 原始需求：用户详情页：展示用户名、手机号、角色、用户状态、注册时间，支持返回用户管理列表

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `user-detail` | detail | 核对当前用户的基础、权限和登录信息 |
| 2 | `user-detail-actions` | action | 返回用户管理列表 |

## 信息层级

- 第一优先级：快速核对用户详情
- 次级信息：查看用户归属和最近登录时间

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 返回列表（`back-user-list`） | 详情内容底部右侧 | 返回用户管理列表 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `user-detail` | detail-page | explicit | 需求明确要求进入用户详情页并支持返回列表 | Descriptions | 否 |

## 状态覆盖

- loading
- error
- permission-denied

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 详情按主题分组，字段默认三列展示。 |
| Narrow | 字段降为单列并保留返回列表操作。 |

## 规范依据

- `DESIGN.md`
- `01-foundations.md`
- `02-components.md`
- `06-detail-patterns.md`
- `execution/presentation-intent.md`
- `execution/page-contract-v2.md`
- `execution/capability-model/capability-model.md`

## 规范偏离

无规范偏离。

## 需求假设

- 未提供后端接口，详情使用浏览器内演示数据；通过 URL 的 id 参数定位用户。
