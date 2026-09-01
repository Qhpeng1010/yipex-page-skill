# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：提交结果
- 页面类型：result
- 页面族：result
- Shell：yipex-default
- 信息密度：compact
- 原始需求：创建标准提交结果页，支持成功、失败、处理中三种状态和重试、返回操作。

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `result-content` | result | 反馈提交处理状态和下一步操作 |

## 信息层级

- 第一优先级：让用户明确知道提交结果并继续操作
- 次级信息：失败时重试、成功后返回业务页面

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 返回（`result-action`） | 结果说明下方 | 返回上一个业务页面 |

## 展现模式决策

本页未记录需要单独说明的展现模式决策。

## 状态覆盖

- success
- error
- processing

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 结果内容居中展示，操作按钮横向排列。 |
| Narrow | 结果内容纵向居中，操作按钮自动换行。 |

## 规范依据

- `DESIGN.md`
- `01-foundations.md`
- `02-components.md`
- `07-result-patterns.md`
- `execution/presentation-intent.md`
- `execution/page-contract-v2.md`
- `execution/capability-model/capability-model.md`

## 规范偏离

无规范偏离。

## 需求假设

- 页面状态通过演示数据和 URL 参数切换。
