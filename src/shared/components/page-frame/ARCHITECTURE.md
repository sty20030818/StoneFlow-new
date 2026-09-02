# page-frame · 工作区页面骨架

`PageFrame` 是工作区页面的深布局 Module。

## 职责

- 固定 Header、HeroUI Toolbar、Toolbar 外 FilterBar、可滚动 Body 的页面区域顺序；
- 通过 compound components 让页面显式组合所需区域；
- 普通 `Body` 直接拥有 HeroUI `ScrollShadow`，集合 `CollectionBody` 通过 `AppScrollArea` 暴露唯一真实 viewport；
- 统一页头、工具栏、间距与滚动协议，不经过转发层。

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
  <PageFrame.CollectionBody>{board}</PageFrame.CollectionBody>
</PageFrame.Root>
```

`Header` 接受 `title` 或 `breadcrumb`；`Toolbar` 在没有任何内容时不渲染。Default View、Filter 与 Display 进入同一个有名称的水平 HeroUI `Toolbar`，由上游负责标准方向键导航；Default View 的受控单选真相仍属于调用方。`filterBar` 保持在工具条外。Task Workspace、Project Overview、Archive 与 Trash 使用 `CollectionBody` 的同一 viewport / inset / overflow 合同；普通内容页继续使用 `Body`。可见操作必须由页面直接组合 HeroUI 与真实行为，框架不提供视觉 wrapper 或默认按钮。
