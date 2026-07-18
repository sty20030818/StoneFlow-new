# StoneFlow 设置侧栏与 Settings Mode 设计方案

> 版本：v1  
> 状态：设计定稿（待实现）  
> 日期：2026-07-13  
> 作用：将设置从「主内容区普通页面」升级为 Linear 式 **Settings Mode**——复用 shell sidebar 槽位为设置导航，并重排入口、分区与进出路径  
> 参考：Linear Preferences（进入设置后侧栏变身 + 顶部「返回应用」）  
> 前置文档：`Docs/U1-设计系统.md`、`Docs/P1-产品内核.md`  
> 适用范围：StoneFlow Desktop（Tauri v2）前端 shell + settings feature

---

## 0. 结论摘要

| 决策 | 内容 |
|------|------|
| 架构 | **方案 A：Sidebar Mode Swap**（进入设置后同一 sidebar 槽位切换为设置导航） |
| 入口 | **AppHeader 头像左侧齿轮** + Command / 快捷键；**不从** `h-7` footer 塞入口 |
| 退出 | 设置侧栏顶部 **「← 返回应用」**，回到进入设置前的 shell 路径 |
| Footer | **高度与职责不变**，继续只承载系统状态（同步 / 更新 / 版本） |
| App 侧栏 | **移除** footer 里的「设置」项，避免与 Header 双入口长期并存 |
| IA（V1） | 通用 · 侧边栏 · 云同步 · 更新（无团队/账号类假分区） |
| 路由 | **子路由** `settings/$section`（深链与 active 态清晰） |
| 主区 | 分区独立 panel；行式 preferences 列表，非单页巨型滚动长期形态 |
| 动效 | 骨架宽度不变；仅侧栏/主区内容轻切换 |
| 落地 | P0 壳与入口 → P1 真分区路由 → P2 快捷键与打磨 |

本方案是 **长期形态**：壳 mode、入口、IA、路由一次定清；实现可分批，但不要先做「主区内再嵌二级 nav」的过渡假壳当终态。

---

## 1. 背景与问题

### 1.1 已具备的能力

- Shell 骨架：`ShellLayout` + `SidebarProvider` + `ShellSidebar` + `ShellHeader` + `ShellFooter` + `ShellMain`
- 设置路由：`/settings` → `/all/settings`，以及 space 作用域下 `…/settings`
- 设置页：`SettingsPage` 单页长滚动，含 Sidebar 主入口 / 辅助入口 / 项目分区 / 默认空间 / 云同步 / 更新
- 侧栏设置入口：`SHELL_SETTINGS_ITEM` 挂在 `ShellSidebar` 的 `SidebarFooter`（与归档、回收站同列）
- 侧栏配置状态：`useSidebarSettingsStore` + 设备偏好（宽度、collapse 等）
- Header 右侧已有头像 cluster（`shellChromeAvatarClusterClass`）
- Footer 为 **h-7 系统状态轨**（同步 + 更新事务 + 版本），非导航栏

### 1.2 当前瑕疵

| 问题 | 说明 |
|------|------|
| 设置仍是「普通 section 页」 | 进设置后 App 侧栏仍在，心智是「又一个列表页」，不是配置空间 |
| 入口位置混杂 | 设置与归档/回收站同列；Footer 又无高度可学 Linear 左下角 |
| 单页过长 | 侧栏可见性、空间、同步、更新挤在一屏，扫描成本高 |
| 无返回设置态 | 没有「离开设置回到刚才工作上下文」的一等入口 |
| 与 U1 气质半对齐 | U1 参考 Linear 的秩序与密度，但设置信息架构未吸收「mode 切换」 |

### 1.3 目标

1. **Mode 清晰**：进入设置 = 侧栏变设置目录 + 主区变对应 panel  
2. **入口克制**：Header 一处主入口，不抬高 footer，不破坏状态轨  
3. **进出可预期**：返回应用恢复工作路径；再进设置可落上次分区  
4. **IA 真实**：只放有真实能力的分区，不做空壳 Linear 仿品  
5. **结构复用**：宽度、collapse、mobile drawer、token 与现有 sidebar 体系共用  
6. **可演进**：后续快捷键 / 导入导出 / 外观 可按同一侧栏 IA 挂载

### 1.4 非目标（本阶段）

- 账号 / Profile / 团队 / Billing / API / 通知等协作型设置  
- 整页独立 Settings 壳（替换整个 shell chrome）  
- 为塞左下角入口而增加 footer 高度  
- 设置内搜索（可后续加，V1 不阻塞）  
- 主题/字体等尚无后端能力的外观项硬上 UI  
- 移动端单独设计体系（沿用现有 mobile drawer 行为即可）

---

## 2. 现状 vs Linear 对照

| 维度 | 现在 StoneFlow | Linear（参考） | 本方案目标 |
|------|---------------|----------------|------------|
| 入口 | 侧栏 footer「设置」 | 侧栏左下 Settings | Header 头像旁齿轮 |
| 侧栏 | 进设置后仍是 App 导航 | 整侧栏变设置导航 | **Mode Swap** |
| 顶栏 | 无「返回应用」 | Back to app | **← 返回应用** |
| 主区 | 单页长滚动 | 左目录 + 右 panel | 子路由 panel |
| Footer | h-7 状态条 | 不承担导航 | **保持状态条** |

Linear 可吸收：

- 进入设置后 **侧栏职责切换**
- 顶部 **返回应用**
- 分区 label + 列表导航 + 右栏分组表单

Linear 不吸收：

- 团队 / 工作区管理 / 计费等企业分区  
- 过强的「工程管理后台」信息架构  

对齐 P1：个人桌面执行工具，不是协作后台。

---

## 3. 架构方案比选

### 3.1 方案 A — Sidebar Mode Swap（采纳）

```text
App Mode                          Settings Mode
┌──────────┬──────────────┐       ┌──────────┬──────────────────┐
│ Space    │              │       │ ← 返回应用 │                  │
│ Inbox    │   Main       │  →    │ 设置       │  Settings Panel  │
│ Projects │              │       │ · 通用     │                  │
│ Archive  │              │       │ · 侧边栏   │                  │
│ (无设置) │              │       │ · 云同步   │                  │
└──────────┴──────────────┘       └──────────┴──────────────────┘
     footer 状态条不变                  footer 状态条不变
```

**优点**

- 骨架稳定（符合 U1「Sidebar / Main 结构不频繁变化」）
- 与现有 `SidebarProvider` / 宽度 / rail / mobile 兼容
- 心智与参考图一致
- 退出只需回到 App Mode，不必新 layout 体系

**成本**

- 需由 route 派生 `shellMode`
- 现有 `SettingsPage` 需拆 panel + 子路由

### 3.2 方案 B — Main 内二级导航（不采纳为终态）

侧栏仍是 App 导航；主内容左侧再嵌 settings sub-nav。

- 改动小，但是双导航、「壳中壳」
- 与参考目标不一致

### 3.3 方案 C — 独立全屏 Settings 壳（不采纳）

`/settings` 替换整个 shell。

- 隔离彻底，但丢掉工作台连续感
- 返回路径、command、footer 都要重接
- 与 U1 结构稳定原则更远

### 3.4 决策

**采纳方案 A。** 入口放 Header，不抬高 footer。

---

## 4. 入口设计

### 4.1 主入口：Header 头像左侧

```text
[ 全局搜索 … ]          [ 新建任务 ▾ ]  [ ⚙ 设置 ]  [ 头像 ]
```

| 项 | 规范 |
|----|------|
| 位置 | `shell-header-right`，头像 cluster **左侧** |
| 控件 | `icon-sm` ghost / 与 chrome icon action 同系 |
| 图标 | `Settings2Icon`（与现有设置语义一致） |
| a11y | `aria-label="设置"`；tooltip「设置」；可选展示 `⌘,` |
| 点击 | 进入设置（默认分区或 `lastSettingsSection`） |
| 状态 | 已在 Settings Mode 时，按钮可为 active / 或不再重复高亮（二选一，实现时定一种并测） |

### 4.2 次级入口（保留）

| 入口 | 行为 |
|------|------|
| Command Palette | 「打开设置」；可扩展「打开设置 · 云同步」等 |
| 键盘 | `Cmd + ,`（macOS 习惯；Windows 可用 `Ctrl + ,`，与命令系统表对齐） |
| 深链 | `/all/settings/...` 或 space 作用域等价路径 |

### 4.3 移除 / 收敛

| 项 | 决策 |
|----|------|
| App 侧栏 footer「设置」 | **移除**（`SHELL_SETTINGS_ITEM` 不再渲染在 App sidebar） |
| Footer 加高塞设置 | **禁止** |
| 仅藏在头像下拉 | **不作为唯一入口**（多一步，设置变二级） |
| 双入口过渡期 | 若需兼容可短期保留侧栏项，但 **目标态只保留 Header + 命令**；文档默认目标态 |

### 4.4 为何不放 footer

- `ShellFooter` 是 **系统状态轨**（同步灯、更新、版本），不是导航栏  
- `h-7` 无法舒适承载 40×40 命中区的设置按钮  
- 抬高 footer 会压缩主工作区，违背「不愿意增加高度」的约束  

---

## 5. 进入 / 退出与状态

### 5.1 进入

1. 用户点击 Header 齿轮 / `Cmd+,` / Command / 深链  
2. 路由进入 `settings`（可带 section）  
3. **同一布局帧内**：侧栏切换为 `SettingsSidebar`，主区渲染对应 panel  
4. 记录：
   - `returnPath`：进入前最后一条 **可记忆的 non-settings** shell path  
   - 可选：进入瞬间的 scope（all / space）

### 5.2 退出

| 动作 | 行为 |
|------|------|
| 「← 返回应用」 | `navigate(returnPath)`；若无效则 startup fallback / 当前 scope 默认 section |
| 壳后退（History Back） | 与 route history 一致；若上一帧就是设置内分区，则在设置内后退 |
| Esc | **可选 P2**：无弹层抢焦点时 Esc = 返回应用；必须排在 drawer / dialog / command 之后 |

### 5.3 粘性状态

| 状态 | 用途 | 建议存储 |
|------|------|----------|
| `returnPath` | 返回应用 | 会话级即可（内存 / shell nav store）；刷新后可用 history 或 scope 默认 |
| `lastSettingsSection` | 再次进入设置的默认分区 | 设备偏好（与 sidebar width 同类）或 session；V1 可用 session |

### 5.4 Settings Mode 下的行为边界

| 能力 | 行为 |
|------|------|
| App 主导航 / Space switcher / 项目列表 | **不展示** |
| 设置侧栏导航 | 展示 |
| ShellFooter | **照常**（同步/更新仍可从状态轨操作） |
| Command / 新建任务 | **仍可用**（设置是配置态，不是阻断模态） |
| Task Drawer | 若从深链以外进入，默认关闭；不在设置内打开业务 drawer |
| Sidebar collapse | 见 §7.3 |

---

## 6. 信息架构（IA）

### 6.1 V1 侧栏结构

```text
┌─────────────────────────┐
│ ← 返回应用               │
│                         │
│ 设置                     │  ← 区域标题（非 nav item）
│                         │
│ 偏好                     │  ← section label
│   ○ 通用                 │
│   ○ 侧边栏               │
│                         │
│ 数据                     │
│   ○ 云同步               │
│   ○ 更新                 │
└─────────────────────────┘
```

### 6.2 分区 ↔ 现有内容映射

| 侧栏 key | 标题 | 迁入内容（现有） | 主控件形态 |
|----------|------|------------------|------------|
| `general` | 通用 | 默认空间 | Select 行 |
| `sidebar` | 侧边栏 | 主入口可见性、辅助入口、项目分区（显示/已完成/数量） | 分组 switch 列表 |
| `sync` | 云同步 | Turso 配置、策略、立即同步、诊断折叠 | 现有 sync 区块收敛为 panel |
| `update` | 更新 | `UpdateSettingsSection` | 独立 panel |

### 6.3 分区原则

1. **按用户任务分**，不按代码模块硬切  
2. 一项设置只属于一个分区  
3. **无真实能力不挂空壳**（外观 / 快捷键 / 导入导出等有能力再挂）  
4. 危险/破坏性操作（若未来有）靠下、二次确认  

### 6.4 明确不做的分区（V1）

- Profile / Notifications / Connected accounts  
- Teams / Workspace / Members / Security / API / Billing  
- Issues / Projects / Labels 等 Linear 业务配置仿品  

### 6.5 预留扩展位（不实现，只占 IA 约定）

| key | 条件 |
|-----|------|
| `appearance` | 主题 / 字号等有持久化能力后 |
| `shortcuts` | 命令与快捷键可配置后 |
| `import-export` | 有导入导出能力后 |

---

## 7. 设置侧栏 UI 规范

### 7.1 结构

```text
SettingsSidebar
├── Header: BackRow（← 返回应用）
├── Title: 「设置」
├── NavGroup「偏好」
│   ├── general
│   └── sidebar
└── NavGroup「数据」
    ├── sync
    └── update
```

### 7.2 视觉与交互

| 项 | 规范 |
|----|------|
| 组件复用 | `Sidebar` / `SidebarHeader` / `SidebarMenu` / `SidebarMenuButton` 等现有 primitive |
| BackRow | ghost 行；左 `ChevronLeft` +「返回应用」；行高命中区 ≥ 40px |
| 区域标题「设置」 | 略强于 section label；`text-wrap: balance` 不需要（短词） |
| Section label | muted、小字号、适度 tracking；与 App 侧栏 group label 同源 |
| Nav item | 与 Inbox 等 **同密度、同 active 态**；禁止另起紫光/粗彩条 |
| 图标 | 可选；V1 建议带 lucide 小图标以利 icon-rail，但展开态不抢文案 |
| 底条 | **不**再挂 `SyncSidebarStatusStrip`（footer 已有同步状态，避免双份） |
| 空状态 | 无 |
| 搜索 | V1 不做；预留 Header 下方插槽即可 |

### 7.3 Collapse / Icon rail

| 策略 | 说明 |
|------|------|
| **推荐 V1** | 进入 Settings Mode 时若 desktop collapsed，**自动展开**；退出后恢复进入前 preference |
| 备选 | Settings Mode 允许 icon rail：仅图标 + tooltip，隐藏 group label |
| Mobile | 沿用 drawer；打开设置时 drawer 显示 SettingsSidebar；返回应用可关闭 drawer 或保持，实现时与现网 mobile 习惯对齐 |

### 7.4 主区 panel 形态

Linear 式 preferences：

```text
标题（如「侧边栏」）
简短 description（一行 helper）
────────────────────────────────
分组 1 标题（可选）
  行：label + helper + control
  行：…
分组 2
  行：…
```

| 项 | 规范 |
|----|------|
| 布局 | 单列，最大内容宽约 `40–44rem`，左对齐于 main 内容区 |
| 行 | 左文案、右控件；窄屏改为上 label 下 control |
| 控件 | Switch / Select / Button；少用大面积 checkbox 卡片网格 |
| 校验文案 | 行下或分组下 `StatusNotice` compact（沿用现有至少保留一个主入口等规则） |
| 保存 | 现有「即时写入」模式保持；不引入统一 Save 条，除非某 panel 需要事务性提交（sync 配置 dialog 已有） |

---

## 8. 路由设计

### 8.1 目标路径（示意）

在现有 `_shell` 作用域下：

```text
/_shell/all/settings                  → redirect → …/settings/general（或 lastSection）
/_shell/all/settings/general
/_shell/all/settings/sidebar
/_shell/all/settings/sync
/_shell/all/settings/update

/_shell/spaces/$spaceId/settings      → 同上结构
/_shell/spaces/$spaceId/settings/$section
```

兼容：

- 顶层 `/settings` 仍 redirect 到合适 scope（现状 `/all/settings`）  
- `openSection(scope, 'settings')` 演进为 `openSettings(scope, section?)`

### 8.2 为何子路由而不是 `?section=`

| | 子路由 | query/hash |
|--|--------|------------|
| 深链 / 刷新 | 自然 | 需手写 |
| 侧栏 active | `useMatch` | 手写比较 |
| History | 分区切换可进历史（可按产品选择 replace） | 弱 |
| 与现网一致 | 其他 section 已是路径段 | 例外 |

**采纳子路由。**  
分区切换默认 `navigate`；若希望「返回应用」不被分区历史淹没，分区间可用 `replace: true`（实现清单里二选一写死并测）。

**建议**：分区间 **`replace: true`**，使 Back /「返回应用」更贴近「离开设置」而不是「设置内上一步」。

### 8.3 `ShellSectionKey`

- 保留 `settings`，用于 header 文案、command context、active section 识别  
- Settings Mode 判定：`activeSection === 'settings'` 或路径 match `…/settings/*`

---

## 9. 组件与组合结构

### 9.1 组合原则

- **route 派生 mode**，禁止 `isSettings && hideSpace && …` 布尔爆炸  
- App / Settings 两个 **显式 variant**，而不是 `ShellSidebar({ mode })` 巨型 if  
- 重 panel（sync / update）可路由级 code-split  

### 9.2 建议组件树

```text
ShellLayout
└── SidebarProvider
    ├── 侧栏槽位
    │   ├── AppSidebar          // 原 ShellSidebar 主体（去设置项）
    │   └── SettingsSidebar     // 新
    │       ├── SettingsBackRow
    │       └── SettingsNav     // groups + items
    ├── ShellHeader             // + SettingsTrigger 在头像左
    ├── ShellMain
    │   └── Outlet
    │       └── settings routes
    │           ├── SettingsGeneralPage
    │           ├── SettingsSidebarPage
    │           ├── SettingsSyncPage
    │           └── SettingsUpdatePage
    └── ShellFooter             // 不变
```

### 9.3 状态与数据边界

| 模块 | 职责 |
|------|------|
| `useSidebarSettingsStore` | **仅**侧边栏可见性/项目分区等；不升格为全局 settings store |
| sync / update APIs | 仍属各自 feature；settings panel 只编排 UI |
| shell nav / history | `returnPath`、mode、打开设置 intent |
| 设备偏好 | sidebar width、desktopPreference、可选 lastSettingsSection |

### 9.4 与命令系统

- 注册/更新 command：`openSettings`、`openSettingsSection(section)`  
- 快捷键表增加 `Cmd+,`（与现有 chord 体系一致处实现）  
- Settings Mode 下命令列表可过滤掉无意义项（可选 P2）

---

## 10. 动效与手感

对齐 U1「反馈明显但克制」与桌面精密面板气质。

| 时刻 | 建议 | 禁止 |
|------|------|------|
| 进/出 Settings Mode | 侧栏与主区内容 opacity 轻过渡 150–200ms | 动画 shell 宽度、curtain 整页 |
| 分区切换 | 瞬切或 ≤150ms fade；优先稳 | 大位移 slide |
| Back / 齿轮 | `active:scale-[0.96]`；可中断 transition | spring bounce 夸张 |
| 首屏 | 避免无意义 enter 动画闪一下 | `transition: all` |
| 属性 | 只过渡 `opacity` / `transform` | 动画 `width` / `height` / `top` |

---

## 11. 分阶段落地

### P0 — 壳与入口（先有 Linear 形）

1. Header 头像左侧设置齿轮  
2. 路由仍可暂时落在单一 `SettingsPage`  
3. `isSettingsRoute` 时侧栏渲染 `SettingsSidebar`（锚点滚动或整页展示均可）  
4. 「返回应用」接 `returnPath`  
5. App 侧栏移除设置项  

**验收**：进设置侧栏变目录；返回恢复工作页；footer 高度不变。

### P1 — 真分区

1. 子路由 `settings/$section`  
2. 拆 panel：general / sidebar / sync / update  
3. 主区行式 preferences UI 收敛  
4. `lastSettingsSection`  
5. 默认 redirect 与 deep link  

**验收**：四分区独立 URL；刷新不丢分区；校验规则仍在。

### P2 — 打磨

1. `Cmd+,` / Command 文案与 section 直达  
2. Esc 退出策略（若做）  
3. collapse 自动展开与恢复  
4. a11y：settings `nav` landmark、返回 focus、键盘在侧栏与主区间移动  
5. 测试补齐：shell mode、路由、返回路径、可见性约束  

---

## 12. 验收标准

### 12.1 体验

- [ ] 从任意业务页点齿轮进入设置，侧栏立即是设置导航，不是 App 导航  
- [ ] 「返回应用」回到进入前上下文（或明确 fallback）  
- [ ] Footer 高度与内容职责无变化  
- [ ] 设置入口不在 App 侧栏 footer  
- [ ] 云同步 / 更新 / 侧栏可见性 / 默认空间 均能在对应分区完成  

### 12.2 工程

- [ ] mode 由 route 派生，无重复全局 boolean  
- [ ] AppSidebar / SettingsSidebar 分离，无不可测巨型组件  
- [ ] 现有 sidebar 可见性约束（至少一个主入口等）行为不回归  
- [ ] sync / update 既有能力不回退  

### 12.3 非回归

- [ ] mobile drawer 可打开设置导航  
- [ ] Command 新建任务在设置中仍可用  
- [ ] 侧栏宽度拖拽与偏好持久化不受 Settings Mode 破坏  

---

## 13. 风险与开放点

| 风险 / 开放点 | 说明 | 倾向 |
|---------------|------|------|
| 分区 history 污染 | 设置内多次切换导致「返回」卡在设置内 | 分区间 `replace: true` |
| returnPath 失效 | 原 path 实体已删 | fallback 到 scope 默认 section |
| 自动展开 sidebar | 可能让用户觉得 collapse 偏好被改 | 仅 Settings Mode 临时展开，退出写回 |
| P0 锚点 vs 直接子路由 | 锚点快但不终态 | 若工期紧可 P0 锚点，P1 必须子路由；**更推荐直接 P0 就上子路由骨架** |
| 头像旁齿轮 vs 头像菜单 | 菜单多一步 | **独立齿轮** |

---

## 14. 关键文件地图（实现时）

> 以仓库现状为索引，实现前再 codegraph / 读一遍确认。

| 区域 | 路径 |
|------|------|
| Shell 布局 | `src/app/layouts/shell/ShellLayout.tsx` |
| App 侧栏 | `src/app/layouts/shell/ShellSidebar.tsx` |
| Header | `src/app/layouts/shell/ShellHeader.tsx` |
| Footer | `src/app/layouts/shell/ShellFooter.tsx` |
| 导航配置 | `src/app/layouts/shell/config.ts` |
| Section 类型 | `src/app/layouts/shell/types.ts` |
| 路由 intents | `src/app/navigation/intents.ts` |
| 设置页 | `src/features/settings/ui/SettingsPage.tsx` |
| 设置路由 | `src/routes/_shell/all/settings.tsx`、`…/spaces/$spaceId/settings.tsx`、`src/routes/settings.tsx` |
| Sidebar 设置 store | `src/app/layouts/shell/model/useSidebarSettingsStore.ts` |
| Sidebar UI primitive | `src/shared/ui/base/sidebar.tsx` |
| 设置 panel 样式 | `src/shared/ui/patterns/settings-panel.ts` |

---

## 15. 文案定稿（V1）

| 位置 | 文案 |
|------|------|
| 返回 | 返回应用 |
| 侧栏标题 | 设置 |
| Group | 偏好 / 数据 |
| 分区 | 通用 / 侧边栏 / 云同步 / 更新 |
| Header 按钮 aria | 设置 |
| Command | 打开设置 |

各 panel 内 description 可沿用现有 `SettingsSection` 文案，拆分时按分区剪裁，避免同一说明重复出现在多个 panel。

---

## 16. 总结

StoneFlow 设置升级的核心不是「多做一页设置」，而是：

> **让 shell 在 App Mode 与 Settings Mode 之间干净切换；侧栏槽位复用，入口上移到 Header，footer 继续做系统状态，设置内容按真实能力分区。**

按 P0 → P1 → P2 推进即可先验证手感，再收口路由与工程边界。
