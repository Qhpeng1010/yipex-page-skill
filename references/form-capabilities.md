# YiPex 声明式表单能力

生成包含高级表单控件、字段依赖或既有 Modal 增量修改的页面时读取本文件。字段定义用于 `page.data.sections[].fields`、`page.data.steps[].fields` 和 `page.data.createFields`。

## 组件

兼容既有 `type` 写法。需要完整 Ant Design API 时使用 `component + props`：

```json
{
  "key": "merchantIds",
  "label": "适用商户",
  "component": "Select",
  "selectionMode": "multiple",
  "props": { "showSearch": true, "allowClear": true, "maxTagCount": "responsive" },
  "minSelected": 1,
  "options": [{ "value": "M001", "label": "示例商户" }]
}
```

标准运行时直接支持 Select 多选、Cascader、Checkbox/Checkbox.Group、Switch、TreeSelect、Upload、日期/时间及范围、InputNumber，以及 `form-field.schema.json` 白名单内的其他 Ant Design 表单组件。`props` 必须是 JSON 数据；事件处理器、`children` 和 `dangerouslySetInnerHTML` 不允许从 Page Spec 注入。

## 条件

`visibleWhen`、`disabledWhen` 和 `requiredWhen` 使用相同条件结构。叶子条件包含 `field`、`operator` 和可选 `value`；使用 `all`、`any`、`not` 组合：

```json
{
  "visibleWhen": {
    "all": [
      { "field": "enabled", "operator": "eq", "value": true },
      {
        "any": [
          { "field": "region", "operator": "eq", "value": "GLOBAL" },
          { "field": "channel", "operator": "in", "value": ["SWIFT", "SEPA"] }
        ]
      }
    ]
  }
}
```

可用操作符：`eq`、`neq`、`in`、`notIn`、`contains`、`notContains`、`empty`、`notEmpty`、`gt`、`gte`、`lt`、`lte`。

字段变为隐藏时默认清空值和错误；仅在业务明确要求保留时设置 `clearWhenHidden: false` 或 `preserveWhenHidden: true`。动态枚举变化后，单选失效值会被清空，多选只保留仍有效的值；`Select` 的 `tags` 模式或 `allowCustomValue: true` 保留用户输入值。

## 动态枚举

枚举数据放在 `page.data.optionSets`，字段使用 `optionsSource` 引用。`dependsOn` 按顺序从嵌套对象取值：

```json
{
  "optionSets": {
    "citiesByCountry": {
      "CN": [{ "value": "SHA", "label": "上海" }],
      "SG": [{ "value": "SIN", "label": "新加坡" }]
    }
  },
  "sections": [{
    "id": "location",
    "title": "地区",
    "fields": [{
      "key": "city",
      "label": "城市",
      "component": "Select",
      "optionsSource": { "source": "citiesByCountry", "dependsOn": ["country"] }
    }]
  }]
}
```

## 保持既有 Modal

已有页面明确要求不改变弹窗结构时，在 `page.data`、`page.data.create` 或页面根 `props` 声明 `preserveStructure: true`。渲染器必须保持原 Modal、header/body/footer 和操作顺序，不因字段数量改为 Drawer 或独立页面；超高内容在 Modal body 内纵向滚动。
