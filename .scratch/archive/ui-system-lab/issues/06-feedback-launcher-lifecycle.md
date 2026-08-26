# 06 — 让 Feedback 与 Launcher 生命周期可审查

**What to build:** 让审查者能够触发真实的空、加载、进度、提示、保存、错误与恢复反馈，并在无业务副作用的最小 Launcher 场景中观察搜索、创建、空状态和错误状态；原生窗口生命周期继续保留给真实 Tauri 验收。

**Blocked by:** 01 — 建立 UI Lab 垂直内核并跑通 Button 双视图样例。

**Status:** completed; archived; manual acceptance transferred

- [x] StoneFlow 的 Feedback 分类可找到 Empty、Skeleton、Spinner、Progress、Alert 与 Toast，并覆盖 Pending、Disabled、Invalid、Danger、Save、Error 和 Retry 等适用语义；不适用的组合不为凑矩阵而生成。
- [x] Empty 与 Error 样例分别提供可理解的下一步和 Retry 操作；操作只改变本地 fixture 状态，不触发真实业务写入、网络请求或 Tauri Command。
- [x] Skeleton、Spinner 与 Progress 分别展示其适用的等待类型，包含确定与不确定进度的必要示例，且不会在同一场景无意义堆叠多种加载指示。
- [x] Alert 与 Toast 的信息、成功、警告和错误层级可被触发和辨认；Toast 可关闭、可再次触发，切换到其他样例后不残留 Portal、计时器、全局监听器或遮挡。
- [x] Disabled、Invalid 与 Danger 样例提供状态文字、可访问名称、角色和键盘检查路径，使审查者能够判断真实组件是否过度依赖颜色；不符合预期时作为发现记录，Lab 不伪造通过，也不在本 ticket 修复产品组件。
- [x] 最小 Launcher 场景可在搜索、创建、空状态和错误状态之间切换，并能在长中文与窄容器下检查视觉层级、恢复动作和跨窗口一致性的可移植部分。
- [x] Launcher 的窗口激活、原生快捷键、真实创建流程、WebView 边界和跨窗口状态明确标为“仅真实应用验证”，Lab 不实现替代协议或假 Tauri 环境。
- [x] 每个反馈及 Launcher 样例显示 owner、责任层、适用状态和 Lab/真实应用边界，能够通过目录与搜索定位；发现项仍进入既有本地 ticket 流程，而不是记录在 Lab 内。
- [x] 完成该 ticket 复用真实反馈组件与最小 fixture，不建设第二套通知系统、不新增依赖，也不顺手修改产品反馈文案、视觉规则或 Launcher 业务逻辑。
