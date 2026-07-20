# 06 · React Doctor 健康治理

> 状态：**主线完成**（Bugs error = 0；可读分 **85 Great**）
> 日期：2026-07-20
> 策略：**B（真健康）+ 选择性 C（架构向 ignore / 真死代码收窄）**

## 文档

| 文档                                                       | 用途                                     |
| ---------------------------------------------------------- | ---------------------------------------- |
| [ReactDoctor健康治理方案.md](./ReactDoctor健康治理方案.md) | 目标、规则分拣、波次计划、验收与复跑记录 |

> 各波次原始 `diagnostics.json` 已删除；分数与结论以本 README / 方案附录「复跑记录」为准。需要复跑时临时输出即可，不必长期落盘。

## 一句话结论

**Bugs error 清零 + Performance 点杀 + 合法模式 ignore → 分数 52 Critical → 86 Great。**
剩余 warning 主要是 Maintainability（多组件/巨石）与少量 a11y，不为分硬拆。

## 结果对照

| 节点                       | 分数          | error | warning |
| -------------------------- | ------------- | ----- | ------- |
| 基线                       | 52 Critical   | 39    | 224     |
| post-unused                | 71 Needs work | 0     | 128     |
| **post-bugs-perf（当前）** | **85 Great**  | **0** | **~39** |

## dialog

- `@tauri-apps/plugin-dialog` + `src/shared/tauri/nativeDialog.ts` + `@/features/sync` 再导出
- Rust 插件保留

## 剩余 warning（不挡收口）

- Maintainability：`no-multi-comp` / `no-giant-component` / `prefer-module-scope-pure-function`
- Accessibility：少量 aria / label / 键盘

配置：`doctor.config.json`（含对话框 reset、行快捷键桥等有意模式 overrides）。
