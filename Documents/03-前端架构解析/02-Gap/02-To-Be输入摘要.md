# Gap → To-Be 输入摘要

> 状态：**G5 定稿**（2026-07-15）  
> 用途：Phase C 开写 `03-To-Be/` 时的**唯一优先输入**（仍禁止在此写文件搬家清单）  
> 读者：自己 + AI  

---

## 1. 产品/架构目标（已锁定）

| 项 | 结论 |
|----|------|
| 可删除性 | 理想 A：删 feature ≈ 装配点 + route |
| 读者 | 自己 + AI，不写 onboarding 长文 |
| 依赖策略 | **As-Is 已画清 → To-Be 必须固化**（原决策 3=C 关闭点） |
| 范围 | 前端 only |
| 文档 | 细文档在 `Docs/03-前端架构解析`；`src/**/ARCHITECTURE` 保持短契约 |

---

## 2. 必须在 To-Be 拍板的边界问题

### 2.1 Feature 互依策略（关闭决策 3）

候选（Gap 推荐 **B′**）：

| 策略 | 内容 | Gap 依据 |
|------|------|----------|
| A 严格 | feature 互不 import，只经 shared/app | 过严；lifecycle/task 产品环做不到 |
| **B′ 推荐** | 允许依赖 **明确公共面**（api/query/core 类型）；禁止跨 feature 的 `ui/` 私有实现；platform 可被 domain/scene 依赖 | 与现状可收敛；禁 meta→task/ui |
| C 维持网状 | 仅靠纪律 | 不可删除性永久失败 |

### 2.2 壳装配目标形态

Gap 建议逻辑分层（名可变）：

```txt
ShellProviders → CommandBridge → ShellChrome → ShellOverlays
ShellLayout 仅编排
```

To-Be 需定：哪些 Provider 必须全局；新能力如何注册（禁止再堆进单文件）。

### 2.3 shared 准入

- **硬规则：** `shared` 不得 import `@/app` 或 `@/features`（lint）。  
- resolver / create-dialog-shell / submit-form-hook **不属于** shared。  
- types 可保留实体 DTO；禁止业务规则与 feature UI。

### 2.4 command 公开 API

- 根 `export *` 废除。  
- 外部只许：`core` 类型/ids、`runtime` hooks、`ui` 菜单、`adapters` 类型；实现绑定在壳 bridge。  
- `ShellNavigationTarget` 明确归属（command/adapters 或 navigation）。

### 2.5 Scene 编排

- 保留 thin/composition feature 目录对称（wontfix 合并目录）。  
- To-Be 定：共享列表 wiring 放 `features/task` 还是 `app/layouts` 旁（Gap 倾向 task 或 `features/task-list-scene` 轻模块，**不**塞 shared）。

### 2.6 删除与记忆策略

- M-0 死代码默认执行（To-Be 可一句话确认）。  
- settings 路径记忆：**默认不记忆**（NAV-D3），产品变更再开。

---

## 3. 推荐 Migrate 史诗顺序（供 D 阶段细化，非最终切片）

| 序 | 史诗 | 对应 Top 债 |
|----|------|-------------|
| M-0 | 零行为 Delete 包 + drawer store | #6 #8 |
| M-1 | shared 防火墙修复（+ 可选 barrel 头刀） | #1 #5 |
| 文档 Batch-C | layouts ARCHITECTURE | #13 |
| M-2 | Shell 拆分 + CommandBridge | #2 #3 |
| M-3 | 三列表 DRY + RING-META | #4 #7 |
| 小刀 | badges Query、裸 invoke | #9 #10 |
| 文档 A/B | T1 / INDEX | #14 |

---

## 4. 标杆模块（To-Be 应对齐，勿毁掉）

| 标杆 | 为何 |
|------|------|
| submit / danger / workspace | 薄边界、可插拔 |
| quick-create 分层 | runtime/domain/layout 分离 |
| navigation 职责切分 | URL 真相清晰 |
| styles token 序 | 视觉真相 |
| ultra-thin archive/trash | scene 可删样板 |
| selection Provider 模式 | 注册而非上帝 store |

---

## 5. 明确不在 To-Be 解决的

- 为抽象而拆 task/project 产品环  
- 强行合并 all/spaces route 叶子  
- 重命名 filter/view 等全仓狂欢  
- 无痛点的 invalidate 微优化  

---

## 6. 成功判据（To-Be 文档写完时）

To-Be 文档应能直接回答：

1. 新 feature 依赖谁合法？  
2. 新壳能力加在哪一层？  
3. shared 进什么、禁什么？  
4. 删一个 platform feature 的检查清单是什么？  
5. 与 Gap Top15 的一一对应（哪些 Accept / 哪些 Fix）  

**不要**在 To-Be 阶段展开完整 git 搬家表（那是 Migrate）。
