# YiPex Shell

Shell 是 YiPex 页面固定的应用框架层，对应设计稿中业务内容区域以外的部分：顶部品牌与功能区、左侧导航、页面 Footer 和主内容插槽。

生成业务页面时只编辑 `page-spec.json` 的 `page.root` 内容树，不重绘 Shell。目标应用中的标准控件使用 Ant Design 官方组件，图标使用 `@ant-design/icons`；本目录只保存框架结构和主题样式，不复制 Ant Design 源码或 vendor。

Shell 插槽包括 `brand`、`navigation`、`header`、`footer` 和 `content`。整体采用上下结构：顶部导航固定高度 `52px`，背景为 `#F0F0F0`，底部有 `1px` 灰色分割线；Logo 宽度为 `85px` 并保持原比例，功能、消息和个人信息位于右上角，消息只显示铃铛图标，不显示数字气泡。功能、消息、账号下拉和收起按钮使用图标，文字通过悬停气泡（`title`）提供。Shell 固定为一屏高度，浏览器页面本身不滚动；顶部栏和左侧导航保持在框架层，只有右侧工作区允许纵向滚动。

下方左侧导航默认宽度为 `200px`，右侧有 `1px` 灰色分割线，收起按钮固定在左下角；导航文字使用 `Body`（14px/22px、400），活动项也不加粗。导航采用 `demand-scoped` 模式：单页面只显示“首页 + 当前业务菜单”，当前业务菜单激活；首页类页面只显示并激活“首页”。不得复制完整示例目录，也不得展示与当前需求无关的历史菜单。组合页面的子页面仍使用首页和所属业务菜单，跨页面关系由 Page Composition 与转场声明表达。

导航项必须可点击；点击非当前项时更新活动项和地址 hash，并在 `#yipex-page` 内容区显示对应菜单标题与 Ant Design `Empty`（描述为“暂无数据”）空状态。导航项的 `icon` 使用官方图标组件名；没有显式指定时由生成器按当前业务语义选择图标。

Footer 位于右侧可滚动工作区的内容流末尾并居中对齐：短页面时处于工作区底部，长页面时跟随内容自然滚动，不固定悬浮。版权文字使用 `Auxiliary`（12px/20px、400）和现有弱文字色。工作区四周保留 `12px` 灰色留白，作为页面边界。Footer 默认显示 `Copyright Somei E-Commerce Limited 2025. All rights reserved`。Content 是白色业务内容模块。只有构建预览或修改框架时才读取 Shell 的 CSS 和运行时文件；独立 HTML 预览通过 `data-antd-component` 和 `data-antd-icon` 标记集成点，目标应用应将它们映射为真实的 Ant Design 组件。独立预览使用本目录 `vendor/` 中锁定的 React、ReactDOM、Ant Design、dayjs、中文 locale 和 `@ant-design/icons` 本地资源，不依赖 CDN。
