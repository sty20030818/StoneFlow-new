# page-frame · 工作区页面骨架

`PageFrame` 是工作区页面的纯视觉组合层。

## 职责

- 固定 Header、Toolbar、可滚动 Body 的页面区域顺序；
- 通过 compound components 让页面显式组合所需区域；
- 复用 `MainCard` 的滚动、间距与可访问性基础。

## 边界

- 不依赖任何 `features/**`；
- 不接收实体 DTO、业务 Board 选择器、数据状态、query 或 mutation；
- 不分发 Task、Project 或 Lifecycle Board；
- 页面必须直接渲染领域 Board，并由所属 Feature 管理其加载、空态、错误和操作。

## API

```tsx
<PageFrame.Root>
  <PageFrame.Header breadcrumb={breadcrumb} actions={actions} />
  <PageFrame.Toolbar pills={pills} filterAction={filterAction} displayAction={displayAction} />
  <PageFrame.Body>{children}</PageFrame.Body>
</PageFrame.Root>
```

`Toolbar` 在没有任何内容时不渲染。可见操作必须由页面提供真实行为，不在框架内补默认按钮。
