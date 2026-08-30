# Vendor

本目录存放 YiPex 独立预览所需的本地运行依赖：

- React 18 / ReactDOM 18
- Ant Design 5 与 reset CSS
- Day.js 与中文语境
- `@ant-design/icons` UMD 包

预览页不使用 CDN，也不从其他业务模块跨目录引用 vendor 文件。升级依赖时需同时验证 Shell 图标、Ant Design 组件和中文语境。
