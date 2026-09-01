# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：经营概览
- 页面类型：dashboard
- 页面族：dashboard
- Shell：yipex-default
- 信息密度：compact
- 原始需求：创建经营概览看板，展示核心指标、交易趋势和业务分布，支持日期范围和业务范围筛选。

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `overview-metrics` | metrics | 展示经营核心指标 |
| 2 | `overview-charts` | chart | 展示趋势和分布分析 |

## 信息层级

- 第一优先级：快速了解当前经营状态和变化趋势
- 次级信息：按日期范围切换数据范围、比较不同业务分布

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
| Desktop | 指标四列展示，趋势与分布双栏展示。 |
| Narrow | 指标单列展示，图表上下排列并保持数据可读。 |

## 规范依据

- `DESIGN.md`
- `01-foundations.md`
- `02-components.md`
- `04-dashboard-patterns.md`
- `execution/presentation-intent.md`
- `execution/page-contract-v2.md`
- `execution/capability-model/capability-model.md`

## 规范偏离

无规范偏离。

## 需求假设

- 图表使用演示数据，指标按当前展示范围汇总。
