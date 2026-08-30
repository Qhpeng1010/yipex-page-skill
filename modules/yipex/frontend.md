# YiPex Frontend Contract

- 标准页面组件使用 Ant Design 官方组件及其公开 API，不重新实现或重皮肤 Button、Input、Table、Modal、Drawer、Tabs、Form 等已有组件。
- 默认使用 `modules/yipex/shell/` 提供的 YiPex Shell；业务代码只挂载到 `#yipex-page` 内容插槽。
- 不在 Change 内修改 Shell 文件；需要调整整体框架时单独更新 Shell 目录并记录版本。
- 生成代码引用目标项目已有的 Ant Design 依赖，不在 skill 内复制 `antd` 源码、CSS、vendor 或组件文档。
- 如果当前环境没有目标项目的 Ant Design 运行时，独立预览可使用 `modules/yipex/shell/vendor/` 中锁定的官方 UMD 运行时；生产页面仍接入目标项目已有的 `antd` 和 `@ant-design/icons` 依赖，不手写替代组件。
- 独立预览可通过官方 Ant Design Icons CDN 加载图标用于验收；生产页面仍优先使用目标项目已有的 `@ant-design/icons` 依赖。
- `page-spec.json` 是唯一编辑源；HTML、CSS 和 JavaScript 均为派生产物。
- 允许自定义业务组件和交互；标准组件的根节点外观默认保持官方实现，Modal/Drawer 实现 `modules/yipex/design-system/director-rules/01-visual-constitution.md` 的共享组件契约。其他非标准外观必须在 `contract.deviations` 中明确记录，并能在静态检查中识别页面根结构、组件 ID 和脚本语法。
- 演示数据必须与真实数据区分，不把演示交互描述成已接入后端。
- 默认验收仅运行基础静态检查，不启动浏览器、不截图、不执行像素比较或点击流程。
- 视觉、响应式、交互体验和业务口径由人工验收；除非用户明确要求，不得把这些项目记录为自动验收通过。
