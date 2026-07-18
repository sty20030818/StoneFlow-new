# Lifecycle 样板重构执行计划（Y2 · 对齐 task / project）

> 状态：**P0 DOC + P1 NORM done** · 下一刀 **SCENE** · 2026-07-19
> 决议源：[M-F-LIFECYCLE](./模块/M-F-LIFECYCLE.md)（Y2）· 写法：[CONVENTIONS v2.1](../../../src/CONVENTIONS.md) · 定稿契约：[lifecycle/ARCHITECTURE.md](../../../src/features/lifecycle/ARCHITECTURE.md)
> 前置：[11](./11-Task样板重构执行计划.md) · [12](./12-平台与Domain扩散重构执行计划.md) · [13-Project](./13-Project样板重构执行计划.md)（0–4 done）
> **原则：** 串行；每阶段末相关门禁；开放前可破坏须清干净；源码禁史诗号。
> **文档：** `ARCHITECTURE` = 定稿最优（无债表）；**债/进度只写本文**；src 不回链 Docs。

---

## 0. 目标与非目标

### 0.1 目标

1. lifecycle 成为 **编排域样板**（跨实体 · Keep 独立）。
2. 对齐 11 附录 + 12 C1–C6 + 13 附录 L1–L2。
3. 写路径只委托 task/project/space public；禁吞进 task。
4. `ARCHITECTURE` / public / TSDoc 与 CONVENTIONS 一致。

### 0.2 非目标

- 不拆 archive / trash 为两 feature（mode 足够）
- 不把 UI 并进 layout
- 不做徽章 count API 性能专项（开放问题后议）
- 不顺手开 view / launcher

### 0.3 门禁

```bash
bunx tsc --noEmit -p tsconfig.json
bun run lint:boundaries
bunx vitest run src/features/lifecycle
```

冒烟：归档/回收站列表、恢复/删除/永久删除、多选 bulk、侧栏徽章。

---

## 1. 现网基线（2026-07-19）

| 项 | 状态 |
|----|------|
| lifecycle → layout | **0** |
| bulk/ · `registerLifecycleCommands` | **已在 lifecycle** |
| api 委托 t/p/s public | **已是** |
| `LifecycleList` | **~356**；内联 wiring；**待 SCENE** |
| `LifecycleBoard` | ~285 · VOLUME 按痛 |
| `index.ts` | **NORM done**（TSDoc + 收窄） |
| ARCHITECTURE | **定稿最优** |

---

## 2. 阶段总表

| 阶段 | ID | 内容 | 破坏性 | 状态 |
|------|-----|------|--------|------|
| 0 | DOC | ARCHITECTURE；M-F 对照；本文 | 无 | **done** |
| 1 | NORM | TSDoc / public；包内相对路径 | 低 | **done** |
| 2 | SCENE | `useLifecycleScene(mode)`；压薄 List | 中 | pending |
| 3 | VOLUME | Board/Row 按痛 | 低 | pending |
| 4 | CLOSE | 对照；view 备忘 | 无 | pending |

---

## 阶段 0 · DOC · **done**

- [x] `ARCHITECTURE` 定稿最优
- [x] `M-F-LIFECYCLE` 落地对照 + archived-decision
- [x] [12](./12-平台与Domain扩散重构执行计划.md) 指向本文

---

## 阶段 1 · NORM · **done**

| 项 | 结果 |
|----|------|
| `index.ts` | 多行摘要 + `@remarks`；去 `@fileoverview` |
| public 收窄 | 撤无外消费者：写 api、mutations、keys、bulk 定义表/getter、command selection |
| 包内路径 | List / hooks / api 相对路径 |
| 门禁 | 见变更后验证 |

---

## 阶段 2 · SCENE

| 字段 | 内容 |
|------|------|
| 目标 | List 可扫完；wiring 进 `useLifecycleScene(mode)` |
| 状态 | pending |

- [ ] 抽 facade：entries / filter / selection / bulk / 打开详情 / 单条 mutation
- [ ] `LifecycleList` 变薄壳（目标 &lt;~200）
- [ ] 仍只委托 t/p/s public；禁 layout
- [ ] vitest 绿

---

## 阶段 3 · VOLUME

| 优先级 | 项 | 动作 |
|--------|-----|------|
| P0 | &gt;400 生产单文件 | 内拆 |
| P1 | Board / Row | 有痛再拆 |

---

## 阶段 4 · CLOSE

- [ ] 对照勾满；ARCHITECTURE 一致
- [ ] 检查表结论；复制到 view 增补（若有）
- [ ] 门禁绿

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 初版；DOC + NORM done |
