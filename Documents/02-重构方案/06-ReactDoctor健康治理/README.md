# 06 · React Doctor 健康治理

> 状态：**W0–W4 + unused 清理已落地**（Bugs error = 0；可读分 **71** Needs work）
> 日期：2026-07-20
> 策略：**B（真健康）+ 选择性 C（架构向 ignore / 真死代码收窄）**
> 明确不做：为总分冲 95 的全量消警史诗

## 文档

| 文档                                                       | 用途                                     |
| ---------------------------------------------------------- | ---------------------------------------- |
| [ReactDoctor健康治理方案.md](./ReactDoctor健康治理方案.md) | 目标、规则分拣、波次计划、验收与复跑记录 |
| [runs/](./runs/)                                           | 各波次 diagnostics JSON                  |

## 一句话结论

**用 Bugs 正确性 + 受控边界收窄衡量健康；总分只看「去噪后趋势」，不作 KPI。**
本轮已将 **Bugs error 从 39 → 0**，分数 **52 Critical → 71 Needs work**；**unused → 0**（shadcn 库存件除外）。

## 结果对照

| 节点                    | 分数              | error | warning |
| ----------------------- | ----------------- | ----- | ------- |
| 基线 post-archive       | 52 Critical       | 39    | 224     |
| post-W4                 | 70 Needs work     | 0     | 177     |
| **post-unused（当前）** | **71 Needs work** | **0** | **128** |

配置：仓库根 `doctor.config.json`。

## dialog 插件

- 前端：`@tauri-apps/plugin-dialog` 已恢复
- 统一入口：`src/shared/tauri/nativeDialog.ts`；`@/features/sync` 再导出（选路径等即将用）
- Rust：`tauri_plugin_dialog::init()` + `dialog:allow-open` 保留

## 健康定义（本主题）

1. Bugs 类 **error → 0** ✅
2. unused（可确认死代码）→ 0 ✅（`accordion` / `tabs` / `date-picker` 作库存 ignore）
3. 去噪后可读分数：目标带 75–85；当前 **71**
4. 不拆巨石冲分

## 与其它主题的关系

- 模块边界主线已归档：`98-归档/04-前端架构解析-2026-07/`
- 日常权威仍是 `src/**/ARCHITECTURE.md` + `check-feature-boundaries`
- 主题可在稳定观察后移入 `98-归档/`
