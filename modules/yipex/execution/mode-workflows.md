# YiPex 快捷模式工作流

本文件只适用于显式 `/yipex:fast` 和 `/yipex:prd`。未使用快捷命令时，继续执行 `SKILL.md` 中的受控自然语言页面生成流程。

## `/yipex:fast`

1. 保留命令后的原始需求，按 `auto` 策略运行一次能力与 Recipe 路由。
2. 命中已实现 Recipe 且需求能力均已实现时，沿用对应标准脚手架、Page Spec、构建器和静态检查。
3. 未命中 Recipe、包含未实现能力或无法由现有配方覆盖时，回退开放式 Page Contract；不得为了套用配方改写业务需求。
4. 交付 `page-spec.json`、`preview.html` 和轻量检查结果；视觉、交互、响应式和业务语义仍标记为人工验收。

## `/yipex:prd`

1. 读取 `modules/yipex/product/prd-standard.md`，严格保留模板章节、顺序和固定表格。
2. 将命令后的原始需求写入 `changes/YYYYMMDD-功能名称/requirement.md`，缺失信息使用 `[待确认：具体问题]`，不得编造结论。
3. 只交付 `requirement.md` 和必要的交付记录，不生成 `page-spec.json`、`preview.html` 或页面实现。
4. 页面设计和实现需求留给后续 `/yipex:page` 或 `/yipex:fast`，不在 PRD 模式中提前替代。
