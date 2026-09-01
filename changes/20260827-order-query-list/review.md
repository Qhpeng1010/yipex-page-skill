# Review

- 自动检查：`page-spec.json` 结构校验通过。
- 自动检查：预览存在，包含 `#yipex-page` 和固定 `data-shell="yipex-default"` Shell。
- 自动检查：Shell 运行时、React、Ant Design、dayjs 和图标脚本均可解析。
- 加载修复：CDN 依赖改为 `defer` 并行加载并增加 `preconnect`，内容区增加即时 loading 占位，Shell/业务运行时在依赖加载完成后挂载。
- 规范修复：查询条件与结果列表取消外框边线和阴影；内容区默认 `24px` 内边距且查询卡片不叠加左右内边距；标题调整为 20px 且移除副描述；查询条件区域不渲染额外标题；桌面筛选字段四列、查询/重置独占下一行右对齐；普通按钮和列表详情操作移除非必要图标。
- 规格修复：表单、按钮和分页统一使用 Ant Design middle 尺寸（32px）；条件区与列表之间增加分割线并统一 16px 间距；列表标题下取消分割线；分页统计左对齐、页码右对齐；可点击字段和列表操作使用品牌绿色。
- 间距修复：条件区移除多余的底部间距，分割线上下各保留 16px，使用 Foundations `Divider` Token（`#E7E8E8`）。
- 加载优化：vendor 运行时脚本增加 preload；业务组件在 React、Ant Design 和 dayjs 就绪后立即挂载，图标包独立异步补齐，避免图标资源阻塞首屏组件。
- 组件核对：查询表单使用 `Form`、`Input`、`Select`、`DatePicker.RangePicker`、`Button`；结果区使用 `Table`、`Pagination`、`Drawer`、`Descriptions`、`Tag`、`Empty`。
- 待人工验收：浏览器网络可用时检查 UMD 资源加载、筛选、分页、导出、抽屉和窄屏布局。
- 数据说明：当前仍为演示数据，未连接后端接口。
