# YiPex Detail Page Pattern

本文件是 `detail` 页面族的按需参考，只定义独立详情、分组详情和关联明细的特有结构。Overlay 与独立页选择遵循导演规则 02，通用交互遵循 03。

## 适用范围

- 适用于查看一条业务记录的完整信息、状态、关联对象和处理入口。
- 编辑任务进入 Form Pattern；详情页可以提供编辑入口，但不在只读字段中直接混入输入控件。

## 推荐骨架

```text
Detail
├── Breadcrumb (independent page)
├── Summary or Metrics (optional)
├── Detail Sections
├── Related Table (optional)
├── Actions (optional)
└── Feedback
```

- 独立详情使用真实可返回的 Breadcrumb。位置已经明确时，不再重复增加页级标题、状态、副描述或返回按钮。
- 详情按业务主题分组，使用 `Descriptions bordered={false}` 或清晰字段组合。
- 只有一个详情分组时不增加分割线；两个及以上分组时使用 01 的 Divider 分隔相邻分组，不给整个详情容器增加边框。
- Label、中文冒号和内容同行；长内容可以跨整行。独立页默认三列，Modal/Drawer 默认两列，窄屏回到单列。
- 指标和关联列表只在帮助判断或处理当前记录时出现。
- 独立详情页根节点和详情模块占满 Shell 内容槽；大屏仍保持默认三列 Descriptions 语义，指标和关联 Table 使用完整可用宽度，不用页面级固定最大宽度制造外侧空白。

## 页面族特有交互

| 交互 | 页面族特有结果 |
| --- | --- |
| 返回来源 | 返回原列表或 Dashboard，并恢复 Contract 声明的上下文 |
| 刷新详情 | 更新字段、业务状态、时间和可用操作 |
| 进入编辑 | 携带记录 ID 和返回上下文进入 Form |
| 执行业务操作 | 更新详情状态、处理记录和可用操作 |
| 浏览关联列表 | 只更新关联区域，主详情保持可用 |

- 空字段使用统一占位；不存在的可选分组可以省略，请求失败不能伪装成空值。
- 时间、金额、编号和参考信息保留可复制文本。
- 窄屏下字段改为单列；关联 Table 保留区域内部横向滚动。

## 变体

- Basic Detail
- Grouped Detail
- Detail + Metrics
- Detail + Related Table
