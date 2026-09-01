# Page Design

> 本文件由 `page-spec.json` 自动派生，用于追溯设计决定和规范依据。请勿单独编辑。

## 页面概况

- 页面名称：订单详情
- 页面类型：order-detail
- 页面族：detail
- Shell：yipex-default
- 信息密度：standard
- 原始需求：订单详情页：展示订单号、客户名称、订单金额、支付方式、支付状态、下单时间和收货信息，支持返回原 Tab 和原查询条件

## 页面结构

| 顺序 | 区域 | 角色 | 目的 |
| ---: | --- | --- | --- |
| 1 | `order-detail` | detail | 核对订单基础、支付和收货信息 |
| 2 | `order-detail-actions` | action | 返回原订单列表上下文 |

## 信息层级

- 第一优先级：快速核对订单详情
- 次级信息：确认订单支付状态和收货信息

## 页面操作

| 层级 | 操作 | 位置 | 结果 |
| --- | --- | --- | --- |
| 主操作 | 返回列表（`back-order-list`） | 详情内容底部右侧 | 返回原 Tab、原查询条件和原分页 |

## 展现模式决策

| 区域/组件 | 展现模式 | 置信度 | 判断证据 | Ant Design 基础组件 | 需要偏离记录 |
| --- | --- | --- | --- | --- | --- |
| `order-detail` | detail-page | explicit | 需求明确要求查看详情后返回原 Tab 和原查询条件 | Descriptions | 否 |

## 状态覆盖

- loading
- error
- permission-denied

## 响应式策略

| 视口 | 策略 |
| --- | --- |
| Desktop | 详情按基础、支付和收货主题分组，字段默认三列展示。 |
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

- 未提供后端接口，详情使用浏览器内演示数据；通过 URL 的 id 参数定位订单，return 参数保存原列表上下文。
