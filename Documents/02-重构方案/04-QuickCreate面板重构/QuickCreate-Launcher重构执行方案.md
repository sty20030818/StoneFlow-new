# Quick Create Launcher · 重构执行方案

> 状态：**已落地 A–F + 整洁架构收口** · 2026-07-17（冒烟总表待本机勾选）
> 规格源：[QuickCreate-Launcher面板技术文档](./QuickCreate-Launcher面板技术文档.md)
> T2 对齐：[史诗 11](../../03-前端架构解析/05-模块治理/10-T2重构执行计划.md) · [M-F-QC](../../03-前端架构解析/05-模块治理/模块/M-F-QC.md)
> **原则：** 串行 Phase；每 Phase 末 `bun run check`；先停测高再改壳再改 Rust；过程进度只写本文，不进 `src/**` 史诗号注释。

---

## 0. 工程约定

### 0.1 分支

```txt
refactor/t2-11-qc-launcher
```

可选按 Phase 拆 PR：`…-b-no-measure` / `…-c-fixed-shell` / `…-d-rust-size` / `…-e-vibrancy`；默认一条分支连推亦可。

### 0.2 Commit / PR

- Commit 中文，说明目标（例：`refactor(qc): 停用 commitLayout 与多 region 测高`）
- **禁止**在 `src/**` 注释写史诗号 / Phase / 过渡期字样；临时兼容须写删除条件
- PR 描述贴：本 Phase 目标、冒烟勾选、是否破坏 IPC

### 0.3 门禁

```bash
bun run check
```

含 typecheck · lint · boundaries · format · tests · rust。

### 0.4 文档回写（全史诗结束时）

1. `src/features/quick-create/ARCHITECTURE.md`（新建短契约，职责语言）
2. 本文「落地」表勾选
3. `10-T2重构执行计划.md` 史诗 11 状态 → done
4. 规格文档变更记录补一行（若实现有偏差）

### 0.5 范围边界（禁止顺手）

| 做 | 不做 |
|----|------|
| QC runtime / layout / shell / surface UI | task 创建内核、searchEntities（史诗 9） |
| `quick_window/spec`、NSPanel 材质与尺寸 | 主窗 layout / Dialog |
| 删测高与 commit 路径 | 暗色专题 |
| Advanced 壳内折叠 | Advanced overlay |

---

## 1. 目标与验收总纲

| 目标 | 验收 |
|------|------|
| 外窗恒定 **720×500** logical | 首开 / 再开 / Advanced 展开 / 搜索多结果，外窗尺寸不变 |
| 废弃 DOM 测高 | FE 无 `commitLayout` 调用；无 8 region ResizeObserver 测高 |
| 原生材质 + 系统阴影 | 无 CSS 大阴影与 `p-7` 安全区；`hasShadow` + vibrancy（E） |
| Session 简化 | 无 `measuring` / `readyToPresent` 几何语义 |
| 业务回归 | 创建、连续创建、搜索跳转、Esc、失焦关窗与史诗 9 一致 |

---

## 2. 文件侦察清单（2026-07-17）

实施前若漂移，以 rg 更新本表。

### 2.1 前端 · 将删或大改

| 文件 | 动作 |
|------|------|
| `layout/useQuickCreateLayout.ts` | **删** |
| `layout/measureQuickCreateLayout.ts` | **删** |
| `layout/QuickCreateLayoutPresenter.tsx` | **删**；职责并入 Shell/Panel |
| `shell/QuickCreateWindowShell.tsx` | **改**：去 `layoutRevisionKey`；直接挂 Panel |
| `components/QuickCreateFrame.tsx` | **改/并**：去 `p-7`、layout props；或并入 Panel |
| `components/QuickCreateSurface.tsx` | **改**：透明 + hairline；去大 shadow |
| `components/QuickCreateBoardRegion.tsx` | **改**：去 `*Ref` / `onLayoutChange`；Results 内滚 |
| `components/QuickCreateAdvancedMetaBar.tsx` | **改**：包进壳内折叠槽；单行横滑 |
| `api/quickCreate.ts` | **改**：删 `commitLayout` / diagnostics 导出（或 DEV 门控后删） |
| `runtime/quickCreateSessionTypes.ts` | **改**：phase 收敛 |
| `runtime/quickCreateSessionReducer.ts` | **改**：删 measuring / readyToPresent 迁移 |
| `runtime/QuickCreateSessionProvider.tsx` | **改**：删 `commitMeasured` / `markReadyToPresent` |
| `components/QuickCreatePage.test.tsx` | **大改**：删测高断言；补固定壳断言 |

### 2.2 前端 · 业务少动

| 文件 | 说明 |
|------|------|
| `domain/**` | 保留；去掉仅服务 `layoutRevisionKey` 的间接耦合 |
| `api/map*` · `create` · `search` · `openTarget` | 不动 |
| `controls/**` | 不动（Popover 行为保持） |
| `routes` quick-create 入口 | 薄挂载，不动逻辑 |

### 2.3 Rust · 将改

| 文件 | 动作 |
|------|------|
| `platform/.../quick_window/spec.rs` | 常量 → 720×500；废弃 SHADOW_PADDING |
| `platform/.../macos/panel.rs` | hasShadow true；注释改「固定尺寸」；place 写死尺寸 |
| `platform/.../windows/panel.rs` | inner_size 跟常量 |
| `platform/.../quick_window/controller.rs` | `apply_height` 调用路径收敛 / 可选保留 init |
| `runtime/.../session.rs` | 删或空置 `commit_quick_create_layout` |
| `runtime/.../window.rs`（commands） | 注销 commit / diagnostics 或标 deprecated |
| `runtime/.../commands/mod.rs` | `generate_handler!` 同步 |
| `runtime/.../runtime.rs` | `WaitingLayout` 收敛；改/删 recommit 测试 |
| capabilities / tauri.conf | 确认 `macOSPrivateApi`（vibrancy） |

---

## 3. Phase 总表

| Phase | 名称 | 破坏性 | 依赖 | 建议提交粒度 |
|-------|------|--------|------|--------------|
| **A** | 规格冻结（文档） | 无 | — | 已完成于规格文档 |
| **B** | FE 停测高 / 停 commit | 中 | A | **done**（2026-07-17） |
| **C** | 固定壳 UI + 内滚 | 中 | B | **done**（2026-07-17） |
| **D** | Rust 定尺 + 废 commit IPC | 高 | C（可弱并行 B 后） | **done**（2026-07-17） |
| **E** | 原生材质 | 中 | D | 1 commit |
| **F** | 删死代码 + 契约文档 | 低 | E | 1 commit |

**推荐顺序：A（done）→ B → C → D → E → F。**
D 可与 C 尾部重叠，但 **FE 停调 commit 必须先于删 IPC**，避免运行时红屏。

---

## 4. Phase A · 规格冻结

| 字段 | 内容 |
|------|------|
| 状态 | **done**（2026-07-17） |
| 产出 | 本目录技术文档 + 本执行方案；M-F-QC / 史诗 11 回写 |

### 检查

- [x] 720×500、壳内折叠、无暗色、去测高已拍板
- [x] 规格文档与本执行方案同目录

---

## 5. Phase B · FE 停测高 / 停 commit

| 字段 | 内容 |
|------|------|
| 目标 | 打开链路不再测高、不再 `commitLayout`；仍可 present；**暂可保留旧窗尺寸** |
| 破坏性 | 中（行为：不再跟内容涨窗） |
| 状态 | **done**（2026-07-17） |

### 5.1 步骤

1. `QuickCreateLayoutPresenter`：删除 `commitLayout` / diagnostics / resize dedupe 主路径；在 UI ready 后直接走 `presentSession`（仍等 session phase 许可）。
2. 停止调用 `sessionActions.commitMeasured` / `markReadyToPresent`；临时可将 phase 从 `preparing` 直接跳到可 present（或 reducer 放宽：`preparing` 亦可 present）。
3. `useQuickCreateLayout`：可先短路 `isReady=true` + 固定假高度，**或** 本 Phase 末直接删并用 Frame 无测量渲染。
4. Shell：去掉 `layoutRevisionKey` 对 layout 的驱动（可先留无用数组，C 再删）。
5. 测试：所有 `mockedCommitLayout` 期望改为 **never called**；删「advanced 再 commit」「阴影安全区高度」用例；保留业务冒烟测。

### 5.2 改哪些文件

- `layout/QuickCreateLayoutPresenter.tsx`
- `runtime/QuickCreateSessionProvider.tsx` · `quickCreateSessionReducer.ts` · `quickCreateSessionTypes.ts`（最小放宽）
- `shell/QuickCreateWindowShell.tsx`（弱化 revision）
- `components/QuickCreatePage.test.tsx`
- `api/quickCreate.ts`（`commitLayout` 可暂留未引用，F 再删）

### 5.3 验收

- [x] `rg "commitLayout" src/features/quick-create` 无生产调用（测试 mock 除外）
- [ ] 快捷键打开 → present → 可输入（人工）
- [ ] 创建 / 搜索 / 关窗冒烟（人工）
- [x] QuickCreatePage 单测绿；typecheck 绿；runtime present-from-preparing 单测绿
- [ ] 全量 `bun run check`（建议 Phase B 合并前或 C 前跑）

### 5.4 落地

| 项 | 结果 |
|----|------|
| 日期 | 2026-07-17 |
| 备注 | Session：`preparing → presenting → visible`；Presenter 停 commit；Rust `mark_presenting_for` 允许 Preparing；测高 hook 暂留未驱动高度 |

---

## 6. Phase C · 固定壳 UI + 内滚

| 字段 | 内容 |
|------|------|
| 目标 | 五行布局；Advanced 壳内折叠；Results 唯一滚动；去 `p-7` / 大阴影 |
| 破坏性 | 中（视觉与布局） |
| 状态 | **done**（2026-07-17） |

### 6.1 步骤

1. 新增或重构根组件 `QuickCreatePanel`（可先放 `components/`，F 再整理目录）：
   ```txt
   grid-rows: auto auto auto minmax(0,1fr) auto
   Primary | AdvancedCollapse | Create | Results | Footer
   ```
2. Advanced：`grid-rows 0fr/1fr` 单行横滑；高度 token 40。
3. `QuickCreateBoardRegion`：删除全部 layout refs / `onLayoutChange`；外层 `min-h-0 overflow-y-auto`。
4. `QuickCreateSurface`：`bg-transparent`；去掉 `shadow-[0_0_28px…]`；边框改 hairline / token。
5. `QuickCreateFrame`：去掉 `p-7`；可见性仍可由 session `visible` / presenting 派生 opacity。
6. 空状态：在 Results **区内**居中，禁止 `min-h-44` 等假设外窗会涨的写法（可保留区内 min-height）。
7. 改写 / 新增组件测：结构分区、Advanced 展开不调用任何 window IPC、Results 可滚动结构存在。

### 6.2 改哪些文件

- `components/QuickCreateFrame.tsx` · `QuickCreateSurface.tsx` · `QuickCreateBoardRegion.tsx`
- `components/QuickCreateAdvancedMetaBar.tsx` · `QuickCreateComposer*.tsx`
- `shell/QuickCreateWindowShell.tsx`
- 新建 `QuickCreatePanel.tsx`（若拆）
- `shared/components/patterns/quick-create.ts`（advanced 行 class 可微调）
- `styles/base.css`（`body[data-quick-create]` 保持透明；可补 `h-full` 约定）
- `QuickCreatePage.test.tsx`

### 6.3 验收

- [x] 结构五行清晰；Advanced 展开外层无 resize IPC（单测）
- [ ] 搜索多结果时仅 Results 滚动（人工）
- [x] 无 `p-7` 透明安全区依赖
- [x] QuickCreatePage 单测绿；typecheck 绿
- [ ] 全量 `bun run check`（建议 Phase D 前）

### 6.4 落地

| 项 | 结果 |
|----|------|
| 日期 | 2026-07-17 |
| 备注 | Panel 五行壳；Advanced 壳内折叠；Surface 去大阴影；Results `overflow-y-auto`；Presenter 不再挂测高 hook |

---

## 7. Phase D · Rust 定尺 + 废 commit IPC

| 字段 | 内容 |
|------|------|
| 目标 | 原生窗 **720×500**；place/present 写死尺寸；FE/IPC 无 commit |
| 破坏性 | 高 |
| 状态 | **done**（2026-07-17） |

### 7.1 步骤

1. `spec.rs`：
   ```rust
   PANEL_WIDTH = 720.0
   PANEL_HEIGHT = 500.0
   // WINDOW_* = PANEL_*；SHADOW_PADDING 删除或 = 0
   // MIN_HEIGHT 可 = PANEL_HEIGHT（固定壳无「最小再涨」）
   ```
2. macOS / Windows 创建 `inner_size` 跟新常量。
3. `place_panel_on_active_screen`：定位时 **强制** width/height = 常量（避免旧 frame 残留）。
4. `commit_quick_create_layout`：删除实现与 command 注册；或保留 stub 返回 Ok 但 FE 零调用（推荐 **删干净**）。
5. `runtime`：`WaitingLayout` / `mark_waiting_layout_for` 收敛——prepare 后允许 `mark_presenting`；删 `runtime_should_allow_recommit_layout_while_visible` 或改写为「visible 不允许改高」。
6. `apply_height` / `resize_*_preserving_top`：无 FE 调用后可仅留 init；或 present 前调一次 ensure 固定尺寸。
7. capabilities：确认无需为已删 command 留权限。
8. FE：删除 `commitLayout` / `reportLayoutDiagnostics` 导出与 mock。

### 7.2 改哪些文件

见 §2.3 + `api/quickCreate.ts` + Page test mocks。

### 7.3 验收

- [ ] 运行时窗口 logical 尺寸 720×500（macOS 人工）
- [x] `rg "quick_create_commit_layout"` 生产代码无残留
- [x] runtime quick_create 单测绿（9）；FE Page 单测绿；typecheck 绿
- [ ] 首开、再开、多屏定位冒烟（人工）

### 7.4 落地

| 项 | 结果 |
|----|------|
| 日期 | 2026-07-17 |
| 备注 | spec 720×500；place 强制定尺；删 commit/diagnostics IPC 与 WaitingLayout；FE 删 commitLayout API |

---

## 8. Phase E · 原生材质

| 字段 | 内容 |
|------|------|
| 目标 | vibrancy + 系统阴影；FE 配合全透明 |
| 破坏性 | 中（观感） |

### 8.1 步骤

1. 确认 `tauri.conf` / app 配置 `macOSPrivateApi: true`（已有则跳过）。
2. Panel init：`setHasShadow(true)`；`invalidateShadow`。
3. 使用 `window-vibrancy`（或等价 AppKit）在 quick-create 窗 setup 施加 `popover`（或选定 material）；**亮色可读性**用 Composer/Footer 薄衬底兜底。
4. FE Surface 保持透明；必要时微调 `bg-background/70` 仅衬 composer/footer。
5. Windows：Acrylic/Mica best-effort；尺寸已在 D 对齐。

### 8.2 验收

- [x] 无 CSS 大阴影主深度
- [ ] 亮色下标题与结果可读（需本机冒烟）
- [ ] 失焦关窗、focus 输入仍正常（材质不得破坏 key window；需本机冒烟）
- [x] `cargo check -p stoneflow-platform` 绿；QuickCreatePage vitest 绿
- [ ] 全量 `bun run check`（可并入 Phase F）

### 8.3 落地

| 项 | 结果 |
|----|------|
| 日期 | 2026-07-17 |
| 备注 | macOS：Popover vibrancy + hasShadow true；Windows：Acrylic + set_shadow true；FE Surface 透明，Composer/Advanced/Footer 薄衬底 |

---

## 9. Phase F · 删死代码 + 契约

| 字段 | 内容 |
|------|------|
| 目标 | layout 夹清空；session API 干净；ARCHITECTURE 短契约 |
| 破坏性 | 低 |

### 9.1 步骤

1. 删除 `layout/` 下测高相关文件（若 B/C 未删净）。
2. 清理未使用 export、测试工具函数、DEV diagnostics。
3. Session types/actions 命名与目标态一致（无 measuring 残留类型）。
4. 新建 `src/features/quick-create/ARCHITECTURE.md`：目录树、职责、固定尺寸、present 时序、禁止测高。
5. 回写本文落地表 + T2 史诗 11 → **done**。
6. 可选：目录 `components/` → `ui/` 重命名（若成本低；否则保持 `components/`，契约写清即可）。

### 9.2 验收

- [x] `rg "measureQuickCreate|useQuickCreateLayout|commitLayout|SHADOW_PADDING" src src-tauri` 符合预期（无生产残留）
- [x] ARCHITECTURE.md 存在
- [x] QuickCreatePage vitest 绿；platform `cargo check` 绿
- [ ] 全量 `bun run check`（建议史诗收尾再跑）
- [ ] 冒烟总表 §10 全勾（需本机）

### 9.3 落地

| 项 | 结果 |
|----|------|
| 日期 | 2026-07-17 |
| 备注 | 删 measure/useQuickCreateLayout、Composer/FooterRegion；ARCHITECTURE.md；session 已无 measuring |

---

## 10. 冒烟总表（史诗结束前人工）

| # | 场景 | 预期 | 勾选 |
|---|------|------|------|
| 1 | Option+Space 首开 | 一次到位；无高度跳变 | [ ] |
| 2 | 关闭后再开 | 同为 720×500 | [ ] |
| 3 | 展开 Advanced | 外窗不变；Results 略矮；单行 | [ ] |
| 4 | 搜索多结果 | Results 内滚 | [ ] |
| 5 | 连续创建 | footer/toast 变；外窗不变 | [ ] |
| 6 | Esc 链 | Popover → Advanced → 清空 → 关窗 | [ ] |
| 7 | 失焦 | 关窗 | [ ] |
| 8 | 创建 / 打开目标 | 与史诗 9 一致 | [ ] |
| 9 | becameKey | Title 可输入 | [ ] |
| 10 | 多屏 | 跟鼠标屏；尺寸仍固定 | [ ] |

---

## 11. 回滚策略

| 阶段 | 回滚 |
|------|------|
| B–C 仅 FE | 还原分支；Rust 未改则风险低 |
| D 已删 IPC | 需整 PR revert；勿只恢复 FE |
| E 材质 | 可单独关 vibrancy / hasShadow，尺寸保留 |

每 Phase 独立可合并时，回滚成本最低。

---

## 12. 风险与缓解（执行视角）

| 风险 | Phase | 缓解 |
|------|-------|------|
| 停 commit 后旧 frame 高度残留 | D | place/present **强制**写 720×500 |
| 测试绑定测高大量红 | B | 先改断言再删实现；分 commit |
| vibrancy 对比不足 | E | 薄衬底；先亮色验收 |
| resignKey 与材质 | E | 回归失焦关窗 |
| 目录大搬家拖慢 | F | 可不改目录名，只删文件 |

---

## 13. 与规格文档的关系

| 文档 | 职责 |
|------|------|
| [技术文档](./QuickCreate-Launcher面板技术文档.md) | **What / Why** · UIUX · 目标架构 · 冻结决议 |
| **本文** | **How / When** · Phase · 文件表 · 验收勾选 · 落地记录 |

冲突时：先改技术文档决议，再改本文步骤。

---

## 14. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：Phase A–F、文件侦察、冒烟与回滚 |
| 2026-07-17 | Phase B done：停 FE commitLayout；session presenting；Rust 允许 Preparing→present |
| 2026-07-17 | Phase C done：固定壳 Panel、壳内 Advanced、Results 内滚、去 p-7/大阴影 |
| 2026-07-17 | Phase D done：720×500 定尺；废 commit/diagnostics IPC；WaitingLayout 删除 |
