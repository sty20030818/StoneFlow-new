# HeroUI v3 Checkbox 原生 UI/UX 与 StoneFlow 覆盖研究

> 日期：2026-08-27
>
> 研究问题：HeroUI v3 Checkbox 的原生结构、状态视觉与动画是什么；StoneFlow 当前为何出现额外边框；怎样保留 HeroUI 原生 UI/UX，只替换 StoneFlow 的颜色和圆角
>
> 资料范围：当前安装的 `@heroui/react@3.2.4`、`@heroui/styles@3.2.4`、`react-aria-components@1.20.0`，HeroUI 与 React Aria 官方文档/源码，以及 StoneFlow 当前仓库
>
> 本文只做一手资料研究与实现边界建议，不修改产品组件或 CSS。

## 结论

1. **用户的观察是对的：HeroUI v3.2.4 原生 Checkbox 在 Hover 时不会给整段标签或控件外面新增一圈框。**Hover 只改变 16px `Checkbox.Control` 的 `border-color`，并在已选中时把填充色切到 `--accent-hover`；HeroUI 默认主题把 field border 宽度设为 `0px`，所以默认站点上 Hover 基本看不到新边框。[HeroUI Checkbox 官方样式](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/checkbox.css)、[HeroUI 默认主题变量](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/themes/default/variables.css)
2. StoneFlow 当前 JSX 已经是正确的 HeroUI v3 compound anatomy；视觉不原生主要不是 JSX 问题，而是全局主题把 HeroUI 默认的 **`0px field border + 轻 field shadow`** 改成了 **`1px field border + 无 field shadow`**。这让 Hover 的 border-color 变化变成肉眼可见的框。[`theme.css`](../../src/styles/theme.css)
3. 另一个“整行外框”来自 StoneFlow 的全局焦点规则：它会给所有 `[data-focus-visible="true"]` 元素画 inset keyline；React Aria 恰好把该属性放在可点击的 `<label>`（`Checkbox.Content`）上，因此标签容器也被画框。HeroUI 原生只把 Focus ring 画到 `Checkbox.Control`，不会给整段 Content 画框。[`components.css`](../../src/styles/components.css)、[React Aria Checkbox 源码](https://github.com/adobe/react-spectrum/blob/5ecb3333001313e83898cd07644227897e3bae1f/packages/react-aria-components/src/Checkbox.tsx)
4. **推荐合同**：HeroUI/React Aria 持有 DOM、语义、可点击标签、键盘行为、状态属性、Focus owner、伪元素与动画；StoneFlow 只通过语义颜色和 radius token 换肤。不要重写 Checkbox 的尺寸、填充伪元素、勾号路径、Hover/Pressed/Selected/Focus 状态机或 transition。
5. 为了先“还原原生再判断”，UI Lab 的 Checkbox 应先恢复 HeroUI primary 的 border/shadow 几何，删除 Content 上的额外 keyline，同时保留 Control 的键盘 Focus ring。圆角第一轮保持原生 `6px`；确认原生外观后，再单独比较 StoneFlow 已有的 `4px` 与 `6px`，不要同时改多项视觉参数。

## 一、版本与一手来源

当前仓库锁定：

| 包 | 当前版本 | 证据 |
| --- | --- | --- |
| `@heroui/react` | `3.2.4` | [`package.json`](../../package.json)、[`bun.lock`](../../bun.lock) |
| `@heroui/styles` | `3.2.4` | [`package.json`](../../package.json)、[`bun.lock`](../../bun.lock) |
| `react-aria-components` | `1.20.0` | [`package.json`](../../package.json)、[`bun.lock`](../../bun.lock) |

HeroUI `v3` 分支当前根版本也是 `3.2.4`，与本仓库安装版本一致。[HeroUI 官方仓库 `package.json`](https://github.com/heroui-inc/heroui/blob/v3/package.json)

本文采用以下一手来源：

- [HeroUI Checkbox 官方文档](https://heroui.com/en/docs/react/components/checkbox)
- [HeroUI Checkbox React 源码](https://github.com/heroui-inc/heroui/blob/v3/packages/react/src/components/checkbox/checkbox.tsx)
- [HeroUI Checkbox CSS 源码](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/checkbox.css)
- [HeroUI 默认主题变量](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/themes/default/variables.css)
- [HeroUI Focus utility](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/utilities/index.css)
- [HeroUI v3.2.0 复合结构发布说明](https://heroui.com/en/docs/react/releases/v3-2-0)
- [React Aria Checkbox 官方文档](https://react-aria.adobe.com/Checkbox)
- [本仓库实际安装的 React Aria 1.20.0 对应源码提交](https://github.com/adobe/react-spectrum/blob/5ecb3333001313e83898cd07644227897e3bae1f/packages/react-aria-components/src/Checkbox.tsx)

## 二、HeroUI v3.2.4 的原生 anatomy 与 DOM

HeroUI 官方 compound anatomy 是：

```tsx
<Checkbox>
	<Checkbox.Content>
		<Checkbox.Control>
			<Checkbox.Indicator />
		</Checkbox.Control>
		Label
	</Checkbox.Content>
	<Description />
	<FieldError />
</Checkbox>
```

其中：

| HeroUI part | 实际元素 | 职责 |
| --- | --- | --- |
| `Checkbox` | `<div data-slot="checkbox">` | field 状态与 Description/Error 关联，不是焦点元素 |
| `Checkbox.Content` | `<label data-slot="checkbox-content">` | 整段可点击区域，接收 Hover、Pressed、Focused、Focus-visible 等 React Aria 状态 |
| 隐藏 input | `<input type="checkbox">` | 原生表单、键盘焦点和可访问性语义 |
| `Checkbox.Control` | `<span data-slot="checkbox-control">` | 16px 可视方框；HeroUI 把 Hover、Selected、Focus 等视觉投影到这里 |
| `Checkbox.Indicator` | `<span data-slot="checkbox-indicator">` | 12px 指示器容器，内部为默认勾号或半选线 |

HeroUI 3.2 使用 React Aria `CheckboxField + CheckboxButton`：`Checkbox.Content` 是可点击 `<label>`，`Description` 和 `FieldError` 是它的兄弟节点。控制器、label 行为与隐藏 input 都不应由 StoneFlow 重新实现。[HeroUI v3.2.0 发布说明](https://heroui.com/en/docs/react/releases/v3-2-0)、[HeroUI Checkbox 源码](https://github.com/heroui-inc/heroui/blob/v3/packages/react/src/components/checkbox/checkbox.tsx)

React Aria 在 `<label>` 上输出：

- `data-hovered`
- `data-pressed`
- `data-focused`
- `data-focus-visible`
- `data-selected`
- `data-indeterminate`
- `data-disabled` / `data-readonly` / `data-invalid`

其中 `data-focused` 表示鼠标或键盘均可产生的普通 focus，`data-focus-visible` 专指应显示键盘焦点的状态。[React Aria Checkbox 官方 API](https://react-aria.adobe.com/Checkbox)、[React Aria Checkbox 源码](https://github.com/adobe/react-spectrum/blob/5ecb3333001313e83898cd07644227897e3bae1f/packages/react-aria-components/src/Checkbox.tsx)

## 三、原生视觉与动画状态矩阵

下表来自当前 3.2.4 官方 CSS；“外框”必须按状态和 owner 区分。

| 状态 | 原生 owner | 原生视觉 | 是否应有额外框 |
| --- | --- | --- | --- |
| Rest / 未选中 | `Control` | `16×16px`、`rounded-md`、field background、primary field shadow | 没有 Content 外框；默认主题 field border 为 `0px` |
| Hover / 未选中 | `Control` | `border-color` 切换为 `--field-border-hover`；填充伪元素仍为 `opacity: 0` | 没有 Content 外框；默认 `0px` border 下不会突然出现可见边框 |
| Hover / 已选中 | `Control::before` | 已显示的填充从 `--accent` 过渡到 `--accent-hover` | 没有额外框 |
| Pressed | `Content` 输出状态，`Control` 接收 selector | 3.2.4 普通 Checkbox 的 Pressed block 为空；半选状态按下时使用 `--accent-hover` | 没有 Pressed 外框或额外缩放 |
| Selected | `Control::before` + `Indicator` | border 透明；填充由 `scale: .7 / opacity: 0` 过渡到 `scale: 1 / opacity: 1`；勾号描边出现 | 没有额外边框 |
| Keyboard focus-visible | `Control` | `Checkbox.Content[data-focus-visible]` 触发 Control 的 `status-focused`，即 2px focus ring | **有且只应有 Control 的 Focus ring** |
| Pointer focus | 隐藏 input / Content state | 有 `data-focused`，但通常没有 `data-focus-visible` | 不应出现键盘 Focus ring |
| Disabled | Checkbox field | 整体 opacity 降低、cursor disabled、pointer events none | 没有新框 |
| Invalid / 未选中 | `Control` | danger outline；聚焦后 danger ring | 这是校验状态，不是 Hover 框 |
| Invalid / 已选中 | `Control::before` + `Indicator` | danger 填充与 danger foreground | 没有 Content 外框 |

动画细节：

- Control 的 background、border 分别以 `200ms var(--ease-out)` 过渡；transform 声明了 `100ms` transition，但普通 Pressed 状态没有设置 transform。
- 选中填充伪元素以 `100ms linear` 改变 scale、`200ms linear` 改变 opacity、`200ms var(--ease-out)` 改变 background。
- 默认勾号通过 `stroke-dashoffset` 绘制，选中时为 `150ms linear 15ms`。
- Control、填充伪元素和勾号都声明了 reduced-motion 下关闭 transition 的规则。

这些状态、伪元素和 transition 已经构成完整 recipe。StoneFlow 若重新实现“一个蓝色方块 + 一个 SVG”，会丢掉这套状态一致性；只换 token 才能保留上游行为。[HeroUI Checkbox 官方样式](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/checkbox.css)

## 四、为什么 StoneFlow 当前看起来不像原生

### 1. “Hover 多一圈框”的直接原因是 field border/shadow 几何被改了

HeroUI 与 StoneFlow 当前值：

| 变量 | HeroUI light 默认 | StoneFlow 当前 | Checkbox 结果 |
| --- | --- | --- | --- |
| `--field-border-width` | `0px` | `1px` | StoneFlow Rest/Hover 有真实 1px 方框；HeroUI 默认没有 |
| `--field-shadow` | 三层轻阴影 | `0 0 0 transparent` | StoneFlow 去掉原生 primary 的轻浮起感，边框更突出 |
| `--ring-offset-width` | `2px` | `0px` | StoneFlow Focus ring 贴住控件，不再留原生间隙 |
| `--radius-md` | `6px` | `6px`（映射到 `--radius-control`） | 当前 Checkbox 圆角实际上没有比原生更小 |
| `--accent` 等颜色 | HeroUI 默认蓝 | StoneFlow 当前 Accent preset | 选中、Hover、Focus 使用 StoneFlow 颜色；这是期望的品牌换肤 |

因此当前 Checkbox 虽然使用原生 React 组件，**视觉 recipe 已不再是原生**。最明显的差异不是动画，而是全局 field 几何 token。[HeroUI 默认主题变量](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/themes/default/variables.css)、[`theme.css`](../../src/styles/theme.css)

### 2. “整段标签多一个框”的原因是全局 Focus selector 选中了状态载体

StoneFlow 当前公共规则：

```css
[data-theme="stoneflow-light"] :where(:focus-visible, [data-focus-visible="true"]) {
	box-shadow: inset 0 0 0 1px var(--focus);
}
```

React Aria 把 `data-focus-visible="true"` 放到 `Checkbox.Content` 的 `<label>` 上；HeroUI 自己再通过祖先 selector 把视觉 ring 画到 `Checkbox.Control`。因此公共规则会产生两个 owner：

1. StoneFlow 给 Content label 画整段 inset keyline；
2. HeroUI 给 16px Control 画原生 focus ring。

UI Lab 当前 [`focus-owners.css`](../../src/ui-lab/focus-owners.css) 已将 Checkbox Content 的 `box-shadow` 设为 `none`，这个方向正确：它只删除错误的 Content keyline，Control ring 仍由 HeroUI 保留。该文件不处理 Hover border，因此不能单独恢复原生 Hover 外观。

### 3. 用户看到的两个“框”必须分开判断

- 如果框包住“控件 + 文字”整行：这是 StoneFlow 的全局 focus owner 错误，不是 HeroUI 原生。
- 如果框只贴着 16px Checkbox 且仅在 Tab 后出现：这是 HeroUI 的 Control focus ring，属于必要的键盘焦点提示，不应删除。
- 如果鼠标 Hover 未选中的 16px Checkbox 时边缘明显变深：这是 StoneFlow `1px field border` 使上游 Hover border-color 变得可见；HeroUI 默认主题是 `0px`。

## 五、推荐的长期边界

### HeroUI / React Aria 持有

- compound anatomy 与真实 DOM；
- 隐藏原生 input、label 点击范围、键盘 Space、表单与 ARIA；
- Hover、Pressed、Focused、Focus-visible、Selected、Indeterminate、Disabled、Invalid 状态；
- Control 的 `::before` 填充、默认 Indicator、勾号绘制动画；
- transition、easing、reduced-motion；
- Focus ring 应画到哪个 part。

### StoneFlow 持有

- `--accent`、`--accent-hover`、`--accent-foreground`、`--focus` 等语义颜色；
- 圆角 token，以及经 UI Lab 确认后对公开 BEM part 的集中 radius recipe；
- 产品布局与文案。

### StoneFlow 不应继续持有

- 每个 Checkbox 实例的 `className` 拼装；
- 自定义勾号尺寸/路径、填充 inset、scale 或 opacity；
- Checkbox 专用 Hover/Pressed/Selected 状态机；
- 给所有 `[data-focus-visible]` 状态载体无差别画框。

这与现有架构方向一致：`theme.css` 是语义 token owner，`components.css` 是共享 HeroUI BEM/data-state recipe owner；feature 和 sample 不维护私有皮肤。

## 六、落地选项与取舍

### 方案 A：UI Lab 先精确恢复 HeroUI Checkbox（当前推荐）

做法：

- JSX 保持官方 compound anatomy，不加 Control/Indicator 私有 class；
- 在 UI Lab 边界内恢复 Checkbox primary 的 HeroUI 默认 field border/shadow；
- 继续禁止 Content label 的额外 keyline；
- 保留 HeroUI Control focus ring、选中填充、勾号动画与 reduced-motion；
- 颜色继续继承 StoneFlow Accent；第一轮圆角保持上游 `6px`。

优点：能先得到可信的“原生基线”，一次只判断一类差异。缺点：Lab 中 Checkbox 会暂时与 StoneFlow 当前全局 field border/shadow 不同；这正是审查需要暴露的差异，不应伪装成已经全局统一。

### 方案 B：立即全局恢复 HeroUI field 几何

做法：把 `--field-border-width`、`--field-shadow`、`--ring-offset-width` 一起改回上游默认。

优点：最符合“原生 UI/UX + StoneFlow 颜色/圆角”。缺点：会同时改变 Input、Select、DatePicker 等大量表单控件，超出当前 Checkbox 校准范围；必须在 UI Lab 完成字段族状态复审后作为单独任务实施。

### 方案 C：保留当前 1px border，只去掉 Content 框

优点：改动最小、与当前 StoneFlow 表单边界一致。缺点：它无法还原 HeroUI 官网的 Checkbox Hover，正是用户当前不满意的结果；不推荐作为原生基线。

## 七、圆角决策

HeroUI Checkbox 在 16px Control 上使用 `rounded-md`；上游默认与 StoneFlow 当前都解析为 `6px`，所以视觉上接近圆角矩形。StoneFlow 已有的相邻候选只有：

- `--radius-sm: 4px`：更接近正方形，但用户上一轮已经认为偏小；
- `--radius-control: 6px`：当前值，也是 HeroUI 原生 Checkbox 值。

因此第一轮应保持 `6px`，先确认 border/shadow 与 focus owner 修正后是否已经自然。只有在原生基线仍显得过圆时，再比较 `4px` 与新的共享选择控件半径；不要在 Checkbox sample 中硬编码 `5px`，除非 Checkbox/Radio 等真实家族共同需要并通过审查。

## 八、验收判据

UI Lab 的 Checkbox 恢复可按以下顺序肉眼验收：

1. Rest 未选中：没有突出的 1px 灰框，保留 HeroUI primary 的轻微 field shadow。
2. Pointer Hover：没有 Content/标签外框；未选中不突然多一圈框，已选中只改变填充色。
3. Pointer Click：选中填充从中心展开，勾号按原生路径绘制；普通鼠标焦点不显示键盘 ring。
4. Keyboard Tab：只在 16px Control 周围出现一个清晰 Focus ring，不包住文字或 Description。
5. Space：原生切换状态，动画与点击一致。
6. Reduced motion：状态仍清楚，但 transition 被关闭。
7. Disabled、Indeterminate、Invalid：继续使用 HeroUI 原生状态结构，只继承 StoneFlow 语义颜色。

结论一句话：**先恢复 HeroUI 的 Checkbox recipe，再只换 StoneFlow 的颜色与经过审查的圆角；不要把 StoneFlow 全局 field border 或全局 focus selector 误认成“HeroUI 原生”。**
