# React Doctor 健康治理方案

| 项目     | 内容                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------ |
| 文档名称 | React Doctor 健康治理方案                                                                              |
| 日期     | 2026-07-20                                                                                             |
| 状态     | **W0–W4 + unused 清理已落地**（Bugs error = 0；可读分 71）                                             |
| 策略代号 | **B + 选择性 C**                                                                                       |
| 基线报告 | `Documents/98-归档/04-前端架构解析-2026-07/附录/react-doctor/post-archive-2026-07-20.diagnostics.json` |
| 基线分数 | **52 / Critical**（39 error · 224 warning · 263 总计）                                                 |

---

## 0. 决策摘要

### 0.1 为什么做

- 需要可操作的「前端健康」尺子；react-doctor 总分可作仪表，但不能当架构真理。
- 基线已复跑：无成片回归，但存在少量真 Bugs（尤其 Rules of Hooks）与一批可点杀的正确性债。
- 模块边界主线已收口；本主题**只治健康债**，不重开 feature 切分史诗。

### 0.2 为什么不冲 95

| 理由     | 说明                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------- |
| 口径绑架 | `only-export-components`、粗扫 `unused-export` 与现有「同文件 type+hook+组件 / feature public」冲突 |
| ROI      | 优质开源示例多在 ~78–84；95 接近「几乎无 warning 规则」                                             |
| 风险     | 为拆而拆、乱删 export，会伤边界与可维护性                                                           |

### 0.3 单一推荐

```txt
B（主线）  清 Bugs error + 有把握的 Bugs warning
C（辅线）  ignore 架构冲突噪声；只收窄「确认内部死符号」
不做      为分数拆巨石、全库消 unused-export、Performance 微优化大扫
```

**可读分数目标（去噪后）：75–85。**
**正确性目标：Bugs error = 0（或仅剩已文档化 + ignore 的有意模式）。**

---

## 1. 健康如何衡量（替换「只看总分」）

| 尺子                       | 衡量什么          | 本主题角色               |
| -------------------------- | ----------------- | ------------------------ |
| Bugs **error** 条数        | 正确性雷区        | **主 KPI**               |
| 去噪后 doctor 分数         | 静态健康趋势      | **辅 KPI**（目标 75–85） |
| `check-feature-boundaries` | 跨 feature 乱引用 | 收窄 export 时回归       |
| `src/**/ARCHITECTURE.md`   | 意图与边界        | 改动不得违背             |
| 关键路径手测 / 既有单测    | 行为未坏          | 每波次必过               |

**明确不作为 KPI：** 原始总分冲 95；Maintainability 警告清零；Performance 微规则清零。

---

## 2. 规则分拣清单

### 2.1 P0 · 必修（真正确性 · 属 B）

| 规则                                                 | 基线量级   | 动作             | 主落点（基线）                                                                                |
| ---------------------------------------------------- | ---------- | ---------------- | --------------------------------------------------------------------------------------------- |
| `rules-of-hooks`（条件调用 / early return 前 hooks） | 4 条同文件 | **必修**         | `CommandMenuSelectionChips.tsx`（`return null` 在 hooks 前）                                  |
| `effect-needs-cleanup`                               | 1          | **必修**         | `useUpdateEvents.ts`                                                                          |
| `no-impure-state-updater`                            | 2          | **必修或文档化** | `useEntitySelection.ts`；`sidebar.tsx`（偏 shadcn，优先最小修复，否则 ignore + 注释）         |
| `rules-of-hooks`（useEffectEvent 用于事件回调）      | 2          | **案例判断**     | `SpaceEditorDialog.tsx`：若符合 React 同组件事件回调契约 → **ignore + 短注释**；若真误用 → 改 |

### 2.2 P1 · 应修（Bugs · 属 B，逐条判断）

| 规则                                                                   | 基线量级                           | 动作           | 说明                                                               |
| ---------------------------------------------------------------------- | ---------------------------------- | -------------- | ------------------------------------------------------------------ |
| `no-effect-with-fresh-deps`                                            | 15 error（+ 重叠 exhaustive-deps） | **点杀**       | 优先 `useWorkspaceSync.ts`（11 条同源）；再 scene hooks / 测试夹具 |
| `exhaustive-deps`                                                      | 13 warning                         | 随 P1 一并收   | 勿盲目加 deps 制造循环                                             |
| `prefer-use-effect-event`                                              | 4                                  | 点杀           | 主要在 `EntityRowShortcutScope`                                    |
| `no-array-index-as-key`                                                | 6                                  | 有稳定 id 则修 | 无稳定 id 可保留并注释                                             |
| `no-adjust-state-on-prop-change` / `no-reset-all-state-on-prop-change` | 20 + 5                             | **案例判断**   | 对话框 `open`/`entity` reset 多为合法；非法双源再改                |
| `no-derived-state*` / `no-effect-chain` / `no-pass-data-to-parent` 等  | 少                                 | 点杀或文档化   | 不强求一轮清零                                                     |

### 2.3 P1b · `no-ref-current-in-render`（15 error · 专项策略）

你们大量用于：**事件桥 latest 回调、preview source 注册、shortcut 闭包同步**。

| 选项                                                             | 何时用                           |
| ---------------------------------------------------------------- | -------------------------------- |
| A. 改为 `useEffect` / `useLayoutEffect` 同步                     | 改动小、行为等价时               |
| B. 改为 `useEffectEvent`（若版本与约定允许）                     | 回调最新值场景                   |
| C. **保留 + 文件级/规则 ignore + ARCHITECTURE 一句「有意模式」** | 桥接层已稳定、强行 effect 更抖时 |

本主题默认：**能 A/B 则 A/B；桥接层可 C，但不假装「没问题而不记录」。**
目标：error 列表里要么消失，要么变成「已登记有意模式」。

### 2.4 P2 · 选择性 C（架构向）

| 项                                                                               | 做                                                                        | 不做                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `react-doctor` / 项目 ignore 配置                                                | ignore：`only-export-components`；必要时对「已文档化有意模式」精确 ignore | 全局关闭所有 Bugs 规则                      |
| `unused-export` / `unused-file`                                                  | 只删**确认内部、无边界契约**的死符号；与 `check-feature-boundaries` 对齐  | 为消警告收窄 public API、拆 barrel 到不可用 |
| `no-multi-comp` / `no-giant-component`                                           | 仅当本就计划拆、且职责已混杂                                              | 为分数拆 `CommandMenu` / Shell 等           |
| Performance（`js-combine-iterations`、`js-set-map-lookups`、`js-hoist-intl` 等） | 热点路径顺手可改                                                          | 单独开波次扫全库                            |
| `unused-dependency`                                                              | 核实后删或补引用                                                          | 误报（Tauri 插件动态用）则保留并 ignore     |

### 2.5 明确排除（本主题不做）

- 为 `only-export-components` 大规模「一文件一组件」搬迁
- 全库 `unused-export` 清零
- 巨石组件为分数而拆
- 以 95 分为验收门禁
- 重开模块治理 / feature 边界史诗

---

## 3. 重构计划（波次）

建议 **4 个短波次**；每波次可独立合并、独立复跑 doctor。
假设：不并行大改产品功能；每波次 diff 保持可审。

### 波次 W0 · 基线固化与尺子（0.5 日）

**产出**

- [x] 基线 JSON 已落盘（2026-07-20）
- [x] 引入项目级 `doctor.config.json`
- [x] 将 `only-export-components` 设为 `off`（与 feature 文件组织冲突）
- [x] 忽略 `Documents/**` / `openspec/**` / `**/*.md`（非运行时）
- [x] 本目录 README / 本方案作为执行真源；INDEX 指路

**验收**

- [x] 去噪后 `only-export-components` = 0
- [x] 记录写入附录表

### 波次 W1 · P0 真 Bugs（0.5–1 日）

**清单**

- [x] `CommandMenuSelectionChips`：hooks 提到 early return 之前
- [x] `useUpdateEvents`：`setTimeout` 同步挂载 + 保证 cleanup
- [x] `useEntitySelection` impure updater：去掉 updater 内副作用
- [x] `sidebar.tsx`：嵌套 setState 拆出 updater
- [x] `SpaceEditorDialog` useEffectEvent：inline suppress（合法事件回调用法）

**验收**

- [x] 相关单测通过
- [x] doctor：P0 相关 error 消失
- [x] post-W1：62 Needs work · error 30

### 波次 W2 · fresh-deps / 订阅稳定（1–2 日）

**清单**

- [x] `useEventSubscription`：handler 经 `useLatestRef`，根治 `useWorkspaceSync` 成片 fresh-deps
- [x] `useRegisterTaskPreviewSource`：依赖拆字段
- [x] 场景 hooks / 测试夹具随之下降

**验收**

- [x] 相关测试通过
- [x] post-W2：67 Needs work · error 16（仅剩 ref-in-render）

### 波次 W3 · ref-in-render 专项（1–2 日）

**清单**

- [x] 新增 `src/shared/lib/useLatestRef.ts`，事件桥 / 快捷键统一改用
- [x] Symbol / store 惰性初始化改为 `useState(() => …)`
- [x] `useLauncherLifecycleBridge` 等 render 写 ref → `useLayoutEffect`

**验收**

- [x] Bugs **error = 0**
- [x] post-W3：70 Needs work · error 0 · warning 185

### 波次 W4 · 选择性收窄与收尾（0.5–1 日）

**清单**

- [x] 删除误入扫描的临时分析脚本；配置忽略文档树
- [x] 核实并移除前端未使用的 `@tauri-apps/plugin-dialog`（Rust 侧 dialog 插件保留）
- [x] Symbol token 改为 `useState` 惰性初始化（消 `rerender-lazy-ref-init`）
- [x] **未**全库清 `unused-export` / **未**为 `no-multi-comp` 拆文件（按方案）
- [x] 复跑 doctor；更新附录
- [ ] 长期有意模式：视需要回写相关 `ARCHITECTURE.md`（非必须）
- [ ] 主题整体移入 `98-归档/`（观察稳定后另开）

**验收**

- [x] 相关测试通过
- [x] post-W4：70 Needs work · **error 0** · warning 177
- [ ] 去噪分 75–85：当前 **70**，未强行冲分；若要再升，优先点杀 Bugs warning 或评估扩大 ignore（见 §7）

---

## 4. 执行约束（防范围膨胀）

1. **外科手术**：只改与当前波次清单直接相关的代码；不顺手重构无关模块。
2. **架构优先于分数**：与 `ARCHITECTURE.md` / 模块决议冲突时，改 ignore 或文档化，不改决议。
3. **收窄可逆**：删 export 前确认无动态 import / 测试深路径；不确定则不删。
4. **每波次复跑**：命令见 §6；结果追加到附录，不覆盖基线文件。
5. **不主动 commit**：除非用户明确要求。

---

## 5. 风险与回滚

| 风险                                     | 缓解                                                        |
| ---------------------------------------- | ----------------------------------------------------------- |
| 改订阅稳定化导致漏刷新 / 过度刷新        | W2 手测：多事件连发、archive、lifecycle；对照 debounce 行为 |
| 改 ref 同步导致快捷键 / preview 过期闭包 | W3 分文件改；事件桥优先文档化而非硬改                       |
| ignore 过多掩盖真问题                    | ignore 必须写 rationale；Bugs 规则默认不全局关              |
| 删 export 误伤                           | 先搜引用 + 跑 test + boundaries；public `index.ts` 默认不动 |

回滚：按波次 revert；配置与代码分开提交更易回滚。

---

## 6. 复跑命令

```bash
npx react-doctor@latest . -y --verbose --json \
  --json-out "Documents/02-重构方案/06-ReactDoctor健康治理/runs/post-W0-YYYY-MM-DD.diagnostics.json"
```

说明：

- 人类可读可 tee 到同目录 `.log`
- 基线保留在归档附录，不覆盖
- 运行产物可临时输出到任意路径；不必在本主题下长期保留 `runs/`

---

## 7. 预期结果（诚实区间）

| 节点           | Bugs error（业务） | 去噪后分数（估） | 备注                         |
| -------------- | ------------------ | ---------------- | ---------------------------- |
| 基线（未去噪） | 39                 | 52 Critical      | 含噪声                       |
| W0 后          | ~39                | 略升 / 警告下降  | only-export off              |
| W1 后          | 明显下降           | 62               | P0                           |
| W2 后          | fresh-deps ≈ 0     | 67               | 订阅稳定                     |
| W3 后          | **0**              | **70**           | 主验收（error=0）达成        |
| W4 后          | **0**              | **70**           | 文档忽略 + 依赖清理；未冲 75 |

若要坚持进入 75–85：优先点杀剩余 Bugs **warning**（`no-adjust-state-on-prop-change` 等需案例判断），或评估对 `no-multi-comp` / 粗扫 `unused-export` 做**受控 ignore**——**不要**为分数拆巨石。

---

## 8. 附录

### 8.1 基线 error 规则分布（2026-07-20）

| 规则                        | 约计数 | 波次  |
| --------------------------- | ------ | ----- |
| `no-ref-current-in-render`  | 15     | W3 ✅ |
| `no-effect-with-fresh-deps` | 15     | W2 ✅ |
| `rules-of-hooks`            | 6      | W1 ✅ |
| `no-impure-state-updater`   | 2      | W1 ✅ |
| `effect-needs-cleanup`      | 1      | W1 ✅ |

### 8.2 复跑记录

| 日期       | 标签              | 分数              | error | warning | 备注                                      |
| ---------- | ----------------- | ----------------- | ----- | ------- | ----------------------------------------- |
| 2026-07-20 | 基线 post-archive | 52 Critical       | 39    | 224     | 归档附录 JSON                             |
| 2026-07-20 | post-W0           | 52 Critical       | 39    | 192     | only-export 清零；分仍被 error 按住       |
| 2026-07-20 | post-W1           | 62 Needs work     | 30    | 192     | P0 清完                                   |
| 2026-07-20 | post-W2           | 67 Needs work     | 16    | 179     | fresh-deps 清完                           |
| 2026-07-20 | post-W3           | 70 Needs work     | **0** | 185     | ref-in-render 清完                        |
| 2026-07-20 | post-W4           | **70 Needs work** | **0** | 177     | 忽略 Documents；移除 FE plugin-dialog     |
| 2026-07-20 | post-unused       | **71 Needs work** | **0** | 128     | 恢复 dialog；unused→0；shadcn 库存 ignore |
| 2026-07-20 | post-bugs-perf    | **86 Great**      | **0** | 39      | Bugs+Performance 点杀；合法 reset ignore  |

### 8.3 相关文档

- 归档卷宗（历史，不改码依据）：`Documents/98-归档/04-前端架构解析-2026-07/`
- 日常权威：`src/ARCHITECTURE.md`、`src/CONVENTIONS.md`
- 配置：仓库根 `doctor.config.json`
- doctor 历史 README：`…/附录/react-doctor/README.md`
- 各波次原始 JSON 不必长期保留；复跑结论见 §8.2
