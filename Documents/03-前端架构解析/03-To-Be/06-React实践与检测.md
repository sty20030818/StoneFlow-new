# T6 · React 实践与检测

> 状态：**T6 完成** · 2026-07-16  
> 原则：[`01-架构原则与术语.md`](./01-架构原则与术语.md)（P9–P11）  
> 工具基线：[`../附录/react-doctor/`](../附录/react-doctor/)（2026-07-15 · v0.7.8 · **51/100 Critical** · 271 issues）  
> 技能包：vercel-react-best-practices · vercel-composition-patterns · tanstack-router-best-practices · tanstack-query-best-practices  
> **不做：** 当场改生产代码修 doctor · 完整搬家（Migrate）· 逐模块契约（T7）

---

## 1. 目标结论

| 项 | 结论 |
|----|------|
| doctor 角色 | **实现气味与死代码雷达**；不替代 T0–T5 分层 |
| 基线 | **51/100 Critical** · 709 files · 271 issues（error 46 / warning 225） |
| 优先级 | **架构债（可删除性）> error 级 bug 味 > 死代码 M-0 > perf 微优化** |
| 与 Migrate | 大史诗后**复跑对比**；目标「不引入新 Critical 族」，不盲目刷分 |
| 桌面 N/A | Next RSC/SSR、多数 hydration、服务端 cache 规则对本 SPA **N/A** |

---

## 2. 项目检查表（落成可执行）

### 2.1 图例

| 标记 | 含义 |
|------|------|
| ✅ 必守 | 新代码 / 触达重构必须满足 |
| 📌 目标 | To-Be 已定，Migrate 收敛 |
| ⚪ 建议 | 有收益时做，不挡分层 |
| ⬛ N/A | 桌面 Tauri SPA 不适用 |

### 2.2 Vercel Composition Patterns

| 规则 | 标记 | StoneFlow 落地 |
|------|------|----------------|
| 避免 boolean props 丛林 | ✅ | Header/Sidebar/列表板用变体或 slot（T4/T5） |
| Compound components | ✅ | MainCard · EntityScene 槽位 |
| Provider 只露 state/actions/meta | ✅ | selection/submit/filter/bulk/danger（T3/T4） |
| 状态实现与接口解耦 | ✅ | 消费者不依赖 Zustand vs useState |
| children 优于 render props 堆叠 | ✅ | AppLayout / EntityScene |
| React 19：少 forwardRef 包袱 | ⚪ | 新代码跟 React 19；旧 shadcn 不强制一轮改 |

### 2.3 Vercel React Best Practices（桌面裁剪）

| 前缀 / 规则 | 标记 | 落地 |
|-------------|------|------|
| `async-parallel` 独立请求并行 | ✅ | loader / 多 ensure 用 Promise.all（T2/T3） |
| `async-defer-await` | ⚪ | 分支内再 await |
| `bundle-barrel-imports` 直 import | ✅ | feature **内**禁多层 barrel；**仅** `index.public` 作边界 |
| `bundle-dynamic-imports` | ⚪ | 重对话框/设置可后续 lazy；非第一优先 |
| `rerender-no-inline-components` | ✅ | 禁止组件内定义子组件 |
| `rerender-dependencies` primitive deps | ✅ | effect 依赖稳定；对齐 doctor fresh-deps |
| `rerender-functional-setstate` | ✅ | |
| `rerender-derived-state-no-effect` | ✅ | 能 render 算就不 effect |
| `rerender-move-effect-to-event` | ✅ | 交互逻辑进 handler |
| `rerender-transitions` | ⚪ | 非紧急导航/大列表 |
| `rerender-simple-expression-in-memo` | ⚪ | 勿过度 memo |
| `client-swr-dedup` | ⬛→Query | 用 TanStack Query，不用 SWR |
| Server / RSC 全家 | ⬛ | 非 Next SSR 应用 |
| `js-combine-iterations` / Set-Map | ⚪ | doctor 有信号；列表热路径再收 |

### 2.4 TanStack Router

| 规则 | 标记 | 落地（T2） |
|------|------|------------|
| file-based routes | ✅ | `routes/**` |
| pathless layout | ✅ | `_shell` |
| loader + ensureQueryData | ✅ | 详情/启动 |
| validateSearch + defaults | ✅ | 有 search 必校验 |
| Register 类型 / Link / intent preload | ✅ | 已配置 |
| route masks | ⚪ | 未强制 |
| lazy route 拆分 | ⚪ | 体量需要时再开 |

### 2.5 TanStack Query

| 规则 | 标记 | 落地（T3） |
|------|------|------------|
| key 数组 + factory + 层级 | ✅ | `taskKeys` 等 |
| 依赖入 key | ✅ | |
| mutation 后 invalidate | ✅ | 域内 + workspace |
| 定向 invalidate 优先 | 📌 | DATA-D1 Accept 默认全量；渐进 include |
| staleTime / gcTime 默认 | ✅ | 30s / 10min |
| select 投影 | ⚪ | 重渲染热点 |
| SSR dehydrate | ⬛ | |

### 2.6 架构纪律（本项目自有 · 高于 doctor）

| 项 | 标记 |
|----|------|
| components/routes/layout 禁 invoke | ✅ |
| shared 禁 app/layout/features | ✅ |
| feature 互依仅 public | ✅ |
| list-scene 仅 task hooks | ✅ |
| 无 URL/Query 双写 Zustand | ✅ |

---

## 3. react-doctor 基线精读

### 3.1 跑法（复跑用）

```bash
# 仓库根；归档建议复制到 Docs/03-前端架构解析/附录/react-doctor/
npx react-doctor@latest . --score --json-out /tmp/react-doctor.json
```

| 项 | 基线值（2026-07-15） |
|----|----------------------|
| 版本 | 0.7.8 |
| 文件 | 709 |
| 分数 | **51 / 100 Critical** |
| issues | **271**（error **46** · warning **225**） |
| 类别 | Maintainability 129 · Bugs 92 · Performance 45 · A11y 5 |

### 3.2 不复跑说明

T6 **精读已归档基线**，不强制同日重跑（成本/噪声）；Migrate 史诗后必须新档对比。若工具大版本升级，先记版本再比分数。

### 3.3 Top rules → 处置

| 次数 | rule | sev 倾向 | 映射 | 处置 |
|------|------|----------|------|------|
| 39 | `unused-export` | warn | 死代码 / public 未收窄 | **M-0 + public 收紧**；与 command 根 barrel 同向 |
| 39 | `only-export-components` | warn | 文件混导出 | **可忽略多数**（hooks/keys 同文件常见）；新代码倾向拆文件 |
| 20 | `no-effect-with-fresh-deps` | **error** | **SCN-D1** 三页 register preview + workspace sync | **M-3 list-scene 一并修**；workspace 稳定 deps（T3/T4） |
| 18 | `no-multi-comp` | warn | EntityScene 等多组件文件 | **Accept 短文件**；巨石再拆（SHELL） |
| 18 | `js-combine-iterations` | warn | perf | **later**；热路径再收 |
| 18 | `exhaustive-deps` | warn | effect 依赖 | 触达时修；与 fresh-deps 相关 |
| 16 | `no-ref-current-in-render` | **error** | render 读 ref.current | **穿插小 PR** 核实真 bug vs 误报 |
| 10 | `no-giant-component` | warn | ShellLayout/Header/CommandMenu… | **SHELL-D1 / PLAT** 拆分自然降 |
| 10 | `prefer-module-scope-pure-function` | warn | 纯函数位置 | ⚪ 触达改 |
| 10 | `unused-file` | warn | 死文件 | **M-0** |
| 8 | `js-set-map-lookups` | warn | perf | later |
| 6 | `rules-of-hooks` | **error** | CommandMenu / SpaceEditorDialog | **优先小 PR 核实**（条件 hooks 真问题） |
| 6 | `no-chain-state-updates` | warn | setState 链 | ⚪ |
| 5 | `prefer-use-effect-event` | warn | React 19 模式 | ⚪ |
| 5 | `no-array-index-as-key` | warn | 列表 key | 触达修 |
| 2 | `effect-needs-cleanup` | **error** | QC presenter / update events | **小 PR** 核 cleanup |
| 2 | `no-impure-state-updater` | **error** | selection / sidebar | **小 PR** |

### 3.4 Top 文件 → 架构动作

| 热点文件 | 次数级 | 架构动作 |
|----------|--------|----------|
| `useWorkspaceSync.ts` | 22 | 稳定订阅/deps；属数据生命周期，**非**再造分层 |
| `-detail-route-helpers.tsx` | 11 | 保持 routes 旁；逻辑可下沉 hooks（T2） |
| `EntityScene.tsx` | 10 | multi-comp Accept；逻辑已约定零业务 |
| `CommandMenu.tsx` | 10 | hooks 规则 + 巨件 → command feature 内拆 |
| 三列表 Page | fresh-deps | **SCN-D1 → useTaskListScene** 一处修三处 |
| `ShellLayout.tsx` | giant + 其它 | **SHELL-D1** 四块拆分 |
| Providers（filter/submit/preview） | 若干 | Composition 接口已定；实现触达净化 |

### 3.5 分类汇总：Gap / 新债 / 忽略

| 桶 | 内容 |
|----|------|
| **已在 Gap** | SCN-D1（三页 fresh-deps）· SHELL-D1（giant shell）· M-0 死代码（unused-file/export）· command 可删除性/barrel · RING 相关 import 健康 |
| **实现小债（可新开/穿插）** | rules-of-hooks（CommandMenu/SpaceEditor）· effect cleanup · impure updater · ref-in-render 核实 |
| **可忽略 / 低优先** | only-export-components 多数 · combine-iterations 全面清 · multi-comp 合理共置 · 供应链扫描与分层无关 |
| **误报风险** | 部分 `rules-of-hooks` 若落在 async 回调行号偏移；修前人工打开文件确认 |

---

## 4. 与 Migrate 史诗的绑定

| 史诗 | doctor 相关目标 |
|------|-----------------|
| **M-0** 零行为删除 | unused-file / 明显 unused-export 下降；空目录 task-drawer 等 |
| **M-1** shared 防火墙 | 不直接降 doctor 分；防回归 |
| **M-2** 壳拆分 | no-giant-component（Shell*）下降 |
| **M-3** 列表 DRY | **fresh-deps ×3 列表页合并消除**；workspace 可顺带稳 deps |
| 小刀 | badges Query、hooks 真 bug |
| 每史诗末 | `bun run check` **必绿**；doctor **建议复跑** |

### 4.1 复跑协议

```txt
1. 同一主要版本工具（或记录 major 变更）
2. 全量扫描 + --score + json 归档
   附录/react-doctor/post-<史诗>-YYYY-MM-DD.{log,diagnostics.json,README片段}
3. 对比：
   - 总分 / error 数
   - Top rules 是否出现新族
   - 本史诗触达路径的 issue 是否下降
4. 不要求单史诗打到 80+；要求不因重构引入成片新 error
```

### 4.2 分数解读纪律

| 错误解读 | 正确解读 |
|----------|----------|
| 「51 分所以架构错了」 | 分含大量 maintainability 警告与桌面无关噪声 |
| 「先刷 doctor 再分层」 | **先 T0–T5 / Gap 史诗**；doctor 验证副作用 |
| 「only-export-components=0 才健康」 | 与 hooks 共置冲突；不作为门禁 |

---

## 5. 新代码审查速查（PR 级）

```txt
[ ] 无组件内子组件
[ ] 无 components/layout 直 invoke
[ ] 跨 feature 只 public
[ ] effect 依赖稳定（对象/回调入 dep 有 memo 或下沉）
[ ] mutation 有 invalidate/event
[ ] 列表编排走 facade，不复制第三份
[ ] 直 import，不随手 export *
[ ] hooks 顶层调用
[ ] 有 search 则 validateSearch
```

---

## 6. 带入 T7 / Migrate

| # | 项 |
|---|-----|
| T7 | Accept/Fix 表并入 doctor 小债行（hooks/cleanup）可选 |
| Migrate | M-0 清单可引用 unused-file 列表（diagnostics） |
| 文档 | 根 T1 前端实践段可链本文（Batch A 时） |

---

## 7. T6 完成标准核对

| 波次要求 | 状态 |
|----------|------|
| Vercel/TanStack 项目检查表（含 N/A） | ✅ §2 |
| doctor 基线归档分数与 Top | ✅ §3（已有附录 + 精读） |
| 发现映射 Gap/新/忽略 | ✅ §3.5 |
| 大史诗复跑约定 | ✅ §4 |
| 未以刷分替代架构 | ✅ §1 |

---

## 8. 下一入口

→ **T7 · 边界契约 + Gap 映射 + Phase C 出口**  
填 [`模块边界契约.md`](./模块边界契约.md) · Top 债 Accept/Fix · 微调 Phase D 史诗序。

---

## 9. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-15 | 基线扫描归档（附录） |
| 2026-07-16 | **T6 定稿**：检查表 + 精读映射 + 复跑协议 |
