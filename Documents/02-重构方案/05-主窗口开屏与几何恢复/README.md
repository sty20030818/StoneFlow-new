# 05 · 主窗口开屏与几何恢复

> 状态：W0 已落地并补强落盘；W1 首帧壳色（HTML）已铺；W2–W3 待执行
> 日期：2026-07-19
> 目标：消灭冷启动白闪 / 居中跳动，建立长期稳定的主窗口生命周期

## 文档

| 文档 | 用途 |
|------|------|
| [主窗口开屏与几何恢复总方案.md](./主窗口开屏与几何恢复总方案.md) | 问题诊断、行业对照、推荐架构、分期执行、验收与风险 |

## 一句话结论

**不造 Logo Splash。** 主窗隐藏创建 → 恢复几何（仅 `main`，且不持久化可见性）→ 壳色首帧 → 再 `show`；壳层一次画出，主区 skeleton，数据后至。

## 与现状的关系

- `tauri-plugin-window-state`：已注册；flags = SIZE|POSITION|MAXIMIZED；filter 仅 `main`；`skip_initial_state(main)` + `build_main_window` 在 show 前唯一 restore。
- 冷启动：`visible(false)` → 隐藏态 `center` 回退 → `restore_state` → `show`（已去掉「可见后再 center」）。
- 关窗 = `hide`（托盘常驻）：**不持久化 `VISIBLE`**；用户关窗时额外落盘一次（hide ≠ Exit）。不为开发态 Ctrl+C 做防抖写盘。
- 真正退出（托盘/命令）：先落盘 → `destroy` 全部 WebView → `exit`，减轻 Windows `Chrome_WidgetWin_0` / 1412 噪音（Chromium 底层仍可能偶发，属已知问题）。
