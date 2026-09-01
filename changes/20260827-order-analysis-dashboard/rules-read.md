# Rules Read

- `modules/yipex/DOMAIN.md`：确认自定义 Dashboard 可开放组合，标准控件优先映射到 Ant Design。
- `modules/yipex/rules-index.json`：按样式、布局、控件和查询列表信号读取新版规则。
- `modules/yipex/design-system/DESIGN.md`：采用新版生成契约、规则优先级和固定 Shell 边界。
- `modules/yipex/design-system/director-rules/01-visual-constitution.md`：采用统一视觉 Token 和 Ant Design 组件契约，包括字体、圆角、内容边距、中号控件、主操作与工具操作语义。
- `modules/yipex/design-system/03-query-list-patterns.md`：异常订单区采用平面列表、品牌绿文字操作、官方表格/分页/空状态和 16px 间距。
- `modules/yipex/execution/context-packs/layout.md`：应用后台内容区、稳定栅格和窄屏横向表格规则。
- `modules/yipex/execution/context-packs/accessibility.md`：保留 label、键盘焦点、状态文字和响应式可读性。
- `modules/yipex/execution/context-packs/components.md`：组件选择优先使用 Ant Design，图表作为明确声明的自定义业务组件。
- `modules/yipex/execution/context-packs/interaction.md`：保留筛选、空结果、导出、分页、详情和恢复路径。
- `references/antd-component-map.md`：完成页面能力到官方组件的映射。
- `modules/yipex/shell/README.md`、`shell.template.html`、`shell.css`、`shell-runtime.js`：复用固定 Shell 结构、样式与运行时。
- `modules/yipex/shell/vendor/`：独立预览使用锁定的本地 React、Ant Design、dayjs 和图标资源，不依赖 CDN。
