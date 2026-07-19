# M-F-DANGER · features/danger-confirm

> 日期：2026-07-17  
> 状态：**decided（方案对比 · 小平台标杆）** · **decide-only**  
> 路径：`src/features/danger-confirm`  
> 类型：**platform**  
> 切分总览：**Keep**（不并 bulk）  
> 关联：bulk runtime · task/project/lifecycle 菜单 · layout ShellProviders  

---

## A. 现网事实

### A.1 一句话

**危险操作统一确认**：调用方 `requestConfirm(request) → Promise<boolean>`；文案由纯函数 `buildDangerConfirmCopy` 生成；Provider 挂 AlertDialog。

### A.2 结构（很干净）

```txt
danger-confirm/
  model/dangerConfirm.ts     类型 + buildDangerConfirmCopy（纯）
  runtime/DangerConfirmProvider.tsx  队列/Promise + Dialog
  components/DangerConfirmDialog.tsx
  index.ts
```

约 6 文件 / &lt;450 行。

### A.3 意图

`archive` | `trash` | `permanent-delete`  
实体：`task` | `project` | `space` | `lifecycle-entry`

### A.4 消费者

- bulk `BulkActionProvider`（requiresConfirm）  
- task / project / lifecycle 菜单与详情  
- layout Sidebar（删 space 等）  

### A.5 已做对的

- **model / runtime / UI 分离**  
- 纯文案可单测  
- 壳挂 Provider，调用方无自建第二套确认  
- **无** layout 倒依赖、无实体 mutation  
- 切分：**Keep**，勿并 bulk（单条确认也要用）  

### A.6 小问题

| 问题 | 说明 |
|------|------|
| intent 集合固定 | 扩展「归档并通知」等要改 model |
| 与 bulk 内 confirm copy | bulk 也有 confirm 文案路径——需 **单一走 danger-confirm**（bulk 已用 useDangerConfirm 则 OK） |
| Sidebar 直调 | 正确；不要在 layout 复制 Dialog |

---

## B. 边界争议

| 候选 | 现在 | 目标 |
|------|------|------|
| 确认 Promise API | danger-confirm | **Keep** |
| 文案工厂 | model | Keep；实体可覆盖 label |
| 并 bulk | — | **否** |
| 并 shared | — | 不强制；有业务 intent 词汇，Keep feature 更清晰 |
| 业务「是否危险」规则 | 调用方 / bulk action 定义 | **不在** danger-confirm |

---

## C. 多方案对比

### 方案 N1 · 巩固现网（**已接近最优**）

| 优点 | 缺点 |
|------|------|
| 标杆 | 无大缺点 |

**结论：推荐基线。**

---

### 方案 N2 · 并入 bulk-action

| 优点 | 缺点 |
|------|------|
| 少包 | 非 bulk 的单条删除也依赖 bulk；B3 引擎应更瘦 |

**结论：否**（切分总览一致）。

---

### 方案 N3 · 并入 shared/components

| 优点 | 缺点 |
|------|------|
| 更底层 | intent 文案带产品语义；Provider 装配偏 app |

**结论：不优先。**

---

### 方案 N4 · 取消，各处 AlertDialog

| 优点 | 缺点 |
|------|------|
| 无 | 文案与交互分叉 |

**结论：否。**

---

## D. 推荐 = **N1 Keep**

### D.1 职责

| 负责 | 不负责 |
|------|--------|
| 危险确认 UI + Promise API | 是否执行删除 |
| 标准 intent 文案 | 实体业务规则 |
| 壳级单例 Dialog | 批量执行管道（bulk） |

### D.2 协作

```txt
ShellProviders → DangerConfirmProvider
任意 mutation 前
  ok = await confirm({ intent, entityType, count, entityLabel? })
  if (!ok) return
  → task/project/space/lifecycle public 或 runBulkAction
bulk action.requiresConfirm → 内部走同一 useDangerConfirm
```

### D.3 与 bulk B3

bulk **执行**；danger-confirm **确认**。  
action 定义 `requiresConfirm`；runtime 调 danger-confirm——**不要**在 bulk 再实现第二套 Dialog。

---

## E. 最佳实践

**Do**

- 所有归档/进站/永久删除走同一 hook  
- 文案纯函数 + 可测  
- 确认与执行分离  

**Don't**

- 在 danger-confirm 里调 deleteTask  
- 每页自写 AlertDialog 文案  
- 并进 bulk 导致非 bulk 路径尴尬  

---

## F. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | 审计：是否仍有裸 AlertDialog 危险路径 → 收口 |
| 2 | bulk 确认 100% 经 danger-confirm（已有则文档钉死） |
| 3 | （可选）扩展 intent 时只改 model + 测试 |

---

## G. 决议

| # | 决议 |
|---|------|
| 1 | **Keep** danger-confirm |
| 2 | 目标 **N1**；已是标杆，维持 |
| 3 | **不并** bulk / shared |
| 4 | decide-only |

### 开放问题

- [ ] 是否需要 `intent: 'archive-space'` 等更细文案（现 entityType+intent 组合）  
- [ ] 确认中 loading 防重复点击（产品体验后议）  

---

## H. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：标杆判定、N1–N4、与 bulk 分工 |
