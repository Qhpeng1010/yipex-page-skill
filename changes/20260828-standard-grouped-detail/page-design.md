# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：商户详情
- 页面类型：detail
- 页面族：detail
- Shell：yipex-default
- 信息密度：compact
- 原始需求：创建一个商户详情页，展示经营指标、基础信息、负责人信息和最近交易记录。

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `merchant-detail` | detail | 分组展示商户完整资料 |
| 2 | `recent-transactions` | table | 展示商户最近交易记录 |

## 信息层级

- 第一优先级：快速核对商户经营和归属信息
- 次级信息：查看关键经营指标、核对最近交易记录

## 页面操作

本页未声明页面级操作。

## 展现模式决策

本页未记录需要单独说明的展现模式决策。

## 状态覆盖

- loading
- error
- permission-denied

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 面包屑在独立白色详情模块外展示并在上方、左侧各保留 8px；指标在内容宽度充足时使用四列，Shell 占用空间导致单项不足以完整展示默认 Statistic 时改为两列；详情分组双列展示，关联表格横向完整展示。 |
| Narrow | 面包屑保持在模块外，指标改为单列，详情字段纵向排列，关联表格保留横向滚动。 |

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

- 页面展示脱敏演示数据。
