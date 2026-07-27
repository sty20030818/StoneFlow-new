> 版本：v2
> 作用：定义 `src/styles` 当前已经落地的样式体系边界
> 适用范围：`/Users/stonefish/Desktop/StoneFlow/src/styles` 及所有消费这些样式的前端代码
> 最后更新：2026-07-28

---

## 1. 当前真实心智

StoneFlow 的样式体系当前不是“页面里随手写几个 className”，也不是“shadcn 变量就是最终真相源”。

当前正式分层是：

```txt
primitive tokens
-> semantic tokens
-> layout tokens
-> shadcn adapter
-> Tailwind v4 entry
-> base rules / utilities
-> shared/components / layout / feature UI
```

最重要的结论：

1. StoneFlow token 才是产品视觉真相源
2. shadcn token 是基础组件语义映射，不是产品布局真相
3. 页面层应尽量消费语义化 token 和已有 pattern，而不是直接堆原始色值

---

## 2. 当前目录结构

```txt
src/styles/
├── ARCHITECTURE.md
├── index.css
├── fonts.css
├── base.css
├── utilities.css
├── adapters/
│   └── shadcn.css
└── tokens/
   ├── primitive.css
   ├── semantic.css
   ├── layout.css
   └── dark.css
```

当前 `index.css` 的真实 import 顺序是：

```txt
tailwindcss
-> tw-animate-css
-> fonts.css
-> tokens/primitive.css
-> tokens/semantic.css
-> tokens/layout.css
-> tokens/dark.css
-> adapters/shadcn.css
-> base.css
-> utilities.css
```

这个顺序本身就是样式边界的一部分，不要随意打乱。

---

## 3. 各层职责

### 3.1 `tokens/primitive.css`

primitive token 只表达原始值。

当前真实内容包括：

1. 字体族
2. neutral palette
3. brand / warning / success / danger / info
4. shadow primitives
5. overlay primitive
6. motion primitives

禁止在这一层出现：

1. `shell`
2. `sidebar`
3. `task-row`
4. `button-primary`

### 3.2 `tokens/semantic.css`

semantic token 表达通用视觉语义。

当前真实分组包括：

1. text
2. icon
3. surface
4. border
5. interactive text
6. accent
7. focus
8. status
9. overlay and shadow

这一层不绑定具体产品结构。

### 3.3 `tokens/layout.css`

layout token 表达 StoneFlow 产品结构语义。

当前真实分组包括：

1. shell
2. header / sidebar / footer
3. main content
4. shared control surfaces
5. reusable list surfaces
6. shared geometry and motion

这一层已经明确包含：

1. `--sf-shell-bg`
2. `--sf-sidebar-active`
3. `--sf-main-bg`
4. `--sf-control-bg`
5. `--sf-shell-sidebar-reserved-width`（运行时由 SidebarProvider 写入；默认数值见 `shared/lib/shellSidebarGeometry.ts`）

因此页面或 layout 层优先消费 layout token，而不是跳回 primitive 值。

### 3.4 `tokens/dark.css`

`dark.css` 当前是 dark 扩展层。

它的职责是为未来模式扩展预留一致落点，而不是让页面层各自补 dark 变量。

### 3.5 `adapters/shadcn.css`

这一层负责把 StoneFlow token 映射给 shadcn / Tailwind 语境。

规则：

1. StoneFlow token 是上游真相源
2. shadcn token 是语义映射
3. 页面不应反向用 shadcn token 取代产品 token

### 3.6 `base.css`

`base.css` 只负责全局基础行为：

1. reset
2. 全局基线
3. 默认 element 行为

不负责页面专属外观。

### 3.7 `utilities.css`

`utilities.css` 只放少量跨页面 utility。

不要把 feature 专属 utility 累积成第二套设计系统。

---

## 4. 当前消费关系

当前消费链路是：

```txt
styles/tokens
-> shared/components/base
-> shared/components/patterns
-> layout
-> feature UI
```

典型事实：

1. `shared/components/base/*` 复用 shadcn + Tailwind 基础能力
2. `shared/components/patterns/*` 承接 StoneFlow 的结构化视觉模式
3. `layout` 与 feature UI 优先消费这些 pattern 和 token

所以如果某个视觉模式已经在 `shared/components/patterns` 存在，就不应回到页面里重新写一遍。

---

## 5. 当前正式规则

### 5.1 先判断归属，再写样式

写样式前先判断：

1. 是原始值？
2. 是通用视觉语义？
3. 是产品结构语义？
4. 是共享 UI pattern？
5. 还是某个页面的一次性组合？

不要一上来就在页面里写原始值。

### 5.2 产品布局优先用 layout token

Shell、sidebar、footer、main、list row 这类产品结构，优先用：

1. `--sf-shell-*`
2. `--sf-sidebar-*`
3. `--sf-main-*`
4. `--sf-control-*`
5. `--sf-list-*`

### 5.3 shadcn 是基础组件映射，不是产品布局真相

保留 `bg-background`、`text-foreground` 这类 utility 的目的，是让 base primitive 稳定工作。

但：

1. 整个 shell 背景不应只靠 `--background`
2. sidebar active 不应只靠 shadcn card token
3. 产品级布局外观应回到 StoneFlow token

---

## 6. 依赖方向

当前允许：

```txt
primitive -> semantic -> layout -> shadcn adapter -> base/pattern consumers
```

当前禁止：

1. 页面 className 直接写大量原始十六进制色值
2. 业务组件自己定义一套平行 token
3. base primitive 反向知道 task/project 语义
4. 把页面一次性样式写回 token 层

---

## 7. 新增样式的落点规则

新增样式时按这个顺序：

1. 新原始值：`tokens/primitive.css`
2. 新通用视觉语义：`tokens/semantic.css`
3. 新产品结构语义：`tokens/layout.css`
4. shadcn/Tailwind 映射：`adapters/shadcn.css`
5. 全局基础行为：`base.css`
6. 少量全局 utility：`utilities.css`
7. 可复用结构模式：`shared/ui/patterns/*`
8. 最后才是页面或 feature 里的局部组合

---

## 8. 架构不变式

以下情况应直接视为回退：

1. 页面重新散落写原始色值
2. `shared/ui/base` 开始承载业务语义
3. 产品结构颜色直接绑死到 shadcn token
4. feature 为了局部需求新增一整套私有 token 命名
5. `styles/index.css` import 顺序被打乱，导致真相源层级失效

---

## 9. 推荐验证

文档或样式架构改动后，至少核对：

1. `index.css` import 顺序未漂移
2. token 层级仍然是 primitive -> semantic -> layout
3. layout/UI 代码没有新增明显的原始色值回退
4. 文档里不再残留旧仓库路径
