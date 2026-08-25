# 01 — 恢复 HeroUI 原生滚动系统

**What to build:** 让主页面、任务长列表和详情正文重新使用浏览器原生滚动能力与 HeroUI 主题滚动条，同时完整保留 TaskBoard 的虚拟化、sticky、折叠、续页和滚动定位体验；不再由 StoneFlow 绘制或拖拽第二套 scrollbar thumb。

**Blocked by:** None — can start immediately.

**Status:** completed; archived; manual acceptance transferred

- [x] 主页面、TaskBoard 和详情正文使用 HeroUI 主题滚动条；只有已经批准的窄区域可以显式隐藏滚动条。
- [x] AppScrollArea 暴露的 forwarded ref 与 viewport context 仍指向同一个真实 overflow 节点，页面中不存在第二个滚动 owner。
- [x] TaskBoard 的虚拟化、sticky 顶替、分组折叠、续页 placeholder、滚动位置和焦点桥行为保持不变。
- [x] 仓库中不再存在第一方 scrollbar thumb、pointer drag、ResizeObserver、MutationObserver 或 requestAnimationFrame 滚动条状态机。
- [x] 全局隐藏原生滚动条的规则以及只为自绘滚动条服务的结构 hook、测试 mock 和零消费者出口全部删除。
- [x] 相关架构文档明确由浏览器负责滚动、HeroUI Styles 负责外观、StoneFlow 只保留 viewport contract。
- [x] 相关行为测试与根级前端门禁通过；无法自动证明的 macOS WKWebView 和 Windows WebView2 滚动体验明确保留为真实应用验收项。
