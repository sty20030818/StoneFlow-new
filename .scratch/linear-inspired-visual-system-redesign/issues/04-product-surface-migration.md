# 04 — 横切迁移 StoneFlow 产品表面

**What to build:** 用户在 Shell、任务集合、浮层、详情、设置和 Launcher 之间获得同一套 StoneFlow 视觉关系，而既有产品结构、领域操作与桌面窗口行为保持不变。

**Blocked by:** 03 — 完成 HeroUI OSS/Pro 公共皮肤 Hard Cut

**Status:** ready-for-agent

- [ ] Shell/Sidebar、MainCard/PageFrame、TaskBoard/RowShell、Command/Menu/Popover、Modal/Sheet/Detail、Settings/Form 与 Launcher 全部消费统一语义主题与公共组件 recipe。
- [ ] 产品组件只保留稳定结构、业务语义和必要动态几何；feature 不再定义通用 Button、Field、List、Menu、Modal 或 Sheet 的私有皮肤。
- [ ] 各集合页的 Header、Toolbar、Filter、Display 与 Body 使用一致的高度、对齐、文字层级和控制关系。
- [ ] RowShell 的选择、焦点、打开详情与 Context-menu target 状态彼此可辨，并继续与 Command Runtime、ActionBar 和直接快捷键使用同一目标合同。
- [ ] TaskBoard 的虚拟滚动、分组、折叠、sticky header、分页占位、测量高度、滚动定位与容器查询行为不因视觉迁移改变。
- [ ] Command、Menu 与 Popover 保留搜索、快捷键、禁用原因、危险动作、Overlay 行为及焦点恢复；打开 ContextMenu 不改变既有选择。
- [ ] Task Detail 的 Aside、Sheet 与完整页继续共享同一 URL、草稿、自动保存和详情状态，只统一容器视觉。
- [ ] Settings 与 Launcher 不建立页面私有主题；Main 与 Launcher 在默认及非默认 Accent 下呈现一致的视觉基线。
- [ ] 产品表面不残留重复原始颜色、按 Accent 标识分支或针对单页打补丁的通用控件样式。
- [ ] 现有路由、键盘、选择、Overlay、详情、虚拟化与 Launcher 生命周期测试继续通过。

