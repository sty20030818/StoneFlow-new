> **已归档（2026-07-18）**：产品/模块已统一为 **Launcher**。活跃契约见 `src/features/launcher/ARCHITECTURE.md`；本文仅作历史参考，勿再按 quick-create / quick_create 落地。

# StoneFlow Quick Create · Launcher 面板技术文档

## 0. 文档信息

| 项目 | 内容 |
|------|------|
| 文档名称 | Quick Create Launcher 面板技术文档 |
| 文档目的 | 冻结 QC 窗 **UI/UX + 固定几何 + 原生材质** 的目标态与组件拆分；指导史诗 11（QC-GEO）实现 |
| 上游 | [M-F-QC](../../03-前端架构解析/05-模块治理/模块/M-F-QC.md)（Q3 创建内核已落地）· [T2 执行计划史诗 11](../../03-前端架构解析/05-模块治理/10-T2重构执行计划.md) · 决议总表 Q3 |
| 执行 | [QuickCreate-Launcher重构执行方案](./QuickCreate-Launcher重构执行方案.md) |
| 适用范围 | `features/quick-create` runtime / layout / shell / surface UI；`platform` NSPanel / vibrancy / `quick_window/spec`；**不含** task 创建内核与 search 端口（史诗 9 已完成） |
| 当前阶段 | **已落地 · Phase A–F + 整洁架构收口**（2026-07-17；冒烟待本机勾选） |
| 核心策略 | **固定 720×500 外壳 + 内滚 + 原生材质**；彻底废弃 DOM 测高 / commit_layout 循环 |

### 0.1 已拍板决议（2026-07-17）

| # | 决议 |
|---|------|
| D1 | 产品形态：**Launcher 面板**，不对齐「内容驱动呼吸高度」 |
| D2 | 外窗固定 **720 × 500** logical px；`resizable: false` |
| D3 | Advanced：**壳内折叠**（单行），不独立 overlay |
| D4 | 深度：**原生材质 + 系统阴影**；禁止 CSS 大阴影作主深度 |
| D5 | **本期不做暗色专题**；按现网亮色 / token 即可；vibrancy 预留接口 |
| D6 | 测高链路（多 region measure → commit → present 几何状态机）**整层删除** |
| D7 | session 只负责显隐 / 焦点 / 关闭；不负责高度 |

---

# 1. 核心结论

## 1.1 一句话

> Quick Create = **固定尺寸的任务 Launcher（NSPanel）** + **壳内滚动结果区** + **原生材质**；  
> 前端不再量 DOM、不再驱动窗口高度；Rust 出厂定尺寸，show 前只做定位。

## 1.2 与现网差异（目标 vs As-Is）

| 维度 | 现网 | 目标 |
|------|------|------|
| 外窗高度 | 随内容 `commit_layout` | **恒定 500** |
| 外窗宽度 | ~688 + 阴影安全区 | **恒定 720**（无 CSS 阴影 padding） |
| 阴影 | 前端 `box-shadow` + `p-7` 透明区 | **系统阴影** + `setHasShadow(true)` |
| 背景 | 实色 `bg-background` + 硬边 | **透明 WebView + vibrancy**（亮色） |
| 测量 | 8 region + ResizeObserver + 双校验 | **删除** |
| Present | measuring → readyToPresent → present | prepare →（可选一次 ensureSize）→ present |
| Advanced | 撑高内容 → 触发再 commit | **壳内 0↔40px**，Results 变矮，外窗不变 |
| 结果溢出 | 撑窗 | **Results `overflow-y-auto`** |

## 1.3 为何选 Launcher 而非继续测高

1. **复杂度不对称**：测高换来的「卡片贴合」收益，远小于双状态机 / DPI / collapsible 首帧 / 阴影安全区的维护成本。  
2. **与 Raycast / Spotlight 同类范式一致**：外壳稳定、内容内滚、瞬时呈现。  
3. **Tauri / NSPanel 最佳实践**：创建时定 `inner_size`；透明窗靠原生层与 CSS 透明配合，不靠 Web 量高 resize。  
4. **符合 KISS / 单一职责**：几何归平台常量；UI 归分区布局；业务归 domain（已 Q3）。

## 1.4 明确不做（本期）

- 暗色模式专项（D5）
- Advanced 独立 overlay / 侧滑 sheet
- 可见态 re-commit 高度
- 多档 Compact/Expanded 外窗高度
- 取消独立窗（Q4 否）
- 改动 task 创建内核 / searchEntities（史诗 9 冻结）

---

# 2. 产品与 UI/UX 规格

## 2.1 定位

| 维度 | 定调 |
|------|------|
| Purpose | 全局快捷键打开 → 3 秒记一条任务，或搜到已有项跳转 |
| Tone | 克制、工具感、偏原生；**Industrial / refined minimal** |
| 差异化 | 主栏内嵌任务字段（优先级 / 归属 / 空间），不是纯命令搜索框 |
| 与主窗 | 数据规则同源（Q3）；**不共享 layout / Dialog 壳** |

设计参数：

- `DESIGN_VARIANCE: 3`（对称稳定）
- `VISUAL_DENSITY: 6`（偏高密度）
- `MOTION_INTENSITY: 4`（短、可打断；无外窗 height 动画）

## 2.2 固定尺寸与高度账

**常量（目标）：**

```txt
QUICK_CREATE_PANEL_WIDTH  = 720
QUICK_CREATE_PANEL_HEIGHT = 500
SHADOW_PADDING            = 0   （废弃）
WINDOW_WIDTH/HEIGHT       = 720 × 500
```

**纵向分区（logical px）：**

| 区域 | 收起 Advanced | 展开 Advanced |
|------|---------------|---------------|
| Primary composer | 44 | 44 |
| Advanced | 0 | 40 |
| Create row | 44 | 44 |
| Footer | 44 | 44 |
| **固定合计** | **132** | **172** |
| **Results（剩余）** | **368（≈9 行）** | **328（≈8 行）** |

行高 **40px**（满足 ≥40 hit area）。

## 2.3 线框

```txt
┌──────────────────────────── 720 ────────────────────────────┐
│ COMPOSER PRIMARY                                      44px  │
│  [Prio] [────────── Title ──────────] [归属] [空间] [⌄]     │
├─────────────────────────────────────────────────────────────┤
│ ADVANCED（0 | 40）                                    0|40  │
│  [状态] [截止] [计划] [提醒]  ← 单行；过宽横向 scroll        │
├─────────────────────────────────────────────────────────────┤
│ CREATE ROW                                            44px  │
│  ⊕  创建「xxx」为任务                                         │
├─────────────────────────────────────────────────────────────┤
│ RESULTS  flex-1 · min-h-0 · overflow-y-auto           ~328+ │
│  ▾ 任务 / 最近任务 · rows(40)                               │
│  ▾ 项目 / 最近项目 · rows(40)                               │
│  [empty / search-empty 在本区内垂直居中]                     │
├─────────────────────────────────────────────────────────────┤
│ FOOTER                                                44px  │
│  status ···                    ↑↓  ↵  ⇧↵  ⌘↵  Esc           │
└─────────────────────────────────────────────────────────────┘
                              500
```

## 2.4 Spacing Token

| Token | 值 | 用途 |
|-------|-----|------|
| `--qc-panel-w` | 720 | 外窗宽 |
| `--qc-panel-h` | 500 | 外窗高 |
| `--qc-pad-x` | 12 | 左右内边距 |
| `--qc-composer-h` | 44 | Primary |
| `--qc-advanced-h` | 40 | Advanced 展开 |
| `--qc-create-h` | 44 | Create row |
| `--qc-footer-h` | 44 | Footer |
| `--qc-row-h` | 40 | 结果行 |
| `--qc-gap` | 8 | 控件间距 |
| `--qc-radius-panel` | 12 | 外圆角 |
| `--qc-radius-inner` | 8 | 空状态 / chip |

同心圆角：外 12 ≈ 内 8 + 边距 4。

## 2.5 Advanced：壳内折叠（锁定）

- 触发：Primary 右侧 `⌄`（`toggleAdvanced`）
- 形态：Composer 内 **单行** 工具条；禁止折成两行挤 Results
- 过宽：`overflow-x-auto` 横向滑动，不增高
- 动画：`grid-template-rows: 0fr → 1fr`（或等价），~200ms；**不触发任何窗口 resize**
- 字段（现网保留）：状态 · 截止 · 计划 · 提醒

**为何不 overlay：** 字段仅 4 个；overlay 引入 Esc/焦点/scrim 与 NSPanel resignKey 风险；违背 KISS。字段 >6 或需表单级编辑时再开 overlay 专题。

## 2.6 键盘与焦点

### Tab（仅 composer 控件）

```txt
Priority → Title（默认焦点）→ Placement → Space → Advanced toggle
→（展开时）Status → Due → Scheduled → Reminder
→ Create row
```

结果列表 **不进 Tab**，只用 `↑↓` + `↵`（对齐 Launcher 习惯）。

### Esc 优先级

```txt
1. 打开的 Popover → 关 Popover
2. Advanced 展开 → 收起
3. Title 非空 → 清空 Title
4. Title 已空 → 关窗
```

### 其它（保持现语义）

| 键 | 行为 |
|----|------|
| `↵` | 焦点在结果 → 打开；否则创建 |
| `⇧↵` | 连续创建 |
| `⌘/Ctrl+↵` | 创建并打开 |
| `↑↓` | 结果导航 |

焦点时机：须在 Rust `windowDidBecomeKey` → `session-presented` 之后再 `input.focus()`（现契约保留）。

## 2.7 视觉（亮色 · 本期）

| 层 | 规则 |
|----|------|
| 窗体 | macOS `NSVisualEffectMaterial`（建议 `popover` 或等价）+ **系统阴影** |
| WebView / body / #root | `background: transparent` |
| Surface | 无大 `box-shadow`；可选 `1px` hairline `rgba(0,0,0,0.08)` |
| Composer / Footer 衬底 | 薄层可读性：`bg-background/70` 或等价 token（亮色） |
| Results | 更透；hover `bg-muted/50` |
| 分区 | `border-sf-divider`，少用卡片套卡片 |
| 数字 / Kbd | `tabular-nums` |

**禁止：** `shadow-[0_0_28px_…]` 作主深度；外层 `p-7` 阴影安全区。

暗色：本期不做；实现时 vibrancy 路径保持可扩展，样式勿写死只能亮色的死结即可。

## 2.8 动效

| 时刻 | 做法 | 禁止 |
|------|------|------|
| 首开 | 可选 opacity + translateY(-4px)，150ms；`initial={false}` 跳过强制入场 | 外窗 height |
| Advanced | grid-rows / max-height 壳内 | commit_layout |
| 结果切换 | opacity；可选短 stagger | 撑高外窗 |
| 按钮 | `active:scale-[0.96]` | `transition: all` |
| 关闭 | 弱于进入的 opacity 退出 | 复杂 choreography |

## 2.9 UI 状态矩阵（Results）

| 状态 | 表现 |
|------|------|
| Recent 有数据 | 任务/项目分组，默认各最多展示策略与现网一致（limit） |
| Recent 空 | 区内居中轻提示 |
| 搜索中 | 固定高度 skeleton（2–3 行），不改变外窗 |
| 搜索无结果 | 虚线提示 + Enter 创建（保留语义） |
| 提交中 | footer spinner；composer disabled |
| 连续创建成功 | footer 成功文案；清 title；**高度不变** |
| 错误 | footer 错误色；不弹额外层 |

## 2.10 与主窗 Create Dialog 字段对照

| 字段 | 主窗 | QC Primary | QC Advanced |
|------|------|------------|-------------|
| 标题 | ✅ | ✅ | — |
| 优先级 | ✅ | ✅ | — |
| 归属 / placement | ✅ | ✅ | — |
| 空间 | ✅ | ✅ | — |
| 状态 | ✅ | — | ✅ |
| 截止 / 计划 / 提醒 | ✅ | — | ✅ |
| 备注等扩展 | 主窗可多 | QC 可少 | 决策树：先 task 内核 |

规则：**语义单源（task 内核）；QC 可少字段，不可两套语义。**

---

# 3. 目标架构

## 3.1 分层（保持 window feature 心智）

```txt
routes/quick-create
  → QuickCreatePage
      → SessionProvider          // 显隐 / bridge / 关闭原因
      → DomainProvider           // draft / search / submit（Q3，少动）
      → WindowShell              // 装配 only
          → PanelSurface         // 固定壳 + 原生材质配合的透明表面
              → ComposerRegion   // primary + advanced collapse
              → CreateRegion
              → ResultsRegion    // flex-1 scroll
              → FooterRegion
```

| 层 | 负责 | 不负责 |
|----|------|--------|
| **runtime / session** | phase、bridge 事件、close、presented→focus 许可 | 窗口高度、DOM 测量 |
| **domain** | draft、搜索、提交、派生 | 几何、NSPanel |
| **shell** | 装配 Session+Domain→Surface | 业务规则、invoke 测高 |
| **surface / regions** | 固定布局、内滚、壳内折叠动画 | session phase 细节 |
| **api** | create / search / open / close / present | commit_layout（删除或仅 init） |
| **platform (Rust)** | 定尺寸、vibrancy、shadow、定位、show/hide | 读 DOM |

依赖方向不变：`routes → quick-create → task/global-search public → shared`；**禁止 → layout**。

## 3.2 Session 状态机（简化）

**现网（几何耦合）：**

```txt
booting → hidden → preparing → measuring → readyToPresent → visible → closing
```

**目标：**

```txt
booting → hidden → preparing → presenting → visible → closing
                 ↘ error
```

| Phase | 含义 |
|-------|------|
| `preparing` | 已收到 `session-prepared` + openContext；隐藏态渲染 UI |
| `presenting` | 已调用 `present_session`；等 becameKey |
| `visible` | 收到 `session-presented`；可 focus |

删除前端语义：`measuring`、`readyToPresent`、`commitMeasured`、`markReadyToPresent`、`isWindowReady`、`layoutRevisionKey`。

**Present 时序（保留平台硬约束）：**

```txt
shortcut → prepare_hidden + emit session-prepared
        → FE 渲染 openContext（隐藏 / opacity-0）
        → FE present_session
        → Rust show_and_make_key + 定位当前屏
        → becameKey → emit session-presented
        → FE visible + title.focus()
```

可选：应用启动或 prepare 时 **一次** `set_size(720,500)`；**运行时不再因内容变化 resize**。DPI / 换屏：仅重新 `place` 定位，不重测内容高。

## 3.3 组件拆分（目标目录）

```txt
features/quick-create/
  api/                    # 保留；删除 commitLayout / diagnostics（或 DEV only）
  domain/                 # 保留；去掉 layoutRevision 耦合
  runtime/                # session 简化
  shell/
    QuickCreateWindowShell.tsx
  ui/                     # 或保留 components/，按区收敛
    QuickCreatePanel.tsx          # 固定 720×500 根布局
    QuickCreateComposer.tsx
    QuickCreateAdvancedBar.tsx    # 壳内折叠槽
    QuickCreateCreateSection.tsx
    QuickCreateResults.tsx        # 唯一滚动容器
    QuickCreateFooter.tsx
    QuickCreateSurface.tsx        # 透明表面 + hairline；无大阴影
  controls/               # 保留
  model/                  # 保留
```

**删除（目标态）：**

| 路径 | 理由 |
|------|------|
| `layout/useQuickCreateLayout.ts` | 多 region 测量 |
| `layout/measureQuickCreateLayout.ts` | 测高纯函数 |
| `layout/QuickCreateLayoutPresenter.tsx` | resize + present 编排 |
| Frame 上 `p-7` + layout props | 阴影安全区 |
| BoardRegion 的 `*Ref` / `onLayoutChange` | 测高回调 |
| Shell `layoutRevisionKey` | domain→几何耦合 |

## 3.4 Context 职责（composition）

保持现有两 Provider 即可，**不新增 GeometryProvider**：

```txt
SessionContext  { phase, actions.close, … }
DomainContext   { state, derived, actions }
```

固定壳后几何无状态可共享；若未来 DPI 需通知，再加极薄 `PanelChromeContext`，默认不做。

## 3.5 与 TanStack / 状态三轨

| 轨 | QC 中归属 |
|----|-----------|
| URL | 仅 `#/quick-create` 入口；**窗高不进 search** |
| Query | 创建 / 搜索（史诗 9）；几何禁止进 Query |
| UI | session phase + `isAdvancedOpen` + popover |

---

# 4. 平台与 Tauri（Rust）

## 4.1 规格常量（`quick_window/spec.rs`）

目标值：

```rust
pub const QUICK_CREATE_PANEL_WIDTH: f64 = 720.0;
pub const QUICK_CREATE_PANEL_HEIGHT: f64 = 500.0;
// 删除 SHADOW_PADDING 或恒为 0
pub const QUICK_CREATE_WINDOW_WIDTH: f64 = 720.0;
pub const QUICK_CREATE_WINDOW_HEIGHT: f64 = 500.0;
```

`WebviewWindowBuilder.inner_size(720, 500)`；`resizable(false)` 保持。

## 4.2 NSPanel / 材质

现网要点（保留）：

- `NonActivatingPanel` + `can_become_key` + floating
- prepare 隐藏 → present 时 `show_and_make_key`
- `windowDidBecomeKey` → `session-presented`
- `windowDidResignKey` → hide
- present **只定位不重置高度**（在固定尺寸下改为：定位时 **写入固定 720×500**，避免残留旧 frame）

变更：

| 项 | 现网 | 目标 |
|----|------|------|
| `setHasShadow` | false | **true** |
| 前端大阴影 | 有 | **无** |
| vibrancy | 无显式 | setup 时 `apply_vibrancy`（`window-vibrancy`；lock 已有传递依赖） |
| `resize_*_preserving_top` | 内容驱动频繁调用 | **删除调用路径**；仅 init / DPI 兜底可选 |

`macOSPrivateApi`：vibrancy 通常需要；确认 `tauri.conf` 已开（与现透明窗一致）。

## 4.3 IPC

| 命令 | 目标 |
|------|------|
| `quick_create_prepare_session` | 保留 |
| `quick_create_present_session` | 保留 |
| `quick_create_close_session` | 保留 |
| `quick_create_frontend_ready/unready` | 保留 |
| `quick_create_commit_layout` | **删除或空实现废弃**；FE 不再调用 |
| `quick_create_report_layout_diagnostics` | **删除或 DEV only** |

Rust runtime phase 中 `WaitingLayout` 可收敛为不再等待 FE 高度；或 prepare 后直接允许 present。

## 4.4 Windows

对称：固定 720×500；材质走 Acrylic/Mica（`window-vibrancy` 能力范围内）；FE 同一套布局。本期验收以 macOS 为主，Windows 跟规格常量即可。

## 4.5 参考

- Tauri：[Window Customization](https://v2.tauri.app/learn/window-customization/)
- [tauri-nspanel](https://github.com/ahkohd/tauri-nspanel)
- 仓库内：`src-tauri/crates/platform/src/macos/panel.rs` 注释（becameKey / resignKey / 不 activateIgnoringOtherApps）

---

# 5. 前端实现要点（实现阶段用）

## 5.1 根布局

```tsx
// 示意：固定壳 + 五行
<div
  className="grid h-full w-full grid-rows-[auto_auto_auto_minmax(0,1fr)_auto]"
  style={{ width: 720, height: 500 }} // 或 h-full 填满原生窗
>
  <ComposerPrimary />
  <AdvancedCollapse open={isAdvancedOpen}>…</AdvancedCollapse>
  <CreateRow />
  <Results className="min-h-0 overflow-y-auto" />
  <Footer />
</div>
```

窗口已是 720×500 时，根用 `h-full w-full` 即可，避免双源尺寸。

## 5.2 Advanced 折叠

```tsx
<div
  className={cn(
    'grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
  )}
>
  <div className="min-h-0 overflow-hidden">
    <div className="flex h-10 items-center gap-2 overflow-x-auto px-3">
      {/* Status / Due / Scheduled / Reminder */}
    </div>
  </div>
</div>
```

## 5.3 Surface

- 去掉 `shadow-[0_0_28px…]` 与 `p-7`
- `bg-transparent`；圆角与 panel 裁切对齐
- 硬编码 `#bababa` 边改为 token / hairline

## 5.4 测试策略

- **删除/改写** 所有「commitLayout 高度」「advanced 触发再 commit」「阴影安全区」类断言
- **保留** 业务：创建、连续创建、搜索、打开、Esc、stale session、分区存在性
- 新增：根布局 `720×500` 约束（jsdom 可测 class/结构）；Advanced 展开不调用 commit（mock 从未被调）
- Rust：`spec` 常量单测；runtime 不再要求 WaitingLayout 才 present（若收敛）

---

# 6. 迁移刀序（实现时）

> 原则：先砍测高调用，再改 UI 壳，再改 Rust 常量/材质；每刀 `bun run check`。

| Phase | 内容 | 验收 |
|-------|------|------|
| **A · 规格冻结** | 本文 + 回写 M-F-QC §几何 + 执行计划史诗 11 | 文档齐 |
| **B · FE 去测高** | Presenter 改为「渲染 + present」；停调 commitLayout；临时仍可用旧窗尺寸 | 打开不闪；功能冒烟 |
| **C · 固定壳 UI** | Panel 五行布局；Advanced 壳内折叠；Results 内滚；去 p-7/大阴影 | 视觉 + 测试改写 |
| **D · Rust 定尺** | spec 720×500；init inner_size；删/废弃 commit 路径；present 写固定 frame | 首开再开同尺寸 |
| **E · 原生材质** | vibrancy + hasShadow true；FE 透明表面 | 观感接近系统面板 |
| **F · 收尾** | 删 layout/* 死代码；ARCHITECTURE.md；执行计划落地表 | check 绿 |

分支建议：`refactor/t2-11-qc-launcher`（或 `refactor/t2-11-qc-geo`）。

---

# 7. 冒烟清单

| # | 场景 | 预期 |
|---|------|------|
| 1 | Option+Space 首开 | 一次到位 720×500；无高度跳变 |
| 2 | 再开 | 同尺寸 |
| 3 | 展开 Advanced | 外窗不变；Results 略矮；单行控件 |
| 4 | 搜索多结果 | Results 内滚；外窗不变 |
| 5 | 连续创建 | toast/footer 变化；外窗不变 |
| 6 | Esc | Popover → Advanced → 清空 → 关窗 |
| 7 | 失焦 | resignKey 关窗 |
| 8 | 创建 / 搜索跳转 | 与史诗 9 行为一致 |
| 9 | becameKey 后 | Title 可输入 |
| 10 | 多屏 | 跟鼠标屏定位；尺寸仍 720×500 |

---

# 8. 风险与缓解

| 风险 | 缓解 |
|------|------|
| vibrancy + 亮色对比不足 | Composer/Footer 薄衬底；hairline |
| `macOSPrivateApi` / 上架 | 现透明窗已依赖；文档标明 |
| 删 commit 后旧 session 残留高度 | present/place 强制写入 720×500 |
| 测试大面积依赖测高 | Phase C 集中改写，勿与业务测混改 |
| Windows 材质不一致 | 同固定尺寸；材质 best-effort |
| 用户怀念「贴合卡片」 | 产品已选 Launcher；用内滚与密度补偿 |

---

# 9. 工程原则自检

| 原则 | 落地 |
|------|------|
| KISS | 删整层测高 |
| 单一职责 | session≠几何；Results≠撑窗 |
| 高内聚 | QC window 专属壳留在 feature |
| 低耦合 | 不依赖 main layout；跨 feature 仅 public |
| DRY | 创建/搜索继续走 task / global-search |
| 可删除性 | layout 测高模块可整夹删除 |
| 组件化 | Panel / Composer / Results / Footer 分区清晰 |

---

# 10. 文档与代码回写清单（实现时）

- [ ] 本文（本文件）
- [ ] `M-F-QC.md`：关闭「几何后议」开放问题；链到本文
- [ ] `10-T2重构执行计划.md`：史诗 11 填入本方案摘要与 Phase
- [ ] `features/quick-create/ARCHITECTURE.md`（新建短契约，无史诗号）
- [ ] `quick_window/spec.rs` 常量与注释
- [ ] `src/ARCHITECTURE.md` 现网相关段（若有 QC 描述）

---

# 11. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：Launcher 720×500、壳内折叠、原生材质、去测高、组件拆分与刀序；暗色本期不做 |
