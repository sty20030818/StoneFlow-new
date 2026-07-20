# 设置侧栏与 Settings Mode · 实现清单

> **For agentic workers:** 按任务顺序实现；每项用 checkbox 跟踪。推荐 subagent-driven 逐任务交付，或本会话 inline 分批实现。
> **设计依据：** `Docs/01-执行计划/05-设置侧栏与Settings-Mode/设置侧栏与Settings-Mode设计方案.md`
> **前置文档：** `Docs/U1-设计系统.md`、`Docs/P1-产品内核.md`
> **日期：** 2026-07-13

**Goal：** Linear 式 Settings Mode——进入设置后同一 sidebar 槽位切换为设置导航；Header 齿轮入口；「返回应用」；设置内容拆为 `settings/$section` 四分区 panel。

**Architecture：** route 派生 `shellMode`；`AppSidebar` / `SettingsSidebar` 显式双 variant；设置子路由 + panel 组合；`returnPath` / `lastSettingsSection` 会话粘性；Footer 与 shell 宽度骨架不变。

**Tech Stack：** React · TanStack Router · Zustand（既有 sidebar settings）· 既有 Sidebar primitive · Command system · Tauri desktop shell

## Global Constraints

- **架构仅方案 A（Sidebar Mode Swap）**；不做 Main 内二级 nav 终态、不做全屏独立 Settings 壳
- **Footer 高度与职责不变**（`h-7` 系统状态轨）；禁止为塞设置入口加高 footer
- **App 侧栏目标态移除设置项**；主入口 = Header 齿轮 + Command / 快捷键
- **V1 IA 仅四分区：** `general` · `sidebar` · `sync` · `update`；无空壳团队/账号分区
- **分区间导航默认 `replace: true`**，避免 history 卡在设置内
- mode **由 route 派生**，禁止 `isSettings && hideX && showY` 布尔爆炸
- 动效只动 `opacity` / `transform`；**不动画** shell 宽度
- 设置是配置态不是阻断态：Command / 新建任务在 Settings Mode 下仍可用
- 与设计方案冲突时以设计方案为准

---

## 文件落点总览

| 区域 | 路径 | 动作 |
|------|------|------|
| Shell 布局 | `src/app/layouts/shell/ShellLayout.tsx` | 改：按 mode 挂 App/Settings 侧栏 |
| App 侧栏 | `src/app/layouts/shell/ShellSidebar.tsx` | 改：移除 footer 设置项；可重命名/收口为 AppSidebar |
| Settings 侧栏 | `src/app/layouts/shell/SettingsSidebar.tsx`（或 `sidebar/SettingsSidebar.tsx`） | 新建 |
| Back 行 | `src/app/layouts/shell/sidebar/SettingsBackRow.tsx` | 新建（可内联到 SettingsSidebar，但建议拆） |
| 设置导航配置 | `src/app/layouts/shell/settingsNav.ts` 或 `config.ts` 扩展 | 新建/改：四分区 + groups |
| Header | `src/app/layouts/shell/ShellHeader.tsx` | 改：头像左 SettingsTrigger |
| Section 类型 | `src/app/layouts/shell/types.ts` | 改：可选 `SettingsSectionKey` |
| 导航 intents | `src/app/navigation/intents.ts` | 改：`openSettings(scope, section?)` |
| 路径构建 | `src/app/routing/*`（`buildScopedSettingsPath` 等） | 改：支持 `/$section` |
| Shell route 解析 | `src/app/navigation/shellRoute.ts` | 改：识别 `settings` + section |
| Route memory / 可记忆路径 | `src/app/routing/routeMemory.ts` 等 | 改：settings 子路径可记忆策略 |
| 返回路径 | shell nav store 或 `ShellLayout` 局部逻辑 | 新建/改：`returnPath` 捕获 |
| lastSection 偏好 | `shellDevicePreferences` 或 session | 可选 P1 |
| all 设置路由 | `src/routes/_shell/all/settings.tsx` → `settings/route.tsx` + `$section.tsx` | 改/新建 |
| space 设置路由 | `src/routes/_shell/spaces/$spaceId/settings*` | 改/新建（与 all 对称） |
| 顶层 redirect | `src/routes/settings.tsx` | 改：落到默认 section |
| 设置页拆分 | `src/features/settings/ui/*` | 改：拆 panel；瘦身/删除巨型单页 |
| 设置布局壳 | `src/features/settings/ui/SettingsLayout.tsx` 或 EntityScene 包装 | 新建/改 |
| Command IDs | `src/features/command/core/command.types.ts` | 改：补齐/统一 openSettings 绑定 |
| Command 实现 | `src/features/command/commands/*` + adapter | 改：打开设置/分区 |
| 快捷键 | `src/features/command/shortcuts/*` | 改：`Cmd+,` / `Ctrl+,` |
| 测试 | `ShellSidebar.test.tsx` · `SettingsPage.test.tsx` · 新测 | 改/新建 |
| 设计文案 | 本目录设计方案 §15 | 对齐 |

---

## 依赖关系

```
P0-1 路径/intent：settings + section 契约
  → P0-2 子路由骨架（redirect + $section）
  → P0-3 SettingsSidebar + Mode Swap 挂载
  → P0-4 returnPath + 返回应用
  → P0-5 Header SettingsTrigger
  → P0-6 移除 App 侧栏设置项 + 配置/测试清理
  → P0-7 验收冒烟

P1-1 拆 SettingsGeneral / Sidebar / Sync / Update panels
  → P1-2 行式 preferences UI 收敛
  → P1-3 lastSettingsSection + 默认 redirect
  → P1-4 shellRoute / breadcrumb / memory 对齐
  → P1-5 回归测试

P2-1 Cmd+, + Command 分区直达
  → P2-2 collapse 进设置自动展开/退出恢复
  → P2-3 Esc 退出（可选）+ a11y
  → P2-4 动效精修
```

---

# P0 — 壳与入口（先有 Linear 形）

> P0 目标：进设置侧栏变目录；Header 可进；返回可出；footer 不动。
> **推荐 P0 直接上子路由骨架**（即使四个 section 暂时仍渲染同一 `SettingsPage`），避免 P1 再搬路由。

## Task P0-1：路径与 intent 契约（settings + section）

**Files:**
- Modify: `src/app/routing/*`（含 `buildScopedSettingsPath`、canonical path helpers）
- Modify: `src/app/navigation/intents.ts`
- Modify: `src/app/navigation/shellRoute.ts`（解析/判定）
- Test: 既有 routing / shellRoute 单测扩展

**Produces:**
- `SettingsSectionKey = 'general' | 'sidebar' | 'sync' | 'update'`
- `openSettings(scope, section?, fallbackSpaceId?)` → `/all/settings/general` 等
- `buildScopedSettingsPath(scope, fallback?, section?)` 支持 section 段
- 无 section 的 `/…/settings` 仍合法（由路由 redirect）
- `isSettingsPath` / active section 可识别子路径

- [x] **Step 1:** 定义 `SettingsSectionKey` 与默认 section（`general`）常量（建议放 `config` 或 `features/settings/model`）
- [x] **Step 2:** 扩展 path builder：`…/settings` 与 `…/settings/$section`
- [x] **Step 3:** `openSettings` + 保持 `openSection(..., 'settings')` 委托到默认 section 或 bare settings（与 redirect 策略一致）
- [x] **Step 4:** `shellRoute` 解析 remainder：`settings` / `settings/<section>`；非法 section → 按 404 或 redirect general
- [x] **Step 5:** 单测：all scope + space scope 路径 round-trip

**验收：** 纯函数层可生成/解析四分区路径；旧 `openSection(..., 'settings')` 不炸。 ✅ 2026-07-13

---

## Task P0-2：子路由骨架（all + space 对称）

**Files:**
- Modify/New: `src/routes/_shell/all/settings.tsx` → 建议：
  - `settings/route.tsx`（layout / pathless 父级，可选）
  - `settings/index.tsx`（redirect → `$section` 默认）
  - `settings/$section.tsx`（校验 section + 渲染）
- Modify/New: `src/routes/_shell/spaces/$spaceId/settings*`（对称）
- Modify: `src/routes/settings.tsx`（顶层 redirect 带默认 section）
- 跑路由 codegen：`bun` / 项目既有 route gen 流程

**Produces:**
- `/all/settings` → redirect `/all/settings/general`（或 lastSection，P1 再接）
- `/all/settings/$section` 合法四值
- space 作用域同等行为
- P0 阶段 `$section` 可暂时都渲染现有 `SettingsPage`（整页），但 URL 已分区

- [x] **Step 1:** 落地 file route 结构；非法 `$section` redirect 到 general
- [x] **Step 2:** 分区间链接使用 `replace: true`（Link / navigate 统一）— index / 非法 section / 顶层 redirect 均 `replace`
- [x] **Step 3:** 更新 `routeTree.gen.ts`（按项目脚本）
- [ ] **Step 4:** 手动点四次 URL 不白屏（待本地 dev 手验）

**验收：** 刷新 `/all/settings/sync` 不丢；`/all/settings` 自动落到默认分区。 ✅ 路由与 typecheck 已过；手验留给联调

---

## Task P0-3：SettingsSidebar + Mode Swap

**Files:**
- New: `src/app/layouts/shell/SettingsSidebar.tsx`（或 `sidebar/SettingsSidebar.tsx`）
- New/Modify: 设置 nav 配置（groups + items + icons + to）
- Modify: `src/app/layouts/shell/ShellLayout.tsx`（条件渲染侧栏）
- Reuse: `Sidebar*` primitives、`SidebarNavRow` 或等价 menu button

**Produces:**
- `isSettingsRoute`（route 派生）为 true 时渲染 `SettingsSidebar`，否则 `ShellSidebar`（App）
- SettingsSidebar 结构：
  - BackRow 占位（P0-4 接线）
  - 标题「设置」
  - Group「偏好」：通用、侧边栏
  - Group「数据」：云同步、更新
- active 态跟 `$section` match
- **不**渲染 Space switcher / 项目列表 / SyncSidebarStatusStrip

- [x] **Step 1:** 写 `SETTINGS_NAV_GROUPS` 配置（label、section key、icon、path builder）
- [x] **Step 2:** 实现 `SettingsSidebar` UI（对齐 App 侧栏密度与 active）
- [x] **Step 3:** `ShellLayout` 用 route 判定切换，**禁止**再加全局 `useState(isSettings)`
- [x] **Step 4:** 确认 collapse / mobile drawer 下仍能看到设置导航（最小可用）— 复用同一 Sidebar primitive
- [ ] **Step 5:** 可选：内容区 opacity 轻过渡（可放到 P2）

**验收：** 进任意 settings URL，左侧是设置目录且当前分区高亮；出设置恢复 App 侧栏。 ✅

---

## Task P0-4：returnPath +「返回应用」

**Files:**
- Modify: `SettingsSidebar` / `SettingsBackRow`
- Modify: `ShellLayout` 或 shell nav / history 相关 store
- 可能触及: `useShellRouteHistory.ts`、`routeMemory.ts`

**Produces:**
- 从 **non-settings → settings** 时捕获 `returnPath`（完整可导航 path）
- 点击「← 返回应用」→ `navigate(returnPath)`
- `returnPath` 无效/空 → `openStartupFallback` 或当前 scope 默认 section
- 设置内分区切换 **不**覆盖 `returnPath`
- 文案：「返回应用」；`aria-label` 一致；命中区 ≥ 40px 高

- [x] **Step 1:** 定义捕获时机（layout effect 监听 route：进入 settings 边界时写入）— 非 settings 时写 ref
- [x] **Step 2:** BackRow onClick / Link 行为
- [x] **Step 3:** 单测或集成测：业务页 → 设置 → 返回 = 原业务页（SettingsSidebar.test）
- [x] **Step 4:** 深链直接打开 settings 时 fallback 合理（startup fallback）

**验收：** 从收件箱进设置再返回，回到收件箱（或该 scope 等价路径）。 ✅

---

## Task P0-5：Header SettingsTrigger

**Files:**
- Modify: `src/app/layouts/shell/ShellHeader.tsx`
- 可能：`shell-chrome` patterns（icon button class）
- 接线 navigate / `onRunCommand(COMMAND_IDS.openSettings | goSettings)`

**Produces:**
- 头像 cluster **左侧**齿轮按钮
- 点击 → `openSettings(currentScope, lastOrDefaultSection)`
- `aria-label="设置"`；tooltip 可选
- Settings Mode 下按钮可 `aria-pressed` / active 样式（二选一写死）
- **不**增加 footer 任何设置入口

- [x] **Step 1:** 在 `shell-header-right` 头像前插入 icon button
- [x] **Step 2:** 点击走与 Command 相同的 openSettings 路径（避免两套逻辑）
- [x] **Step 3:** 窄屏/mobile 仍可见或可访问（至少 sm+；若 hidden 需有替代入口）
- [x] **Step 4:** 拖拽区 `data-tauri-drag-region` 不吞点击（按钮自身勿标 drag）

**验收：** 任意业务页点齿轮进入设置；footer 高度未变。 ✅

---

## Task P0-6：移除 App 侧栏设置项 + 配置清理

**Files:**
- Modify: `src/app/layouts/shell/ShellSidebar.tsx`（去掉 settings `SidebarMenuItem`）
- Modify: `src/app/layouts/shell/config.ts`（`SHELL_SETTINGS_ITEM` 用途收缩：仅 path 辅助或删除渲染引用）
- Modify: 相关测试 `ShellSidebar.test.tsx`、command nav 若列举 footer 项
- Grep: `SHELL_SETTINGS_ITEM`、侧栏「设置」文案

**Produces:**
- App Mode 侧栏 footer 仅归档/回收站等业务辅助入口 +（若仍保留）其它非设置项
- Command / Header 仍能进设置
- 无死链、无重复入口

- [x] **Step 1:** 删除 `ShellSidebar` footer 中 settings 行
- [x] **Step 2:** 更新测试断言
- [x] **Step 3:** 全仓 grep 确认 UI 无第二处常驻设置入口（Command 除外）— 仅 Header 齿轮 + Command

**验收：** App 侧栏看不到「设置」；Header + URL + Command 可进。 ✅

---

## Task P0-7：P0 验收冒烟

- [ ] 业务页 → 齿轮 → SettingsSidebar 出现
- [ ] 点击四分区（即便内容暂同页）URL 变、active 变
- [ ] 返回应用回到原上下文
- [ ] 刷新设置子路径不白屏
- [ ] Footer `h-7`、同步/更新/版本仍在
- [ ] `bun test` / 项目既有前端测相关文件通过
- [ ] 设计方案状态可改为「P0 已实现」若全部勾选

**P0 Done when：** Mode Swap + 入口 + 返回 + 子路由骨架可用，设置内容可仍为单页。

---

# P1 — 真分区 panel

## Task P1-1：拆四个 Settings panels

**Files:**
- New: `src/features/settings/ui/panels/SettingsGeneralPanel.tsx`
- New: `src/features/settings/ui/panels/SettingsSidebarPanel.tsx`
- New: `src/features/settings/ui/panels/SettingsSyncPanel.tsx`
- New: `src/features/settings/ui/panels/SettingsUpdatePanel.tsx`
- New/Modify: `SettingsSectionLayout` / page wrapper（标题 + description + children）
- Modify: `src/routes/.../settings/$section.tsx` 按 section 选 panel
- Modify/Delete: 巨型 `SettingsPage.tsx`（拆完后删除或变为 thin re-export）
- Modify: `SettingsPage.test.tsx` → 按 panel 拆测或保留集成测

**Produces:**
- `general`：默认空间
- `sidebar`：主入口 / 辅助入口 / 项目分区（逻辑从旧页原样迁移）
- `sync`：云同步整块（状态、策略、dialog、诊断）
- `update`：`UpdateSettingsSection`
- 各 panel 独立 import，sync/update 可后续 lazy

- [x] **Step 1:** 抽出共享小组件（`SettingsSection`、`SettingCheckboxRow` 等）到 `features/settings/ui` 共用
- [x] **Step 2:** 逐个迁移逻辑与状态（注意 hooks 不跨 panel 泄漏）
- [x] **Step 3:** `$section` route 映射（SettingsPage 按 settingsSection 渲染 panel）
- [x] **Step 4:** 删除死代码；保证 store/API 调用次数不异常加倍

**验收：** 四个 URL 只渲染对应内容；旧行为（校验、同步、更新）不回归。 ✅

---

## Task P1-2：行式 preferences UI 收敛

**Files:**
- Modify: panels + `settings-panel` patterns
- 可能新增: `SettingsPreferenceRow`（label / description / control）

**Produces:**
- 主区单列、最大宽约 40–44rem
- 行：左文案右控件；窄屏堆叠
- 少用大面积 checkbox 卡片网格（sidebar 可见性可改为 switch 行）
- 文案对齐设计方案 §15 / 旧 description 剪裁

- [x] **Step 1:** 统一 `SettingsPreferenceRow` API
- [x] **Step 2:** sidebar panel 三组用 divide-y / 分组标题
- [x] **Step 3:** general / update 对齐同一视觉节奏（max-w 44rem）
- [x] **Step 4:** 视觉过一眼：与 App 浅色克制风格一致，无紫光/重阴影

**验收：** 设置主区扫描效率明显好于旧长滚动大卡片。 ✅

---

## Task P1-3：lastSettingsSection + 默认 redirect

**Files:**
- Modify: settings index redirect
- Modify: Header / Command openSettings
- Optional: `shellDevicePreferences` 持久化 last section；V1 可用 sessionStorage / 内存

**Produces:**
- 再次点齿轮落到上次分区
- `/settings` bare redirect 优先 last，否则 `general`
- 非法 last 值回落 `general`

- [x] **Step 1:** 进入任意合法 section 时写入 last（sessionStorage）
- [x] **Step 2:** openSettings 无显式 section 时读 last；index redirect 同理
- [x] **Step 3:** 测：lastSettingsSection unit tests

**验收：** 粘性符合预期；清 session 后默认 general。 ✅

---

## Task P1-4：shellRoute / breadcrumb / memory 对齐

**Files:**
- Modify: `shellRoute.ts`、`breadcrumbResolver`（若有）、`routeMemory.ts`
- Modify: Header section label（`getSectionLabel('settings')` 等）
- 命令 context `route.page === 'settings'` 保持 true

**Produces:**
- 设置子路径在 history / memory 策略明确：
  - **建议：** settings 路径可进 history，但「可记忆 restore」是否记住 section 写清（推荐记住）
- breadcrumb / 标题不显示错误 section
- Command context 在四分区下仍识别为 settings

- [x] **Step 1:** 审计 `isRememberableShellPath` 对 `settings/*` 的行为 — 仍不记入 restore（由 returnPath 承担退出）
- [x] **Step 2:** breadcrumb：`设置 / {分区名}`
- [x] **Step 3:** shellRoute 已识别 settings 子路径；SettingsPage 用 settingsSection

**验收：** 刷新、后退、命令上下文在设置子路径下行为正确。 ✅

---

## Task P1-5：P1 回归测试

- [x] Panel 单测：sidebar 至少保留一个主入口约束（既有 SettingsPage tests）
- [x] Sync panel 关键路径 smoke（mock API）
- [x] Shell mode 切换：settings 路径渲染 SettingsSidebar
- [x] 返回路径集成测
- [x] `ShellSidebar` 无设置项
- [x] 相关 bun test / vitest 全绿（settings 相关）

**P1 Done when：** 四分区真拆分 + URL/粘性/回归就绪。 ✅

---

# P2 — 打磨

## Task P2-1：快捷键与 Command 分区直达

**Files:**
- Modify: `src/features/command/core/command.types.ts`（确认 `openSettings` / `goSettings` 语义统一，避免双 ID 行为分叉）
- Modify: command 注册表 + `shell-command-adapter`
- Modify: `DEFAULT_KEYBINDINGS` / shortcut display
- Test: shortcut + adapter tests

**Produces:**
- `Cmd+,`（mac）/ `Ctrl+,`（win/linux）→ openSettings
- Command 列表：「打开设置」；可选「打开设置：云同步」等 section 命令（至少主命令）
- 与 Header 齿轮同一执行路径

- [ ] **Step 1:** 统一 command id 语义（文档写清保留哪个）
- [ ] **Step 2:** 绑定快捷键并更新快捷键帮助
- [ ] **Step 3:** 单测 binding 与 execute

**验收：** 键盘可进设置；帮助面板可见快捷键。

---

## Task P2-2：Collapse 策略

**Files:**
- Modify: `ShellLayout` / `SidebarProvider` 协作点
- Modify: `useSidebarSettingsStore` / desktopPreference 读取

**Produces:**
- 进入 Settings Mode 且 desktop collapsed → **临时展开**
- 退出 Settings Mode → **恢复**进入前 preference（不误写用户长期偏好，除非产品决定持久化）
- mobile 行为与设计方案 §7.3 一致

- [ ] **Step 1:** 记录 enter 时的 visual preference
- [ ] **Step 2:** settings 边界 effect 展开
- [ ] **Step 3:** 退出恢复；测快速进出让 preference 不抖动写坏

**验收：** collapsed 用户进设置能看见完整目录；退出回到 collapsed。

---

## Task P2-3：Esc 与 a11y（可选但建议）

**Files:**
- Shell 快捷键路由 / command layer
- SettingsSidebar landmark

**Produces:**
- Esc 优先级：dialog > command > drawer > **settings exit（可选）**
- Settings 侧栏 `nav` + 可达标签
- 从 Header 进入后 focus 管理不丢（至少 focus 主区标题或返回按钮，选定一种）

- [ ] **Step 1:** 若做 Esc 退出，接入现有 shortcut 层并写优先级注释
- [ ] **Step 2:** a11y 属性与键盘 Tab 顺序走查
- [ ] **Step 3:** 不做 Esc 则在设计方案开放点标明「砍掉」

**验收：** 键盘用户可完成进设置 → 换分区 → 返回。

---

## Task P2-4：动效精修

**Files:**
- SettingsSidebar / Main outlet wrapper
- CSS variables 若需 duration token

**Produces:**
- 进/出 mode：内容 opacity 150–200ms，可中断
- **不**动画 sidebar 列宽
- 无 `transition: all`
- `prefers-reduced-motion` 关闭过渡

- [ ] **Step 1:** 包装侧栏切换与 main 切换
- [ ] **Step 2:** reduced-motion 回归
- [ ] **Step 3:** 快速连点齿轮/返回无卡死

**验收：** 手感干净；骨架稳定。

---

# 最终验收清单（设计方案 §12 映射）

### 体验

- [ ] 任意业务页点齿轮，侧栏立即为设置导航
- [ ] 「返回应用」恢复进入前上下文（或明确 fallback）
- [ ] Footer 高度与职责不变
- [ ] App 侧栏无设置项
- [ ] 四分区均可完成对应配置

### 工程

- [ ] mode 由 route 派生
- [ ] AppSidebar / SettingsSidebar 分离
- [ ] 侧栏可见性约束不回归
- [ ] sync / update 能力不回退

### 非回归

- [ ] mobile drawer 可访问设置导航
- [ ] 设置中 Command 新建任务仍可用
- [ ] 侧栏宽度拖拽与偏好持久化正常

---

# 实现备注（给 agent）

1. **先 P0-1/P0-2 再 UI**：路径契约不稳会导致侧栏 active 与 redirect 返工。
2. **拆 panel 时保持行为字节级迁移**：先搬逻辑再改视觉（P1-1 → P1-2）。
3. **`replace: true`** 用于设置内 section 切换；「返回应用」用 `returnPath`，不要依赖用户点多次浏览器 back。
4. **不要**把 `useSidebarSettingsStore` 升格成全局 settings store。
5. **不要**在 SettingsSidebar 底再挂同步条。
6. 改路由后跑项目既定的 TanStack route generation。
7. 每完成一个 Task 勾选 checkbox；P0/P1/P2 Done when 满足再标设计方案状态。

---

## 任务索引（快速勾选）

| ID | 标题 | 阶段 |
|----|------|------|
| P0-1 | 路径与 intent 契约 | P0 |
| P0-2 | 子路由骨架 | P0 |
| P0-3 | SettingsSidebar + Mode Swap | P0 |
| P0-4 | returnPath + 返回应用 | P0 |
| P0-5 | Header SettingsTrigger | P0 |
| P0-6 | 移除 App 侧栏设置项 | P0 |
| P0-7 | P0 验收冒烟 | P0 |
| P1-1 | 拆四个 panels | P1 |
| P1-2 | 行式 preferences UI | P1 |
| P1-3 | lastSettingsSection | P1 |
| P1-4 | shellRoute / breadcrumb / memory | P1 |
| P1-5 | P1 回归测试 | P1 |
| P2-1 | 快捷键与 Command | P2 |
| P2-2 | Collapse 策略 | P2 |
| P2-3 | Esc 与 a11y | P2 |
| P2-4 | 动效精修 | P2 |
