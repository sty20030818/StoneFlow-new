# 02 — 冻结代表性 Light 视觉合同

**What to build:** 用户能够在一组最小但完整的代表性表面上体验 StoneFlow 新的 Light-only 视觉语言，并在继续横切迁移前确认其密度、层级、排版和交互状态关系。

**Blocked by:** 01 — 贯通本机 Accent 选择

**Status:** ready-for-agent

- [ ] 代表性样本覆盖 Shell/Sidebar、MainCard/PageFrame、TaskBoard/RowShell、Command/Menu/Popover、Modal/Sheet/Detail、Settings/Form 与 Launcher，每类只选择足以冻结公共合同的最小真实表面。
- [ ] 视觉差异旋钮保持约 `4/10`：高保真借鉴 Linear 公开可见的信息层级、密度与交互关系，但不复制其私有源码、资产、字体、图标或不可验证 token，也不宣称像素级复刻。
- [ ] 所有样本使用同一套低色度暖石灰中性色、约 `8/10` 的桌面信息密度、约 `2/10` 的必要状态动效，以及适合中文扫读的排版层级。
- [ ] 主内容与当前操作、领域元信息、退后导航三层视觉权重明确；表面优先通过间距、明度和必要弱边界分层，阴影仅用于确需 elevation 的场景。
- [ ] 交互样本完整覆盖适用的 Rest、Hover、Pressed、Selected、Selected + Hover、Focus-visible、Selected + Focus-visible、Open、Disabled、Loading、Invalid/Danger 与 Context-menu target。
- [ ] Selected、Open 与 Focus 保持为独立信号；指针 Hover 不伪装成 Focus，组合状态不会互相覆盖。
- [ ] 小图标保持紧凑但不缩小命中目标；常用控件、普通文字、非文本边界与 Focus 指示满足相应对比度要求。
- [ ] 六个 Accent 只通过共享语义角色改变样本中的主要动作、选择、链接与 Focus，不出现按组件或页面分叉的色值。
- [ ] 样本验证不改变现有信息架构、路由、键盘行为、选择目标、TaskBoard 测量几何、详情状态或 Tauri 窗口生命周期。
- [ ] 评审记录明确哪些关系成为全局语义值、哪些成为公共组件 recipe、哪些仍属于产品结构或动态几何，且不建立新的长期原型系统。
