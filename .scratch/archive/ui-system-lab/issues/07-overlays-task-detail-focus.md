# 07 — 让 Overlays 与 Task Detail 焦点生命周期可审查

**What to build:** 让审查者能够逐个操作 StoneFlow 的非模态与模态 Overlay，验证打开、Escape、焦点陷阱、关闭和焦点恢复，并通过最小 Task Detail 路径看清可在 Lab 验证的部分与必须留在真实 WebView 验收的边界。

**Blocked by:** 01 — 建立 UI Lab 垂直内核并跑通 Button 双视图样例。

**Status:** completed; archived; manual acceptance transferred

- [x] Lab 目录可找到 Tooltip、Dropdown、Popover、Context Menu、Modal、AlertDialog、Sheet 与 Task Detail 焦点场景；每项都标明 owner、适用状态及 Lab/真实应用验证边界。
- [x] 每个适用 Overlay fixture 都提供真实的指针/键盘触发点和约定关闭动作，使审查者能够操作并记录实际打开、退出与 Escape 结果；Lab 不把所有浮层强制成同一种行为，真实组件失败也不要求在本 ticket 内修复。
- [x] Dropdown、Popover、Context Menu、Modal、AlertDialog 与 Sheet 的 fixture 提供明确触发点和关闭后的焦点观察位置，使审查者能够记录实际焦点是否返回；真实组件若丢失焦点，作为发现暴露而不是用 Lab 覆盖或顺手修复。
- [x] Modal、AlertDialog 与 Sheet 的初始焦点、Tab 循环、危险确认语义和关闭路径可在预览中操作观察；Tooltip fixture 不把完成任务所必需的信息只放在提示中。真实组件行为不符合预期时不阻塞观察面交付。
- [x] 任一时刻只有当前选中的 Overlay 场景挂载；切换场景后旧 Portal、滚动锁与全局监听不再影响当前页面。
- [x] Task Detail 条目可审查一个最小的“打开—操作—关闭—恢复焦点”路径，同时明确把真实 1024 Aside/Sheet 切换、WebView 窗口边界、草稿保留及业务数据装配标为仅真实应用验证。
- [x] 唯一 Lab 根级 DOM 集成测试只证明选择 Overlay 后仍仅挂载当前预览、切换后旧预览被卸载且 Lab 自身无残留；Escape 与焦点返回继续由既有组件 owner 测试和真实浏览器 smoke 验证，不新增逐 Demo 测试、CSS 数值断言或截图基线。
- [x] 类型、Lint、边界、格式及生产构建门禁通过；生产产物仍只有 Main 与 Launcher 入口，不包含 Lab 入口。
- [x] 真实浏览器 smoke 观察并记录指针/键盘打开、Tab、Escape、焦点恢复与窄容器结果；发现失败不阻塞观察面交付，且结果不宣称 Main/Launcher 的真实 Tauri 验收通过。
