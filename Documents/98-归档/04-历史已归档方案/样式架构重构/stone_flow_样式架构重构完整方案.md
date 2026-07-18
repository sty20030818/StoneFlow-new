# StoneFlow 样式架构重构完整方案

> 适用项目：StoneFlow  
> 技术栈：shadcn/ui + Tailwind CSS v4 + React / Tauri 桌面端  
> 文档目标：作为 AI 或开发者重构 StoneFlow 样式架构的执行规范。

---

# 1. 文档定位

本文档不是视觉色板，也不是完整 Design System 手册。

它的核心职责是：

1. 定义 StoneFlow 的样式分层；
2. 约束 shadcn/ui 与 Tailwind CSS v4 的集成方式；
3. 约束 AI 重构项目时的样式边界；
4. 约束 token、组件、页面之间的职责关系；
5. 减少硬编码、重复样式和随意覆盖；
6. 让 StoneFlow 后续 UI 迭代保持稳定、克制、可维护。

本文档只少量使用色值作为示例。实际开发中，颜色应该通过 token 管理，业务组件不应直接感知具体色值。

---

# 2. 重构目标

StoneFlow 当前的样式重构目标可以总结为一句话：

> 以 shadcn/ui 为基础组件层，以 Tailwind CSS v4 为样式工具层，以 StoneFlow 自定义 token 和产品组件沉淀自己的视觉语言。

具体目标如下。

---

## 2.1 建立稳定的样式分层

StoneFlow 的样式体系必须分层，不允许所有样式直接堆在组件 className 中。

推荐分层：

```txt
Primitive Tokens 原始值层
        ↓
Semantic Tokens 语义层
        ↓
Layout Tokens 布局语义层
        ↓
Component Variants 组件状态层
        ↓
Business Components 业务组件层
        ↓
Pages 页面组合层
```

每一层只做自己的事情：

| 层级 | 职责 | 是否允许业务逻辑 |
|---|---|---|
| Primitive Tokens | 存放基础视觉值 | 不允许 |
| Semantic Tokens | 表达通用 UI 语义 | 不允许具体业务逻辑 |
| Layout Tokens | 表达 AppShell / Sidebar / Main 等结构 | 允许产品结构语义 |
| Component Variants | 表达组件状态 | 允许组件状态语义 |
| Business Components | 组合业务组件 | 允许业务语义 |
| Pages | 组织页面和数据 | 不负责底层视觉规则 |

---

## 2.2 保持 shadcn/ui 原生兼容

StoneFlow 不应该重写 shadcn/ui，也不应该把 shadcn/ui 改造成强业务组件库。

shadcn/ui 负责：

- Button
- Input
- Dialog
- DropdownMenu
- Popover
- Tooltip
- Checkbox
- RadioGroup
- ScrollArea
- Skeleton
- Progress
- AlertDialog
- HoverCard
- Resizable
- 其他基础交互组件

StoneFlow 自己负责：

- AppShell
- AppHeader
- AppSidebar
- AppFooter
- MainPanel
- SidebarItem
- ProjectItem
- TaskRow
- TaskCheckbox
- CommandItem
- QuickAddInput
- TaskDetailPanel
- ProjectSection

shadcn/ui 是基础组件层，StoneFlow 组件是产品表达层。

---

## 2.3 让 Tailwind CSS v4 成为样式出口

项目使用 Tailwind CSS v4，因此 token 应该通过 CSS-first 的方式暴露给 Tailwind。

推荐方式：

```css
@theme inline {
  --color-sf-shell: var(--sf-shell-bg);
  --color-sf-main: var(--sf-main-bg);
  --color-sf-text-primary: var(--sf-text-primary);
}
```

组件使用：

```tsx
<div className="bg-sf-shell text-sf-text-primary" />
```

不要再为 Tailwind v3 写 `tailwind.config.ts` 颜色扩展方案。

---

## 2.4 减少硬编码和重复样式

业务组件中禁止出现：

```tsx
<div className="bg-[#xxxxxx] text-[#xxxxxx]" />
```

核心业务组件中也不推荐直接使用：

```tsx
bg-gray-100
text-gray-600
border-gray-200
```

原因：

1. 这些写法绕过了 StoneFlow 的样式体系；
2. 后续主题调整时难以统一替换；
3. AI 容易继续复制这种写法，导致样式失控；
4. 页面会逐渐承担设计系统职责。

允许的例外：

- 临时实验代码；
- 第三方 demo；
- 非核心 UI；
- 明确一次性视觉；
- 已经写明 TODO 的过渡代码。

但最终进入主干前，应迁移到 token 或组件 variant。

---

# 3. 样式架构总览

StoneFlow 样式架构建议如下：

```txt
src/
  styles/
    globals.css
    tokens.css
    utilities.css

  components/
    ui/
      button.tsx
      input.tsx
      dialog.tsx
      dropdown-menu.tsx
      ...

    stoneflow/
      app-shell.tsx
      app-header.tsx
      app-sidebar.tsx
      app-footer.tsx
      main-panel.tsx
      sidebar-item.tsx
      project-item.tsx
      task-row.tsx
      command-item.tsx
      quick-add-input.tsx
```

如果项目当前仍处于快速迭代期，也可以先使用更轻量结构：

```txt
src/
  styles/
    globals.css

  components/
    ui/
    stoneflow/
```

并在 `globals.css` 中通过注释分区管理：

```css
/* Tailwind */
/* Primitive Tokens */
/* Semantic Tokens */
/* Layout Tokens */
/* shadcn Token Mapping */
/* Tailwind v4 Theme Exposure */
/* Base */
/* Utilities */
```

第一阶段建议优先简单，不要一开始拆出过多 CSS 文件。

---

# 4. 核心原则

## 4.1 KISS：不过度设计系统化

StoneFlow 当前不需要做成完整企业级设计系统。

不建议一开始拆成：

```txt
design-tokens/
  primitive/
  semantic/
  component/
  alias/
  light/
  dark/
  motion/
  typography/
  elevation/
```

这会提高维护成本，也会让 AI 更容易迷路。

当前推荐：

```txt
globals.css 或 tokens.css
  primitive
  semantic
  layout
  shadcn mapping
  tailwind v4 exposure
```

等 StoneFlow 进入稳定阶段，再考虑更细拆分。

---

## 4.2 DRY：一个视觉规则只有一个来源

同一个状态不应该在多个地方重复写。

不推荐：

```tsx
<button className="hover:bg-sf-sidebar-hover" />
<a className="hover:bg-sf-sidebar-hover" />
<div className="hover:bg-sf-sidebar-hover" />
```

更推荐：

```tsx
<SidebarItem active={isActive} />
```

或者至少通过统一 variant 管理：

```tsx
sidebarItemVariants({ active })
```

---

## 4.3 单一职责：页面不负责底层视觉

页面负责：

- 数据获取；
- 状态组合；
- 路由判断；
- 页面结构；
- 业务组件组合。

页面不负责：

- 定义 hover 颜色；
- 定义 active 颜色；
- 定义基础圆角；
- 定义核心阴影；
- 定义产品级文本颜色；
- 定义全局背景。

页面应该像这样：

```tsx
<AppShell>
  <AppHeader />
  <AppBody>
    <AppSidebar />
    <MainPanel>
      <TaskList />
    </MainPanel>
  </AppBody>
  <AppFooter />
</AppShell>
```

而不是这样：

```tsx
<div className="h-screen bg-xxx text-xxx">
  <header className="bg-xxx hover:bg-xxx" />
  <aside className="bg-xxx" />
  <main className="bg-xxx" />
</div>
```

---

## 4.4 产品组件优先于页面 className

当某个 UI 结构重复出现 2 次以上，就应该考虑封装为 StoneFlow 产品组件。

典型例子：

- sidebar 导航项；
- project 项；
- task row；
- command item；
- quick add input；
- list section header；
- 空状态；
- 页面标题区。

规则：

```txt
重复结构 → 产品组件
重复状态 → cva variant
重复颜色 → token
重复布局 → layout component
```

---

# 5. Token 分层设计

StoneFlow token 分为三层：

```txt
Primitive Token
Semantic Token
Layout Token
```

---

## 5.1 Primitive Token：原始值层

Primitive Token 只保存基础值，不表达业务和组件含义。

示例：

```css
:root {
  --sf-neutral-950: /* value */;
  --sf-neutral-900: /* value */;
  --sf-neutral-700: /* value */;
  --sf-neutral-100: /* value */;
  --sf-neutral-80:  /* value */;
  --sf-neutral-20:  /* value */;
  --sf-white:       /* value */;
}
```

规则：

1. primitive token 不允许出现 `header`、`sidebar`、`button`、`task` 等语义；
2. primitive token 不应该被业务组件直接使用；
3. primitive token 只被 semantic token 或 layout token 引用；
4. primitive token 只负责“是什么值”，不负责“用在哪里”。

允许的少量色值样例：

```css
:root {
  --sf-neutral-950: #1b1b1b;
  --sf-neutral-700: #5a5a5c;
  --sf-neutral-80: #f3f3f4;
  --sf-neutral-20: #fcfcfd;
  --sf-white: #ffffff;
}
```

注意：这里只是样例。文档重点不是色值本身，而是分层和命名方式。

---

## 5.2 Semantic Token：通用语义层

Semantic Token 表达通用 UI 语义，不绑定具体布局或业务组件。

推荐分组：

```css
:root {
  /* Text */
  --sf-text-primary: var(--sf-neutral-900);
  --sf-text-secondary: var(--sf-neutral-700);
  --sf-text-strong: var(--sf-neutral-950);
  --sf-text-muted: var(--sf-neutral-700);
  --sf-text-disabled: color-mix(in srgb, var(--sf-neutral-700) 48%, transparent);

  /* Surface */
  --sf-surface-app: var(--sf-neutral-80);
  --sf-surface-panel: var(--sf-neutral-20);
  --sf-surface-raised: var(--sf-white);
  --sf-surface-hover: var(--sf-neutral-100);
  --sf-surface-active: var(--sf-neutral-100);

  /* Border */
  --sf-border-subtle: var(--sf-neutral-100);
  --sf-border-muted: var(--sf-neutral-100);

  /* Focus */
  --sf-focus-ring: var(--sf-neutral-700);
}
```

说明：

| Token | 职责 |
|---|---|
| `--sf-text-primary` | 默认正文文本 |
| `--sf-text-secondary` | 次级文本、辅助信息 |
| `--sf-text-strong` | 强调文本、标题、选中态文本 |
| `--sf-text-muted` | 弱提示文本 |
| `--sf-text-disabled` | 禁用文本 |
| `--sf-surface-app` | 应用外层背景语义 |
| `--sf-surface-panel` | 面板背景语义 |
| `--sf-surface-raised` | 抬起表面，如按钮、弹层、输入框 |
| `--sf-surface-hover` | 通用 hover 背景 |
| `--sf-surface-active` | 通用 active / selected 背景 |
| `--sf-border-subtle` | 弱边框 |
| `--sf-focus-ring` | 可访问性焦点环 |

---

## 5.3 Layout Token：产品布局层

Layout Token 表达 StoneFlow 的产品结构。

推荐：

```css
:root {
  /* App Shell */
  --sf-shell-bg: var(--sf-surface-app);
  --sf-shell-hover: var(--sf-surface-hover);
  --sf-shell-active: var(--sf-surface-active);

  /* Header */
  --sf-header-bg: var(--sf-shell-bg);
  --sf-header-hover: var(--sf-shell-hover);

  /* Sidebar */
  --sf-sidebar-bg: var(--sf-shell-bg);
  --sf-sidebar-hover: var(--sf-shell-hover);
  --sf-sidebar-active: var(--sf-shell-active);

  /* Footer */
  --sf-footer-bg: var(--sf-shell-bg);
  --sf-footer-hover: var(--sf-shell-hover);

  /* Main */
  --sf-main-bg: var(--sf-surface-panel);
  --sf-main-text: var(--sf-text-primary);
  --sf-main-hover: var(--sf-surface-hover);
  --sf-main-active: var(--sf-surface-active);

  /* Control */
  --sf-control-bg: var(--sf-surface-raised);
  --sf-control-hover: var(--sf-surface-hover);
  --sf-control-active: var(--sf-surface-active);
}
```

规则：

1. header / sidebar / footer 默认属于同一个 shell；
2. main 是独立内容面板，不直接使用 shell 背景；
3. button / input / select / trigger 等统一归入 control 语义；
4. layout token 可以被 StoneFlow 产品组件直接消费；
5. 业务页面不应该直接定义这些视觉规则。

---

# 6. shadcn/ui Token 映射

StoneFlow 必须保留 shadcn/ui 的变量体系。

shadcn 变量作为基础兼容层，StoneFlow 变量作为产品语义层。

推荐映射方式：

```css
:root {
  --background: var(--sf-main-bg);
  --foreground: var(--sf-text-primary);

  --card: var(--sf-surface-raised);
  --card-foreground: var(--sf-text-primary);

  --popover: var(--sf-surface-raised);
  --popover-foreground: var(--sf-text-primary);

  --primary: var(--sf-text-strong);
  --primary-foreground: var(--sf-surface-raised);

  --secondary: var(--sf-surface-hover);
  --secondary-foreground: var(--sf-text-strong);

  --muted: var(--sf-surface-hover);
  --muted-foreground: var(--sf-text-secondary);

  --accent: var(--sf-surface-hover);
  --accent-foreground: var(--sf-text-strong);

  --border: var(--sf-border-subtle);
  --input: var(--sf-border-subtle);
  --ring: var(--sf-focus-ring);

  --radius: 0.75rem;
}
```

关键约定：

1. `--background` 对应 main / panel 背景，不代表整个 app shell；
2. AppShell 应使用 `--sf-shell-bg`；
3. shadcn 组件继续使用 `bg-background`、`text-foreground`、`border-border` 等；
4. StoneFlow 布局组件使用 `bg-sf-shell`、`bg-sf-main` 等；
5. 不要把所有产品语义塞进 shadcn token。

---

# 7. Tailwind CSS v4 集成规范

项目固定使用 Tailwind CSS v4。

StoneFlow token 应该通过 `@theme inline` 暴露为 Tailwind utility。

---

## 7.1 推荐写法

```css
@theme inline {
  /* shadcn compatibility */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* StoneFlow text */
  --color-sf-text-primary: var(--sf-text-primary);
  --color-sf-text-secondary: var(--sf-text-secondary);
  --color-sf-text-strong: var(--sf-text-strong);
  --color-sf-text-muted: var(--sf-text-muted);
  --color-sf-text-disabled: var(--sf-text-disabled);

  /* StoneFlow layout */
  --color-sf-shell: var(--sf-shell-bg);
  --color-sf-shell-hover: var(--sf-shell-hover);
  --color-sf-shell-active: var(--sf-shell-active);

  --color-sf-header: var(--sf-header-bg);
  --color-sf-header-hover: var(--sf-header-hover);

  --color-sf-sidebar: var(--sf-sidebar-bg);
  --color-sf-sidebar-hover: var(--sf-sidebar-hover);
  --color-sf-sidebar-active: var(--sf-sidebar-active);

  --color-sf-footer: var(--sf-footer-bg);
  --color-sf-footer-hover: var(--sf-footer-hover);

  --color-sf-main: var(--sf-main-bg);
  --color-sf-main-hover: var(--sf-main-hover);
  --color-sf-main-active: var(--sf-main-active);

  --color-sf-control: var(--sf-control-bg);
  --color-sf-control-hover: var(--sf-control-hover);
  --color-sf-control-active: var(--sf-control-active);

  --color-sf-border-subtle: var(--sf-border-subtle);
  --color-sf-border-muted: var(--sf-border-muted);
}
```

---

## 7.2 使用方式

布局组件：

```tsx
<div className="bg-sf-shell text-sf-text-primary" />
```

main 面板：

```tsx
<main className="bg-sf-main text-sf-text-primary" />
```

sidebar item：

```tsx
<button className="text-sf-text-secondary hover:bg-sf-sidebar-hover hover:text-sf-text-strong" />
```

shadcn 组件：

```tsx
<div className="bg-background text-foreground border-border" />
```

约定：

- `bg-background` 用于 shadcn 语境；
- `bg-sf-main` 用于 StoneFlow main 面板；
- `bg-sf-shell` 用于 AppShell；
- 不要混用导致语义不清。

---

# 8. 全局 CSS 推荐结构

推荐 `globals.css` 初始结构如下：

```css
@import "tailwindcss";

/* -------------------------------------------------------------------------- */
/* StoneFlow Primitive Tokens                                                  */
/* -------------------------------------------------------------------------- */

:root {
  /* primitives */
}

/* -------------------------------------------------------------------------- */
/* StoneFlow Semantic Tokens                                                   */
/* -------------------------------------------------------------------------- */

:root {
  /* text */
  /* surface */
  /* border */
  /* focus */
}

/* -------------------------------------------------------------------------- */
/* StoneFlow Layout Tokens                                                     */
/* -------------------------------------------------------------------------- */

:root {
  /* shell */
  /* header */
  /* sidebar */
  /* footer */
  /* main */
  /* control */
}

/* -------------------------------------------------------------------------- */
/* shadcn Token Mapping                                                        */
/* -------------------------------------------------------------------------- */

:root {
  /* shadcn variables mapped to StoneFlow variables */
}

/* -------------------------------------------------------------------------- */
/* Tailwind CSS v4 Theme Exposure                                               */
/* -------------------------------------------------------------------------- */

@theme inline {
  /* expose tokens to Tailwind utilities */
}

/* -------------------------------------------------------------------------- */
/* Base                                                                       */
/* -------------------------------------------------------------------------- */

@layer base {
  * {
    border-color: var(--border);
  }

  html,
  body,
  #root {
    min-height: 100%;
  }

  body {
    background: var(--sf-shell-bg);
    color: var(--sf-text-primary);
    text-rendering: optimizeLegibility;
  }
}
```

原则：

1. `body` 使用 shell 背景；
2. shadcn 的 `--background` 不等于 shell 背景；
3. Tailwind utility 通过 `@theme inline` 暴露；
4. 所有 token 集中管理；
5. 全局 CSS 不写业务组件样式。

---

# 9. 布局组件规范

StoneFlow 的核心布局应统一封装。

推荐结构：

```txt
AppShell
  AppHeader
  AppBody
    AppSidebar
    MainPanel
  AppFooter
```

视觉关系：

```txt
shell：应用外层背景，包含 header / sidebar / footer
main：主内容卡片或主内容面板
```

---

## 9.1 AppShell

职责：

- 提供应用整体高度；
- 提供 shell 背景；
- 提供默认文本颜色；
- 承载 header / body / footer。

示例：

```tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-sf-shell text-sf-text-primary">
      {children}
    </div>
  );
}
```

规则：

1. AppShell 使用 `bg-sf-shell`；
2. 不使用 `bg-background`；
3. 不写具体色值；
4. 不承担业务逻辑。

---

## 9.2 AppHeader

职责：

- 顶部结构区；
- 放置 space、导航、窗口操作、搜索入口等；
- 属于 shell 的一部分。

示例：

```tsx
export function AppHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center bg-sf-header px-3">
      {children}
    </header>
  );
}
```

规则：

1. Header 背景使用 `bg-sf-header`；
2. Header 内部按钮 hover 使用 `hover:bg-sf-header-hover`；
3. Header 不应该定义 main 视觉；
4. Header 不应该直接使用具体色值。

---

## 9.3 AppSidebar

职责：

- 承载导航；
- 承载 inbox / views / projects / trash 等入口；
- 管理 sidebar 区域布局，不管理每个 item 的状态细节。

示例：

```tsx
export function AppSidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside className="w-60 shrink-0 bg-sf-sidebar px-2 py-2">
      {children}
    </aside>
  );
}
```

规则：

1. Sidebar 背景使用 `bg-sf-sidebar`；
2. Sidebar item 必须优先使用 `SidebarItem`；
3. 不允许在页面中散写 item hover；
4. 不允许每个 project item 自己定义背景状态。

---

## 9.4 MainPanel

职责：

- 承载主要内容；
- 与 shell 背景形成结构区分；
- 作为 task list、project detail、view detail 的主要容器。

示例：

```tsx
export function MainPanel({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-w-0 flex-1 bg-sf-main text-sf-text-primary">
      {children}
    </main>
  );
}
```

如果需要主内容像浮卡，可以在布局层统一处理：

```tsx
<main className="m-2 min-w-0 flex-1 rounded-xl bg-sf-main text-sf-text-primary" />
```

规则：

1. MainPanel 使用 `bg-sf-main`；
2. MainPanel 不使用 shell 背景；
3. MainPanel 的圆角和间距由布局统一决定；
4. 不在业务页面重复写 main 容器样式。

---

# 10. 产品组件规范

StoneFlow 产品组件放在：

```txt
src/components/stoneflow
```

它们可以组合 shadcn/ui，也可以消费 StoneFlow token。

---

## 10.1 SidebarItem

职责：

- 统一 sidebar 导航项；
- 管理 active / muted / disabled 状态；
- 统一 hover / active / focus 视觉。

推荐使用 `cva`：

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const sidebarItemVariants = cva(
  [
    "flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm",
    "transition-colors duration-150",
    "outline-none",
    "focus-visible:ring-1 focus-visible:ring-ring",
  ],
  {
    variants: {
      active: {
        true: "bg-sf-sidebar-active text-sf-text-strong",
        false: "text-sf-text-secondary hover:bg-sf-sidebar-hover hover:text-sf-text-strong",
      },
      muted: {
        true: "opacity-70",
        false: "",
      },
    },
    defaultVariants: {
      active: false,
      muted: false,
    },
  }
);

export interface SidebarItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarItemVariants> {}

export function SidebarItem({ className, active, muted, ...props }: SidebarItemProps) {
  return (
    <button
      className={cn(sidebarItemVariants({ active, muted }), className)}
      data-active={active ? "true" : "false"}
      {...props}
    />
  );
}
```

页面使用：

```tsx
<SidebarItem active={currentView === "inbox"}>收集箱</SidebarItem>
```

页面不需要知道 sidebar item 的 hover、active、focus 如何实现。

---

## 10.2 ProjectItem

职责：

- 展示项目入口；
- 复用 SidebarItem 的视觉逻辑；
- 额外支持 project icon、count、context menu。

推荐结构：

```tsx
export function ProjectItem({
  active,
  icon,
  name,
  count,
}: {
  active?: boolean;
  icon?: React.ReactNode;
  name: string;
  count?: number;
}) {
  return (
    <SidebarItem active={active}>
      {icon}
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {typeof count === "number" ? (
        <span className="text-xs text-sf-text-muted">{count}</span>
      ) : null}
    </SidebarItem>
  );
}
```

规则：

1. ProjectItem 不重新定义 hover；
2. ProjectItem 不直接写 active 背景；
3. ProjectItem 通过 SidebarItem 继承交互规则；
4. count / icon 只负责内容结构。

---

## 10.3 TaskRow

职责：

- 展示任务列表项；
- 管理 selected / completed / dragging 等状态；
- 提供统一行高、hover、active、文本层级。

推荐：

```tsx
const taskRowVariants = cva(
  [
    "group flex min-h-10 items-center gap-3 rounded-md px-2 text-sm",
    "text-sf-text-primary transition-colors duration-150",
  ],
  {
    variants: {
      selected: {
        true: "bg-sf-main-active",
        false: "hover:bg-sf-main-hover",
      },
      completed: {
        true: "text-sf-text-secondary opacity-70",
        false: "",
      },
      dragging: {
        true: "opacity-80 shadow-sm",
        false: "",
      },
    },
    defaultVariants: {
      selected: false,
      completed: false,
      dragging: false,
    },
  }
);
```

规则：

1. TaskRow 的 hover 使用 main 语义；
2. completed 优先使用文本层级和透明度，不新增特殊颜色；
3. selected 比 hover 稍明确，但不高饱和；
4. dragging 可以使用轻微透明和轻阴影；
5. 页面只传状态，不写视觉规则。

---

## 10.4 CommandItem

职责：

- 用于 command palette、quick switcher、quick add 建议项；
- 统一 selected / disabled / destructive 等状态；
- 保持键盘导航状态清晰。

推荐：

```tsx
const commandItemVariants = cva(
  [
    "flex h-9 items-center gap-2 rounded-md px-2 text-sm",
    "text-sf-text-primary transition-colors duration-150",
  ],
  {
    variants: {
      selected: {
        true: "bg-sf-sidebar-active text-sf-text-strong",
        false: "hover:bg-sf-sidebar-hover",
      },
      disabled: {
        true: "pointer-events-none opacity-50",
        false: "",
      },
    },
    defaultVariants: {
      selected: false,
      disabled: false,
    },
  }
);
```

规则：

1. CommandItem 可以复用 sidebar 的 selected 语义；
2. keyboard selected 必须明显但克制；
3. 不使用高饱和背景；
4. 不直接写具体色值。

---

# 11. 状态设计规范

## 11.1 Hover

hover 是弱反馈，不是强调态。

推荐规则：

| 区域 | 使用 token |
|---|---|
| Header 控件 | `--sf-header-hover` |
| Sidebar item | `--sf-sidebar-hover` |
| Main row | `--sf-main-hover` |
| Button / Control | `--sf-control-hover` |

业务组件不直接定义 hover 背景。

---

## 11.2 Active / Selected

active / selected 是当前状态，比 hover 更明确。

推荐规则：

| 区域 | 使用 token |
|---|---|
| Sidebar 当前项 | `--sf-sidebar-active` |
| Command 当前项 | `--sf-sidebar-active` |
| Main 当前行 | `--sf-main-active` |
| Control active | `--sf-control-active` |

如果现有 token 不够表达，应优先新增语义 token，而不是在组件中写临时颜色。

---

## 11.3 Focus

focus 是可访问性状态，不应该只靠背景变化表达。

推荐：

```tsx
className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
```

对于 sidebar / command 这类键盘高频区域，可以同时使用：

```tsx
className="focus-visible:bg-sf-sidebar-active focus-visible:ring-1 focus-visible:ring-ring"
```

规则：

1. focus-visible 必须可见；
2. 不要把 focus 完全等同于 hover；
3. 不要移除 focus ring 后不给替代样式。

---

## 11.4 Disabled

disabled 优先使用透明度，不新增一套 disabled 色板。

推荐：

```tsx
className="pointer-events-none opacity-50"
```

或者：

```tsx
className="text-sf-text-disabled"
```

---

## 11.5 Dragging

拖拽态应该轻，不要破坏整体视觉。

推荐：

```tsx
className="opacity-80 shadow-sm"
```

拖拽落点提示优先用 border 或背景弱变化，不使用强色块。

---

# 12. shadcn/ui 使用规范

## 12.1 components/ui 保持基础组件职责

`components/ui` 只放基础组件。

可以做：

- token 映射；
- 尺寸微调；
- variant 保持通用；
- accessibility 修正；
- 与 Tailwind v4 适配。

不应该做：

- 塞入 StoneFlow 业务 variant；
- 塞入具体页面逻辑；
- 在 Button 里加入 `sidebarActive`、`taskDone` 等业务 variant；
- 把 Dialog 改成某个业务弹窗；
- 为一个页面需求魔改全局组件。

---

## 12.2 Button variant 约束

shadcn Button 可以保留通用 variant：

```txt
default
secondary
ghost
outline
destructive
link
```

不推荐新增：

```txt
sidebar
sidebarActive
taskRow
quickAdd
projectCreate
```

这些应该由 StoneFlow 产品组件处理。

例如：

```tsx
<SidebarItem />
<TaskRowAction />
<QuickAddButton />
```

---

## 12.3 组合优先于魔改

需要业务视觉时，优先组合：

```tsx
function QuickAddButton() {
  return (
    <Button variant="ghost" className="h-8 justify-start text-sf-text-secondary">
      新建任务
    </Button>
  );
}
```

如果样式反复出现，再抽成产品组件或 cva variant。

---

# 13. 页面层规范

页面层只负责组合。

推荐：

```tsx
export function InboxPage() {
  return (
    <MainPanel>
      <PageHeader title="收集箱" />
      <TaskList />
    </MainPanel>
  );
}
```

不推荐：

```tsx
export function InboxPage() {
  return (
    <main className="flex-1 bg-xxx text-xxx">
      <div className="hover:bg-xxx active:bg-xxx">
        ...
      </div>
    </main>
  );
}
```

页面允许写：

- flex/grid 排布；
- gap；
- padding；
- width/height；
- overflow；
- 响应式布局；
- 少量一次性结构样式。

页面不建议写：

- 产品级颜色；
- 复杂 hover；
- active 状态；
- focus 视觉；
- 重复出现的 row/item 样式；
- 具体色值。

---

# 14. 命名规范

## 14.1 Token 命名

统一使用 `--sf-*` 前缀。

推荐：

```css
--sf-text-primary
--sf-text-secondary
--sf-surface-app
--sf-surface-panel
--sf-shell-bg
--sf-sidebar-hover
--sf-main-active
--sf-control-bg
```

不推荐：

```css
--gray1
--darkText
--leftMenuBg
--buttonWhite
--inboxHoverColor
```

命名原则：

1. primitive 按基础值命名；
2. semantic 按 UI 语义命名；
3. layout 按产品结构命名；
4. 不按某个页面临时需求命名；
5. 不用颜色本身作为语义名称。

---

## 14.2 Component 命名

推荐：

```txt
AppShell
AppHeader
AppSidebar
AppFooter
MainPanel
SidebarItem
ProjectItem
TaskRow
CommandItem
QuickAddInput
```

不推荐：

```txt
GrayButton
LeftButton
MyItem
CustomTask
NewCard
PrettyPanel
```

组件名应该表达职责，不表达颜色。

---

## 14.3 Variant 命名

推荐：

```txt
active
selected
completed
disabled
dragging
muted
compact
```

不推荐：

```txt
gray
white
deep
linear
pretty
cool
```

variant 表达状态，不表达视觉细节。

---

# 15. 迁移策略

## 15.1 P1：建立 token 和 Tailwind v4 出口

目标：先搭好样式底座。

任务：

1. 整理 `globals.css`；
2. 建立 primitive token；
3. 建立 semantic token；
4. 建立 layout token；
5. 建立 shadcn token 映射；
6. 使用 `@theme inline` 暴露 Tailwind utility；
7. 确认项目启动正常；
8. 暂时不大规模改业务组件。

验收：

- 项目可正常启动；
- shadcn 组件显示正常；
- `bg-sf-shell` / `bg-sf-main` 等 utility 可用；
- body 背景来自 shell token；
- main 背景来自 main token。

---

## 15.2 P2：重构 AppShell 布局

目标：统一全局布局视觉。

任务：

1. 创建 `AppShell`；
2. 创建 `AppHeader`；
3. 创建 `AppSidebar`；
4. 创建 `AppFooter`；
5. 创建 `MainPanel`；
6. 替换旧布局中的重复背景和容器样式；
7. 移除页面中的 shell/main 硬编码。

验收：

- header / sidebar / footer 视觉连成整体；
- main 与 shell 有明确结构区分；
- 页面不再重复定义 app 背景；
- 页面不再重复定义 main 背景。

---

## 15.3 P3：重构 SidebarItem / ProjectItem

目标：统一 sidebar 导航项。

任务：

1. 创建 `SidebarItem`；
2. 使用 cva 管理 active / muted / disabled；
3. 创建 `ProjectItem`；
4. 替换 inbox / views / projects / trash 等入口；
5. 删除 sidebar 中重复 hover / active className。

验收：

- sidebar item hover 一致；
- sidebar item active 一致；
- project item 与普通 nav item 风格统一；
- 页面不再定义 sidebar item 视觉状态。

---

## 15.4 P4：重构 TaskRow / CommandItem

目标：统一高频交互组件。

任务：

1. 创建 `TaskRow`；
2. 定义 selected / completed / dragging 状态；
3. 创建 `CommandItem`；
4. 定义 selected / disabled 状态；
5. 替换任务列表、搜索列表、命令面板中的重复样式。

验收：

- task row hover 一致；
- completed 表达一致；
- command selected 表达一致；
- 键盘导航焦点清楚；
- 页面只传状态，不写视觉规则。

---

## 15.5 P5：清理硬编码和重复样式

目标：让项目样式进入可控状态。

全局搜索：

```txt
#[0-9a-fA-F]
text-gray-
bg-gray-
border-gray-
shadow-lg
shadow-xl
```

处理原则：

1. 核心 UI 中的 hex 必须迁移到 token；
2. 核心 UI 中的 gray utility 应替换为 StoneFlow token；
3. 重复 row/item 样式应迁移到产品组件；
4. 大阴影应删除或降级；
5. 保留项必须有明确理由。

验收：

- 核心业务组件无直接 hex；
- 核心视觉不依赖 Tailwind gray；
- 重复样式明显减少；
- 新增样式有归属层级。

---

# 16. AI 重构执行规则

后续让 AI 按本文档重构时，必须遵守以下规则。

---

## 16.1 修改样式前先判断归属

每次新增样式前，先判断它属于哪一层：

```txt
基础值？→ primitive token
通用视觉语义？→ semantic token
产品布局语义？→ layout token
组件状态？→ cva variant
一次性布局？→ Tailwind utility
重复业务结构？→ StoneFlow 产品组件
```

不能直接跳到业务组件里写颜色。

---

## 16.2 优先级规则

样式实现优先级：

```txt
已有 StoneFlow 产品组件
  > 已有 shadcn/ui 基础组件
  > 已有 cva variant
  > 已有 Tailwind v4 utility
  > 新增 token
  > 新增产品组件
  > 临时 className
  > 硬编码样式
```

硬编码样式默认禁止。

---

## 16.3 新增 token 规则

新增 token 前必须确认：

1. 是否已有 token 可以表达；
2. 新 token 属于 primitive、semantic 还是 layout；
3. 是否会造成命名重复；
4. 是否会让视觉层级变复杂；
5. 是否值得暴露成 Tailwind utility。

不要因为某一个组件临时需要，就新增页面级 token。

---

## 16.4 新增组件规则

当以下情况出现时，应新增 StoneFlow 产品组件：

1. 同一种结构出现 2 次以上；
2. 同一种状态样式出现 2 次以上；
3. 页面 className 明显变长；
4. 业务页面开始定义 hover / active / selected；
5. AI 多次生成重复样式。

---

## 16.5 禁止事项

AI 不允许：

1. 在业务组件中直接写具体色值；
2. 在核心 UI 中随意使用 Tailwind gray；
3. 魔改 shadcn 基础组件来承载业务逻辑；
4. 给 Button 增加大量业务 variant；
5. 随意新增阴影、渐变、强边框；
6. 在页面中重复定义 sidebar item / task row 状态；
7. 为单个页面临时新增大量 token；
8. 把所有 token 都暴露成 utility；
9. 过早实现完整暗色主题。

---

# 17. 暗色主题策略

当前阶段不做完整暗色主题。

推荐策略：

```txt
先固定浅色主题
预留 data-theme 结构
不投入完整 dark mode 成本
```

可以预留：

```css
:root,
[data-theme="light"] {
  /* current light tokens */
}

[data-theme="dark"] {
  /* future */
}
```

但第一阶段不要补完整 dark token。

原因：

1. 当前最重要的是稳定浅色产品气质；
2. 暗色主题会放大 token 数量；
3. AI 容易为了兼容 dark 生成过度复杂代码；
4. 个人产品阶段应先保证主体验质量。

---

# 18. 验收清单

## 18.1 架构验收

- [ ] 项目固定使用 Tailwind CSS v4；
- [ ] 已使用 `@theme inline` 暴露 token；
- [ ] 已建立 primitive / semantic / layout 三层 token；
- [ ] shadcn token 已映射到 StoneFlow token；
- [ ] AppShell / Header / Sidebar / Footer / MainPanel 已封装；
- [ ] 高频 item / row 已通过产品组件封装；
- [ ] 页面不负责核心视觉规则。

---

## 18.2 代码验收

- [ ] 核心业务组件中没有直接 hex；
- [ ] 核心业务组件中没有随意使用 Tailwind gray；
- [ ] hover / active / selected 由 token 或 cva 管理；
- [ ] shadcn 基础组件没有被塞入大量业务逻辑；
- [ ] StoneFlow 产品组件职责清晰；
- [ ] 重复 className 明显减少；
- [ ] 新增样式能说清楚归属层级。

---

## 18.3 视觉验收

- [ ] header / sidebar / footer 是统一 shell 视觉；
- [ ] main 是独立主内容区域；
- [ ] hover 态克制；
- [ ] active 态清楚但不刺眼；
- [ ] focus-visible 清楚可见；
- [ ] 文本层级统一；
- [ ] 没有突然出现的高饱和色块；
- [ ] 没有过重阴影；
- [ ] 整体保持浅色、干净、低噪音。

---

# 19. 推荐最终落地顺序

建议按以下顺序执行：

```txt
P1：整理 globals.css，建立 token 分层和 Tailwind v4 出口
P2：映射 shadcn token，确保基础组件正常
P3：封装 AppShell / Header / Sidebar / Footer / MainPanel
P4：封装 SidebarItem / ProjectItem
P5：封装 TaskRow / CommandItem
P6：替换页面中的重复样式
P7：全局清理硬编码颜色和 Tailwind gray
P8：补充 README 或开发规范，防止后续回退
```

不要一次性重构所有组件。

优先重构最影响整体观感和重复最多的部分：

1. AppShell；
2. Sidebar；
3. MainPanel；
4. TaskRow；
5. Command / QuickAdd；
6. 其他细节组件。

---

# 20. 给 AI 的最终执行指令

后续可以直接把以下指令交给 AI：

```txt
请按照《StoneFlow 样式架构重构完整方案》重构项目样式。

项目使用 Tailwind CSS v4，不要写 Tailwind v3 配置方案。

执行要求：
1. 以 globals.css 或 styles/tokens.css 建立 StoneFlow token 分层。
2. token 分为 primitive、semantic、layout 三层。
3. 使用 @theme inline 暴露 Tailwind CSS v4 utility。
4. 保留 shadcn/ui 原生 token，并让 shadcn token 映射到 StoneFlow token。
5. 禁止在核心业务组件中直接使用具体色值。
6. 禁止在核心视觉中随意使用 text-gray-*、bg-gray-*、border-gray-*。
7. 封装 AppShell、AppHeader、AppSidebar、AppFooter、MainPanel。
8. 封装 SidebarItem、ProjectItem、TaskRow、CommandItem，并使用 cva 管理状态。
9. 页面只负责组合组件和处理业务，不负责定义 hover、active、selected 等底层视觉规则。
10. 优先保持 shadcn/ui 基础组件原生，不要把业务 variant 塞进 components/ui。
11. 当前阶段只做浅色主题，暗色主题只预留结构，不完整实现。
12. 每次新增样式前，先判断它属于 token、utility、variant、产品组件还是页面一次性布局。

执行顺序：
P1 token 和 Tailwind v4 出口；
P2 shadcn token 映射；
P3 app shell 布局；
P4 sidebar item / project item；
P5 task row / command item；
P6 清理硬编码和重复样式；
P7 验收并补充项目规范。
```

---

# 21. 一句话总结

StoneFlow 的样式重构不应该变成复杂设计系统建设，而应该是：

> 用 shadcn/ui 保持基础组件稳定，用 Tailwind CSS v4 暴露统一 utility，用 StoneFlow token 定义产品语义，用产品组件和 cva 接管重复状态，让页面回归业务组合。

