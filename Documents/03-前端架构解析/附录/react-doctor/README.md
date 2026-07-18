# react-doctor 基线报告摘要

> 扫描时间：2026-07-15（会话日）
> 工具：React Doctor v0.7.8
> 范围：709 files · 全量
> 分数：**51 / 100 Critical**
> 原始：`baseline-2026-07-15.log` · `baseline-2026-07-15.diagnostics.json`

## 1. 总量

- issues 合计：**271**
- severity：{'warning': 225, 'error': 46}
- category：{'Maintainability': 129, 'Performance': 45, 'Bugs': 92, 'Accessibility': 5}

## 2. Top rules（按出现次数）

| 次数 | rule |
|------|------|
| 39 | `unused-export` |
| 39 | `only-export-components` |
| 20 | `no-effect-with-fresh-deps` |
| 18 | `no-multi-comp` |
| 18 | `js-combine-iterations` |
| 18 | `exhaustive-deps` |
| 16 | `no-ref-current-in-render` |
| 10 | `no-giant-component` |
| 10 | `prefer-module-scope-pure-function` |
| 10 | `unused-file` |
| 8 | `js-set-map-lookups` |
| 7 | `js-hoist-intl` |
| 6 | `rules-of-hooks` |
| 6 | `no-chain-state-updates` |
| 5 | `prefer-use-effect-event` |
| 5 | `no-reset-all-state-on-prop-change` |
| 5 | `no-array-index-as-key` |
| 4 | `async-await-in-loop` |
| 4 | `js-tosorted-immutable` |
| 3 | `rerender-memo-with-default-value` |

## 3. Top 文件（问题最集中）

| 次数 | 文件 |
|------|------|
| 22 | `src/features/workspace/model/useWorkspaceSync.ts` |
| 11 | `src/routes/_shell/-detail-route-helpers.tsx` |
| 10 | `src/app/layouts/entity-scene/EntityScene.tsx` |
| 10 | `src/features/command/ui/CommandMenu.tsx` |
| 7 | `src/features/selection/ui/EntityRowShortcutScope.tsx` |
| 6 | `src/features/filter/model/PageFilterProvider.tsx` |
| 6 | `src/features/submit/model/SubmitRegistryProvider.tsx` |
| 6 | `src/features/task/detail/model/TaskPreviewProvider.tsx` |
| 5 | `src/app/layouts/shell/ShellHeader.tsx` |
| 5 | `src/features/update/model/useUpdateEvents.ts` |
| 4 | `src/features/metadata-fields/core/metadata-date-options.ts` |
| 4 | `src/features/project/ui/ProjectPage.tsx` |
| 4 | `src/features/task/shortcuts/TaskRowShortcutScope.tsx` |
| 4 | `src/features/update/ui/UpdateDialog.tsx` |
| 4 | `src/shared/ui/base/sidebar.tsx` |

## 4. 与架构债的映射（**T6 精读** · 2026-07-16）

完整检查表与复跑协议：[`../../03-To-Be/06-React实践与检测.md`](../../03-To-Be/06-React实践与检测.md)

| doctor 信号 | 与 Gap / 债 | 建议时机 |
|-------------|-------------|----------|
| `no-effect-with-fresh-deps`（三列表 + workspace） | **SCN-D1**；workspace deps | **M-3** list-scene；sync 触达修 |
| `no-giant-component`（Shell* / CommandMenu） | **SHELL-D1** / command | **M-2** 壳拆分 |
| unused-file / unused-export | **M-0** 死代码；public 收窄 | **M-0** |
| `rules-of-hooks` / cleanup / impure updater / ref-in-render | 实现小债（非分层主轴） | 穿插小 PR（先人工核实） |
| `only-export-components` 多数 | 与 hooks 共置冲突 | **可忽略**作门禁 |
| `js-combine-iterations` 等 | perf | later / 热路径 |
| import 环 | W7 · RING-META | M-1–M-3 边界 |

## 5. 使用约定

- 本报告 = **迁移前基线**，不单独驱动 To-Be 分层设计。
- **T6 已完成**精读与项目检查表。
- M-0 / M-1 / M-2 / M-3 后各复跑一次，对比分数与 error 族（见 T6 §4）。

---

## 6. Phase D 复跑（2026-07-16 · post-phase-d）

> 工具：React Doctor **v0.7.8**（与基线同主版本）
> 范围：741 files · 全量
> 分数：**51 / 100 Critical**（与基线持平）
> 原始：`post-phase-d-2026-07-16.log` · `post-phase-d-2026-07-16.diagnostics.json`

### 6.1 总量对比

| 指标 | 基线 2026-07-15 | Phase D 后 | Δ |
|------|-----------------|------------|---|
| 文件 | 709 | 741 | +32（路径搬家 / 新文件计数） |
| 分数 | 51 Critical | 51 Critical | 0 |
| issues | 271 | 262 | **−9** |
| error | 46 | 43 | **−3** |
| warning | 225 | 219 | **−6** |

类别（post）：Maintainability 127 · Bugs 86 · Performance 44 · A11y 5。

### 6.2 关键 rule 变化

| rule | 基线 | post | Δ | 解读 |
|------|------|------|---|------|
| `no-effect-with-fresh-deps` | 20 | 17 | **−3** | 三列表页（inbox/all-tasks/no-project）壳删除后消除；workspace 仍占多数 |
| `exhaustive-deps` | 18 | 15 | **−3** | 随列表收口略降 |
| `unused-export` | 39 | 37 | −2 | public 收窄有限收益 |
| `no-giant-component` | 10 | 9 | −1 | `ShellLayout` 巨件消失；Header/Sidebar/CommandMenu 等仍在 |
| `unused-file` | 10 | 11 | +1 | 噪声/路径变动，非回归主轴 |
| `rules-of-hooks` / `no-ref-current-in-render` | 6 / 16 | 6 / 16 | 0 | 未作为本阶段目标 |

### 6.3 仍热点（非分层门禁）

- `useWorkspaceSync.ts`（22）— deps/handler 稳定化，**独立小刀**
- `-detail-route-helpers.tsx`（11）
- `CommandMenu` / `EntityScene` / Providers — 实现债，非 Phase D 未交付

**结论：** 重构**未引入成片新 error**；总分未升因大量 maintainability 警告与 workspace fresh-deps 仍在。符合 T6「不要求单史诗 80+，要求不因重构引入成片新 error」。

### 6.4 复跑命令

```bash
npx react-doctor@latest . -y --verbose --json \
  --json-out Documents/03-前端架构解析/附录/react-doctor/post-phase-d-YYYY-MM-DD.diagnostics.json
# 人类可读另存：tee …/post-….log（勿单独 --score，会只输出数字）
```

---

## 7. T2 POLISH 复跑（2026-07-18 · post-polish）

> 工具：React Doctor **v0.8.1**（基线/Phase D 为 v0.7.8；规则集有漂移，**分数口径对齐即可**）
> 分数：**51 / 100 Critical**（与 Phase D 持平 · 验收「不恶化」）
> 原始：`post-polish-2026-07-18.diagnostics.json`

### 7.1 总量对比

| 指标 | Phase D 2026-07-16 | POLISH 后 | Δ |
|------|--------------------|-----------|---|
| 分数 | 51 Critical | 51 Critical | 0 |
| issues | 262 | 268 | +6（含工具升级噪声） |
| error | 43 | **40** | **−3** |
| warning | 219 | 228 | +9 |

### 7.2 本轮代码侧动作（对照）

- public 收窄：command / task / bulk-action / metadata-fields / shell-dialogs
- 兼容窗删除：`goSettings`、dialog 旧 selectors、sidebar deprecated 字段
- 体量：`CommandMenu` ~1541 → 壳 196 + 5 子模块

### 7.3 仍热点（T2 后债 · 不挡收口）

- `unused-export` 仍高（public 收窄后包内 re-export 仍会被扫）
- `TaskRowShortcutScope` / `SettingsSyncPanel` / `ShellSidebar` 等 >400 巨石
- `useWorkspaceSync` fresh-deps
