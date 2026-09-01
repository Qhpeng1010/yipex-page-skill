# YiPex 视觉宪法

本文件是 YiPex 视觉 Token、组件外观和全局视觉决策的唯一维护入口。页面 Pattern 只引用这里的规则，不重复定义相同数值或组件皮肤。

## 规则等级

- `MUST`：安全、可访问性、信息真实性和核心可用性底线，不得通过页面偏好绕过。
- `DEFAULT`：缺少更强业务或用户证据时采用的 YiPex 默认方案；可以被明确需求覆盖并记录偏离。
- `HEURISTIC`：帮助理解自然语言和选择表现形式的判断依据，不是能力边界。

## 产品气质

**YP-VIS-001 `DEFAULT`** YiPex 是清晰、克制、可信且任务导向的跨境业务后台。视觉层级优先帮助用户理解业务对象、完成操作和判断状态，不把业务页面做成营销页、装饰性大屏或卡片陈列页。

**YP-VIS-002 `MUST`** 页面标题区只显示主标题和必要操作，不生成、推断、改写或默认补充副标题、页面描述、场景摘要、引导语或标题下说明；即使用户提供了背景性描述，也应将其作为需求上下文理解，不把它自动呈现在标题下。表单帮助、校验错误、错误恢复、Result 原因以及任务区域内由业务明确要求的必要文案不属于标题区副描述。其他说明、卡片、阴影、强调色和动效只在有助于判断或操作时使用；Shell、导航或首个业务模块已提供充分上下文时，业务内容直接开始。

## 视觉 Token

**YP-VIS-003 `MUST`** 本节是颜色、字体、字号、圆角、阴影、尺寸和间距的唯一数值来源。需求确实需要新值时，可以先在当前页面使用，但必须在 `page.extensions.presentationDecisions` 和 `contract.deviations` 中记录证据、原因与范围；高频稳定偏离再升级为共享 Token。

### 色彩

| Token | Value | Usage |
| --- | --- | --- |
| Brand Green / 品牌绿 | `#4AA52E` | 品牌识别、品牌强调、核心绿色状态 |
| Auxiliary Green / 辅助绿 | `#52BF63` | 次级绿色强调、辅助状态、装饰 |
| Primary Action / 主操作色 | `#222222` | 主操作按钮、主视觉强调 |
| Text Title / 标题文字 | `rgba(0,0,0,.85)` | 标题、主要内容 |
| Text Secondary / 二级文字 | `rgba(0,0,0,.65)` | 通用二级文字 |
| Text Tertiary / 次级文字 | `rgba(0,0,0,.45)` | 低优先级信息 |
| Text Disabled / 占位与禁用 | `rgba(0,0,0,.25)` | Placeholder、Disabled |
| Neutral 1 / 白色 | `#FFFFFF` | 页面和组件背景、反色文字 |
| Neutral 5 / 边框灰 | `#D9D9D9` | 输入框和控件边框 |
| Divider / 分割线灰 | `#E7E8E8` | 业务区域之间的轻分割线 |
| Selection Surface / 选中底色 | `#F5F5F5` | 表格行、下拉选项和卡片的选中背景 |
| Selection Surface Hover / 选中悬停底色 | `#EDEDED` | 选中项 hover 或相邻状态反馈 |

品牌绿和辅助绿不得无目的大面积使用，也不得默认替代主操作色。弱信息优先通过已有文字透明度建立层级，不随意新增灰色色值。

### 字体

- 字体链：`Roboto, "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`。
- 中文使用 `PingFang SC`，英文与数字优先使用 `Roboto`；常规体使用真实字重 `400`，默认字间距为 `0`。

| Style | Size | Weight | Line Height |
| --- | ---: | ---: | ---: |
| Page Title / 页面标题 | 20px | 500 | 28px |
| Module Title / 模块标题 | 16px | 500 | 24px |
| Body / 正文 | 14px | 400 | 22px |
| Auxiliary / 辅助信息 | 12px | 400 | 20px |

### 形状、效果与尺寸

- Input 与 Button 圆角为 `8px`，Modal 为 `12px`，Small Control 为 `4px`。
- 主按钮阴影为 `0 2px 0 rgba(0,0,0,.04)`。
- Pop-over / Modal 阴影依次为 `0 9px 28px 8px rgba(0,0,0,.05)`、`0 6px 16px 0 rgba(0,0,0,.08)`、`0 3px 6px -4px rgba(0,0,0,.12)`。
- 常规输入、选择、按钮、日期和分页使用 Ant Design `size="middle"`，基准高度为 `32px`；非默认尺寸记录 deviation。
- 后台内容区默认内边距为 `24px`。
- 核心间距节奏为 `8 / 12 / 16 / 24 / 32 / 48px`：小元素使用 `8px`，列表标题与表格使用 `12px`，表单项使用 `16px`，页面与弹层内容使用 `24px`，表单与操作区使用 `32px`，主要模块使用 `48px`。

## 组件契约

**YP-VIS-004 `DEFAULT`** 标准控件优先使用 Ant Design 官方组件、API、语义和状态。现有组件不能表达新业务能力时，允许组合官方原语或使用 `custom` / `extensions` 扩展，不得因为没有现成组件条目而拒绝需求。

- 文本、密码、选择、日期、表格、分页、弹层、状态和空反馈分别使用对应的 Ant Design 官方组件。
- 主操作使用 `Button type="primary"`，次操作使用 `default`、`text` 或 `link`；保留 Ant Design 中文双字按钮自动插入字符间空格的默认行为，不在 Page Spec 文案中手写空格。
- `default` 辅助按钮默认使用白色背景；仅在 `hover` 时使用 `#F5F5F5` 灰色底，`active` 使用 `#EDEDED`，`focus` 保持白底并显示规范焦点态。必须显式覆盖 Ant Design 默认蓝色 hover/focus token，Portal 渲染的 Modal/Popconfirm 按钮也要覆盖，不能只依赖页面内 `ConfigProvider`。
- 普通文字按钮按文案和官方水平内边距自适应，不设置无业务意义的固定宽度或额外最小宽度。
- `Statistic` 固定单位写在标题中，使用 `标题 (单位)`，数值区不重复单位，也不通过私有 CSS 重写官方结构。
- 只读详情默认使用 `Descriptions bordered={false}`；独立页默认三列，Modal / Drawer 默认两列，窄屏回到单列，长内容可以跨整行。
- Table 正文使用 Body 字体；固定单位写在表头，金额与数量右对齐，状态列默认使用 Badge 状态点加文字，操作列文字与表头左对齐。
- 二次确认的普通确认按钮使用 Primary Action / `#222222`；禁用、取消、删除等危险或不可逆操作使用 Ant Design `danger` 语义色，取消按钮保持官方中性色。

### Modal 与 Drawer

- Modal 保留 header、body、footer 三段结构；header 底部和 footer 顶部使用 `1px` Divider。
- Modal body 与 Drawer body 四向内边距为 `24px`，不得把该内边距加到最外层 content 或 wrapper。
- Modal 和 Drawer footer 操作右对齐，次操作在左、主操作在右。
- Drawer 标题位于左侧，关闭图标位于最右侧；只读详情沿用 Descriptions 基本形态。
- 宽度、placement 和是否提供 footer 由页面任务决定；改变上述共享外观时记录 deviation。

**YP-VIS-005 `DEFAULT`** 主操作、品牌识别、业务状态和辅助强调保持不同语义；不为追求品牌感大面积使用品牌色，也不引入与 YiPex 冲突的随机颜色、字号、圆角或阴影。

## 信息层级与密度

**YP-VIS-006 `DEFAULT`** 后台页面优先保证扫描、比较和连续操作效率。业务对象、主要结果和当前任务先于装饰性说明；同层内容稳定对齐，长内容可换行、展开、复制或在局部区域滚动，不遮挡关键字段和操作。Card 只用于真正需要边界的重复项或工具，不堆叠嵌套卡片。

**YP-VIS-007 `HEURISTIC`** Card、Table、Modal、Drawer、选择形态和自定义可视化由任务、内容关系、来源上下文和用户明确表达共同决定。自然语言中的明确要求优先；高置信度推断和 Pattern 默认分别记录为 `inferred-high` 与 `pattern-default`，不把单一关键词当成唯一证据。

卡片选择仅在用户明确要求，或同时具备 2–6 个选项、明确单选/多选且每项包含标题与说明等高置信度证据时启用；交互语义仍使用 Radio / Checkbox，普通枚举保持标准控件。

## 响应式与可访问性

**YP-VIS-008 `MUST`** 页面在桌面和窄屏下都必须保持核心任务可读、可操作且不重叠。响应式可以改变列数、排列和局部滚动方式，但不得改变字段含义、金额口径、权限边界或隐藏唯一操作路径。

**YP-VIS-009 `MUST`** 控件必须具有明确名称、键盘路径和可见焦点；错误、禁用、选中、告警和业务状态不能只依赖颜色。图标操作提供可访问名称，动态反馈不应无故抢夺焦点。

## 开放演进

**YP-VIS-010 `MUST`** 视觉规范约束质量，不限制业务功能。新自然语言、新页面结构或新能力未命中现有 Pattern 时，继续使用开放 Page Contract 实现；只有法律、安全、权限、信息真实性和可访问性底线可以阻止不合规的表现方式。

**YP-VIS-011 `MUST`** 页面根节点在桌面和大屏下必须占满 Shell `content` 插槽的可用宽度，不得用固定 `max-width` 居中后让表格、图表、表单模块、详情模块或状态容器两侧出现无意义空白。需要控制阅读行长时，只限制说明文字、单列字段组或 Result 文案等内部阅读单元；外层页面和业务区域仍保持全宽。超宽屏默认从 `1920px` 视口开始调整网格密度，不通过放大字号、控件高度或间距填充空间。
