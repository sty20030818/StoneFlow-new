# T7 · Phase C 出口与 Gap 映射

> 状态：**Phase C 出口通过** · 2026-07-16  
> 前置：T0–T6 定稿 · 本波契约 [`模块边界契约.md`](./模块边界契约.md)  
> 下一阶段：[`../04-Migrate/重构切片路线图.md`](../04-Migrate/重构切片路线图.md)

---

## 1. Gap Top 15 → Accept / Fix

| # | ID | 标题 | **取向** | To-Be 锚点 | Migrate |
|---|-----|------|----------|------------|---------|
| 1 | SHR-D1 | shared→app/features | **Fix** | T0 P5 · T1 §6 · 契约 shared | **M-1** |
| 2 | SHELL-D1 | God ShellLayout | **Fix** | T4 四块拆分 | **M-2** |
| 3 | PLAT-D2 | CommandActions 焊死 | **Fix** | T4 CommandBridge slices | **M-2** |
| 4 | SCN-D1 | 三列表复制 | **Fix** | T5 `useTaskListScene` | **M-3** |
| 5 | PLAT-D1 | command/bulk 根 barrel | **Fix** | T1/T5 public 收窄 | M-1 尾 / M-2 |
| 6 | M-0 包 | 空目录/healthcheck/SpaceLayout… | **Fix** Delete | T5 · T6 unused | **M-0** |
| 7 | RING-META | meta→task/ui | **Fix** 单向 | T5 metadata 契约 | M-3 旁路 |
| 8 | DATA-D3 | drawer store 半死 | **Fix** Delete | T3 URL 唯一 | **M-0** |
| 9 | DATA-D2 | badges 绕过 Query | **Fix** | T3 | **小刀** |
| 10 | DATA-D5 | shell 裸 invoke | **Fix** | T3 api 收口 | **小刀** |
| 11 | DOM-D1 | space api 壳职责 | **Later** | 可 Extract | later |
| 12 | SHR-D3 | project 类型双轨 | **Later** | 收敛类型 | later |
| 13 | DRIFT-C | layouts ARCHITECTURE | **Fix** 文档 | DOC-DRIFT Batch-C | 文档 |
| 14 | DRIFT-A/B | T1 / INDEX | **Fix** 文档 | 定点回写不整本重写 | 文档 |
| 15 | NAV-D3 | settings 记忆 | **Accept** | T0/T2 默认不记忆 | — |

### 1.1 明确 Accept / wontfix（非 Top 或已声明）

| 项 | 取向 | 理由 |
|----|------|------|
| DATA-D1 广 invalidate | **Accept 短期** | T3：正确性优先；渐进 include |
| DATA-D6 search/display 不在 workspace | **Accept** | 正确默认 |
| RTE-D1 all/spaces 双叶子 | **Accept** | 不合并 route 文件；DRY 在 hooks |
| task↔project 产品环 | **Accept** | 不拆产品 |
| only-export-components 门禁 | **Accept 忽略** | T6 |

---

## 2. To-Be 成功判据核对（Gap 输入摘要 §6）

| # | 问题 | 答案文档 |
|---|------|----------|
| 1 | 新 feature 依赖谁合法？ | T0 P8 · T1 矩阵 · T5 分类 |
| 2 | 新壳能力加在哪一层？ | T4 §6 清单 |
| 3 | shared 进什么、禁什么？ | T0 P5 · T1 · 契约 §2.4 |
| 4 | 删 platform feature 检查清单？ | 契约 §4 · §6 |
| 5 | Top15 Accept/Fix？ | **本文 §1** |

---

## 3. Phase C 出口检查

| 项 | 状态 |
|----|------|
| T0 原则与术语冻结 | ✅ `01-架构原则与术语.md` |
| T1 分层与依赖矩阵 | ✅ `目标架构.md` |
| T2 路由与导航生命周期 | ✅ `02-路由与导航生命周期.md` |
| T3 数据与状态生命周期 | ✅ `03-数据与状态生命周期.md` |
| T4 壳与平台拼装 | ✅ `04-壳与平台拼装.md` |
| T5 Feature 模块化 | ✅ `05-Feature模块化.md` |
| T6 React 实践 + doctor | ✅ `06-React实践与检测.md` + 附录基线 |
| T7 模块边界契约 | ✅ `模块边界契约.md` |
| T7 Gap Accept/Fix | ✅ 本文 §1 |
| T7 Phase D 史诗序 | ✅ 本文 §4 · Migrate 路线图 |
| 无完整 git 搬家表混入 To-Be | ✅ |
| 根 Docs P1–T2 未整本重写 | ✅（仅漂移待 Batch） |

**Phase C · To-Be 完成。** 可进入 Phase D · Migrate（按史诗改代码）。

---

## 4. Phase D 史诗序（冻结建议 · 可微调切片）

| 序 | 史诗 | 目标 | 对应债 | 验收 |
|----|------|------|--------|------|
| **M-0** | 零行为 Delete | 空目录、healthcheck、drawer store、SpaceLayout 测试迁/删、明显 unused | #6 #8 · doctor unused | check 绿；行为不变 |
| **Doc-C** | layouts 短契约 | 对齐生产路径 / 未来 layout | #13 | 文档 |
| **M-1** | shared 防火墙 | 迁出 resolver/dialog/form；lint 禁 shared→业务树 | #1 · 可选 #5 头刀 | check；shared 零反向 |
| **M-2** | 壳拆分 + Bridge | Providers/Chrome/Overlays/CommandBridge；slices | #2 #3 #5 | 壳冒烟；check |
| **M-3** | 列表 DRY + META | `useTaskListScene`；三页薄；meta 单向 | #4 #7 | 三页行为一致；fresh-deps 降 |
| **刀** | badges + 裸 invoke | Query badges；设备偏好 api | #9 #10 | 无双通道/裸 invoke |
| **Doc-A/B** | T1 前端段 + INDEX | 链 03-前端架构解析；修路由栈描述 | #14 | 索引可读 |
| **β 巩固** | task 四夹 + public + boundaries lint | T1 试点标准 | — | 试点完成标准 |
| **复跑** | react-doctor | 各大史诗后 | T6 | 归档对比 |

**硬约束（全史诗）：** 每史诗末 `bun run check` 绿；允许分史诗破坏性搬家；不单史诗全球 features 改名狂欢。

**明确不做（Migrate 也不做）：** 强行合并 all/spaces route 叶子；无痛点 invalidate 大优化；为抽象拆 task/project 产品环。

---

## 5. 文档阅读顺序（Phase C 后）

```txt
1. 01-架构原则与术语.md     （P1–P12）
2. 目标架构.md               （树 + 矩阵）
3. 02 → 03 → 04 → 05         （生命周期与模块）
4. 06-React实践与检测.md     （检查表 + doctor）
5. 模块边界契约.md           （删/装）
6. 本文                      （Accept/Fix + 史诗序）
7. 04-Migrate/重构切片路线图  （执行）
```

日常开发短契约仍以 `src/**/ARCHITECTURE.md` 为准；细账在本目录。根 `T1-系统设计.md` 前端段已于 Doc-A（2026-07-16）定点回写并链到本目录。

---

## 6. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-16 | Phase C 出口；Top15 Accept/Fix；D 史诗序冻结建议 |
