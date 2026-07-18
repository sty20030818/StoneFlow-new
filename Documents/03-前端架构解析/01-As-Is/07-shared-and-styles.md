# As-Is · 07 Shared · Styles · Test

> 状态：**W6 深挖完成**（2026-07-15）  
> 范围：`src/shared/**` · `src/styles/**` · `src/test/**`  
> 短契约：[`src/ARCHITECTURE.md`](../../../src/ARCHITECTURE.md) §4.3–4.4 · [`src/styles/ARCHITECTURE.md`](../../../src/styles/ARCHITECTURE.md)

---

## 0. 章结论速览

| ID | 路径 | 文件数 | 外部消费者约 | Delete | 评级 | 建议 |
|----|------|--------|--------------|--------|------|------|
| FE-S-UI | `shared/ui` 整体 | 95 | ~122 | 1 | **Debt–Acceptable** | Keep；拆债见下 |
| FE-S-UI-BASE | `ui/base` | 29 | 高 | 1 | **Optimal** | Keep |
| FE-S-UI-BOARD | `ui/board` | 4 | 中 | 2 | Optimal | Keep |
| FE-S-UI-ROW | `ui/row` | 10 | 中 | 2 | Optimal | Keep |
| FE-S-UI-DETAIL | `ui/detail` | 13 | 中 | 2 | Optimal | Keep |
| FE-S-UI-PATTERNS | `ui/patterns` | 20 | 高 | 2 | Acceptable | Keep；产品 chrome 类名堆 |
| FE-S-UI-SHORTCUT | `ui/shortcut-menu` | 5 | 中 | 3 | Optimal | Keep |
| FE-S-UI-MISC | `ui/*` 根文件 | ~14 | 中高 | 2–3 | **Debt** | 见分层泄漏 |
| FE-S-TYPES | `shared/types` | 8 | ~145 | 1 | Acceptable | Keep（契约层） |
| FE-S-LIB | `shared/lib` | 6 | ~103 | 2 | Optimal | Keep |
| FE-S-EVENTS | `shared/events` | 8 | ~18 | 2 | Acceptable | Keep |
| FE-S-QUERY | `shared/query` | 2 | ~10 | 3 | Acceptable | Keep |
| FE-S-AUTOSAVE | `shared/autosave` | 6 | ~14 | 3 | **Optimal** | Keep |
| FE-S-FORM | `shared/form` | 6 | ~4 | 3 | **Debt** | 修 shared→feature |
| FE-S-VALIDATION | `shared/validation` | 4 | ~4 | 4 | Optimal | Keep |
| FE-S-CONFIG | `shared/config` | **0** | 0 | **5** | Debt | **Delete 空目录** |
| FE-STYLES | `styles/` | 10 | 全局 | 1 | **Optimal** | Keep |
| FE-TEST | `test/` | 2 | 测试基建 | 2 | Optimal | Keep |

### 总判断

1. **shared 主体有价值：** base/board/row/detail/lib/autosave/validation/styles 边界清楚。  
2. **最大架构债（分层方向）：`shared` 反向依赖 `app` / `features`**  
   - `breadcrumbResolver.ts` → navigation + shell config + project types  
   - `create-dialog-shell.tsx` → `metadata-fields`  
   - `form/use-submit-target-from-form.ts` → `submit`  
   → 违反「shared 不依赖 features/app」不变式 → **SHR-D1 Critical 倾向**  
3. **`shared/types` 放领域 DTO 是有意契约层**（非业务判断），与「禁止 shared 业务逻辑」可并存；需纪律：只类型、无规则。  
4. **`shared/config` 空目录** → 删除。  
5. **styles token 体系**与短契约一致，评级 Optimal。  
6. **test** 已对齐 TanStack Router（非旧 react-router）。

---

## 1. `shared/` 总则（现行 vs 现实）

### 短契约允许

跨 feature、**不携带产品业务归属**的基建：UI primitive、事件封装、纯工具、共享类型、跨域 invalidate。

### 短契约禁止

task/project/space **专属业务判断**、feature 专属 API、单页组合逻辑、过早抽象。

### 现实偏差

| 偏差 | 位置 | 严重度 |
|------|------|--------|
| shared → app/navigation | breadcrumbResolver | **high** |
| shared → app/layouts | breadcrumbResolver (getSectionLabel) | **high** |
| shared → features/project | breadcrumbResolver 类型 | med |
| shared → features/metadata-fields | create-dialog-shell | **high** |
| shared → features/submit | form hook | med |
| types 含完整实体形状 | types/*.ts | low（契约可接受） |
| events 含领域事件名 | eventBus / taskChanged | low（总线必要） |
| patterns 含产品区块 class | patterns/* | low |
| 多处 barrel index | 见下 | med（CONVENTIONS） |

---

## 2. `shared/ui` 子域

### 2.1 FE-S-UI-BASE · `base/`（29）

| 字段 | 内容 |
|------|------|
| 职责 | shadcn/Radix 原子：button、dialog、sidebar、sheet、command… |
| 依赖 | React、Radix、lucide、`cn`、样式 token |
| 业务知识 | **无**（sidebar 注释提到 Space 仅为布局语义） |
| 评级 | **Optimal** |
| 建议 | Keep · 标准 primitive 层 |

### 2.2 FE-S-UI-BOARD · `board/`（4）

| 字段 | 内容 |
|------|------|
| 职责 | 通用 Board / Section 结构 + section 上下文菜单壳 |
| 消费者 | EntityScene adapters → domain boards |
| 评级 | Optimal |
| 建议 | Keep |

### 2.3 FE-S-UI-ROW · `row/`（10）

| 字段 | 内容 |
|------|------|
| 职责 | RowShell、字段 cells、行级结构 |
| 评级 | Optimal |
| barrel | `index.ts`、`cells/index.ts` |
| 建议 | Keep |

### 2.4 FE-S-UI-DETAIL · `detail/`（13）

| 字段 | 内容 |
|------|------|
| 职责 | 详情抽屉/页布局原语：Header/Body/Footer/Section/SaveStatus… |
| 消费者 | task detail 等 |
| 评级 | Optimal |
| 建议 | Keep |

### 2.5 FE-S-UI-PATTERNS · `patterns/`（20）

| 字段 | 内容 |
|------|------|
| 职责 | **纯 className / token 组合**（非组件逻辑） |
| 文件例 | `main-card.ts`, `shell-chrome.ts`, `shell-footer.ts`, `quick-create.ts`, `project-overview.ts`, `bulk-action.ts`, `settings-panel.ts`, `global-search.ts`… |
| 评价 | 无业务分支；但是 **产品表面清单** 堆在 shared |
| 评级 | Acceptable |
| 建议 | Keep；To-Be 可按 app/feature 就近放，非紧急 |

### 2.6 FE-S-UI-SHORTCUT · `shortcut-menu/`（5）

| 字段 | 内容 |
|------|------|
| 职责 | 菜单 digit 快捷键映射与 hint |
| 评级 | Optimal |

### 2.7 FE-S-UI-MISC · 根级文件

| 文件 | 职责 | 分层健康 |
|------|------|----------|
| AppScrollArea / OverlayScrollbar | 滚动容器 | ✅ |
| StatusNotice | 状态提示 | ✅ |
| badgeSemantics / linearSurface | 视觉语义 | ✅ |
| AppBreadcrumb | 面包屑展示组件 | ✅ 组件本身 |
| **breadcrumbResolver** | 由 ShellRoute 解析面包屑节点 | ❌ **依赖 app + project** |
| **create-dialog-shell** | 创建弹窗壳（含 Space 切换） | ❌ **依赖 metadata-fields** |
| create-modal-content | 模态内容结构 | 需保持无 feature 依赖 |

**breadcrumbResolver / create-dialog-shell 应迁出 shared：**

| 候选落点 | 理由 |
|----------|------|
| `app/layouts` 或 `app/navigation` 旁 | 强依赖 ShellRoute / section label |
| `features/*` 装配层 | create-dialog 已绑 metadata-fields |
| 或拆：纯 UI 留 shared，resolver 迁 app | 推荐 |

债 ID：**SHR-D1**（与 create-dialog、form 一并）。

---

## 3. `shared/types`（8 files）

```txt
task.ts, project.ts, space.ts, lifecycle.ts, view.ts, search.ts, taskPriority.ts, index.ts
```

| 字段 | 内容 |
|------|------|
| 职责 | 跨 feature 的 **实体 DTO / 输入输出类型** |
| 消费者 | ~145 文件（全栈前端） |
| 业务判断 | 文件内以 type 为主，未见复杂规则函数 |
| barrel | `index.ts` 大量 re-export |
| 与 project feature model | project 另有 `features/project/model/types`（W4 DOM-D3）— 部分重叠 |
| Delete | 1 |
| 评级 | Acceptable |
| 建议 | Keep 作契约层；To-Be 统一 project 类型单一来源；减少 barrel 直引可选 |

---

## 4. `shared/lib`（6 files）

| 文件 | 职责 |
|------|------|
| `utils.ts` | `cn` 等 |
| `date.ts` | 日期工具 |
| `scope.ts` | scope 纯工具 |
| `normalize-tauri-error.ts` | 错误归一 |
| `modal-guard.ts` / `global-chord-guard.ts` | 焦点/和弦守卫 |

| 评级 | Optimal |
| 依赖 | 无 feature |
| 建议 | Keep |

---

## 5. `shared/events`（8 files）

| 文件 | 职责 |
|------|------|
| `eventBus.ts` | 前端内部事件类型与订阅 |
| `taskChanged.ts` / `workspaceChanged.ts` | Tauri event → 前端 |
| `commandOpen.ts` | 命令打开意图事件 |
| `index.ts` | barrel |

| 评级 | Acceptable |
| 依赖 | `@tauri-apps/api/event`（合法平台边界） |
| 领域事件名 | 必要；非业务规则 |
| 建议 | Keep |

---

## 6. `shared/query`（2 files）

| 文件 | 职责 |
|------|------|
| `invalidation.ts` | `invalidateWorkspaceQueries` 按 domain root key 批量失效 |
| `queryStatus.ts` | 查询状态辅助 |

| 域 root | `tasks` `projects` `spaces` `lifecycle` `views` `activity` |
| 消费者 | workspace sync、Shell bulk refresh、约 10 处 |
| 评级 | Acceptable |
| 债 | 硬编码 domain 列表（与 feature keys 约定耦合）— 可接受的共享总线 |
| 建议 | Keep；W8 核对是否过宽 invalidate |

---

## 7. `shared/autosave`（6 files）

| 字段 | 内容 |
|------|------|
| 职责 | 通用 autosave 状态机 + `useAutosaveController` |
| 结构 | machine / types / hook + tests |
| 依赖 | 无 feature（adapter 注入） |
| 评级 | **Optimal** · 标杆共享模块 |
| 建议 | Keep |

---

## 8. `shared/form`（6 files）

| 文件 | 职责 |
|------|------|
| `use-zod-form.ts` | RHF + Zod 辅助 |
| `normalize-submit-error.ts` | 提交错误文案 |
| **`use-submit-target-from-form.ts`** | 表单 → **SubmitRegistry** 注册 |

| 评级 | **Debt**（因 → features/submit） |
| 修复方向 | 迁到 `features/submit` 或 `shared` 只留 zod/error，注册 hook 放 feature |
| 建议 | Keep 文件能力；**迁边界** |

---

## 9. `shared/validation`（4 files）

| 字段 | 内容 |
|------|------|
| 职责 | 通用字符串/URL 等校验 primitive |
| 评级 | Optimal |
| 建议 | Keep |

---

## 10. `shared/config`（empty）

| 字段 | 内容 |
|------|------|
| 文件 | 0 |
| 建议 | **Delete 空目录**（与 task-drawer 等同 Migrate-0） |

---

## 11. Barrel 清单（shared）

```txt
autosave/index.ts
events/index.ts
form/index.ts
types/index.ts
validation/index.ts
ui/board|detail|row|row/cells|shortcut-menu/index.ts
```

CONVENTIONS：默认无 barrel。shared 对内 re-export 常见，但 **扩大依赖图**（尤其 types/events）。  
债 **SHR-D2**：逐步改为直接路径 import（不必 W6 立刻改代码）。

---

## 12. `styles/`（10 files）· FE-STYLES

### 结构与 import 序（代码核对 ✅）

```txt
index.css:
  tailwindcss → tw-animate-css
  → fonts
  → tokens/primitive → semantic → layout → dark
  → adapters/shadcn
  → base → utilities
```

| 层 | 职责 |
|----|------|
| primitive | 原始色/字体/阴影值 |
| semantic | 产品语义 token |
| layout | 壳尺寸等 |
| dark | 暗色覆盖 |
| shadcn adapter | 兼容映射，**非**产品真相 |
| base/utilities | 全局基础与工具类 |

| 评级 | **Optimal** |
| 与 U1 | 对齐度未全文 diff（漂移只记若发现） |
| 建议 | Keep；禁止页面硬编码绕过 token |

---

## 13. `test/`（2 files）· FE-TEST

| 文件 | 职责 |
|------|------|
| `setup.ts` | Vitest：jest-dom、cleanup、ResizeObserver/matchMedia 桩 |
| `renderWithRouter.tsx` | **TanStack Router** memory history + QueryClient 测试渲染 |

| 评级 | Optimal |
| 旧路径 | 无 `test-utils`；已收口 |
| 建议 | Keep |

---

## 14. 依赖方向审计（W6 核心）

### 允许（理想）

```txt
app / features / routes → shared → styles
shared ↛ features
shared ↛ app
```

### 违规边（已证实）

```txt
shared/ui/breadcrumbResolver  → app/navigation/* , app/layouts/shell/config , features/project
shared/ui/create-dialog-shell → features/metadata-fields
shared/form/use-submit-target-from-form → features/submit
```

### 合法“领域味”但非违规

```txt
shared/types/*     实体 DTO
shared/events/*    领域事件名 + Tauri listen
shared/query/*     domain query root 失效
```

---

## 15. 质量债汇总（Gap）

| ID | 项 | 严重度 |
|----|-----|--------|
| **SHR-D1** | shared → app/features 三处反向依赖 | **high / Critical 候选** |
| SHR-D2 | 多 barrel 扩大依赖面 | med |
| SHR-D3 | project 类型双轨（shared vs feature model） | med（交叉 W4） |
| SHR-D4 | patterns 产品区块 class 膨胀 | low |
| SHR-D5 | `shared/config` 空目录 | low |
| STY-D1 | （无新发现）token 序勿乱 | — |

---

## 16. 可删除性

| 模块 | Delete 现实 |
|------|-------------|
| base/board/row/detail/lib | 1 — 基建 |
| types | 1 — 全局契约 |
| breadcrumbResolver 若迁走 | shared 变干净 |
| config 空目录 | 5 |
| autosave/validation | 3–4 若业务不用可卸 |

shared **不是**「可删 feature」层；目标是 **无反向依赖 + 无业务规则**。

---

## 17. 与前几 Wave 咬合

- W2 Shell / MainCard patterns → `patterns/main-card`、`shell-*`  
- W3 submit/metadata → 被 form/create-dialog **错误下沉**引用  
- W4 domain types → 大量来自 `shared/types`  
- W5 EntityScene → board/row  
- invalidate → W3 workspace / W8 数据面  

---

## 18. To-Be 候选（一句话，不定实现）

1. **迁出** breadcrumbResolver、create-dialog-shell、use-submit-target-from-form。  
2. 清空 `shared/config`、巩固「shared 零 feature import」CI 或 lint 边界。  
3. types 与 project model 收敛。  
4. styles 保持 token 真相。  

---

## 19. Session 收口

- W6 完成：shared/ui 子包 + types/lib/events/query/form/autosave/validation/styles/test  
- **最大发现：shared 分层泄漏 SHR-D1**  
- 标杆：autosave、ui/base、styles  
- **下一 Wave：W7** 依赖矩阵与耦合热点（可汇总 W1–W6）  
