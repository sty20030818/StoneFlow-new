# 05 · 主窗口开屏与几何恢复

> 状态：W0–W3 核心已落地；主题色联动待暗色主题
> 日期：2026-07-19
> 目标：消灭冷启动白闪 / 居中跳动，建立长期稳定的主窗口生命周期

## 文档

| 文档                                                             | 用途                                               |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| [主窗口开屏与几何恢复总方案.md](./主窗口开屏与几何恢复总方案.md) | 问题诊断、行业对照、推荐架构、分期执行、验收与风险 |

## 一句话结论

**不造 Logo Splash。** 主窗隐藏创建 → 恢复几何（仅 `main`，且不持久化可见性）→ 壳色首帧 → 再 `show`；壳层一次画出，主区 skeleton，数据后至。

## 与现状的关系

- `tauri-plugin-window-state`：已注册；flags = SIZE|POSITION|MAXIMIZED；filter 仅 `main`；`skip_initial_state(main)` + `build_main_window` 在 show 前唯一 restore。
- 冷启动：`visible(false)` → 隐藏态 `center` 回退 → `restore_state` → `show`（已去掉「可见后再 center」）。
- 关窗 = `hide`（托盘常驻）：**不持久化 `VISIBLE`**；用户关窗时额外落盘一次（hide ≠ Exit）。不为开发态 Ctrl+C 做防抖写盘。
- 真正退出（托盘/命令）：先落盘 → `destroy` 全部 WebView → `exit`，减轻 Windows `Chrome_WidgetWin_0` / 1412 噪音（Chromium 底层仍可能偶发，属已知问题）。
- **W1 首帧壳色**：`index.html` inline `#f3f3f4` + 主窗 `background_color`（窗层与 WebView）对齐 `--sf-neutral-100`。
- **W2 统一首屏**：`/` pending/error 与 chrome 未就绪共用 `ShellLayoutSkeleton`，不再出现居中「正在恢复…」中间页。
- **W3 稳健性**：restore 后离屏 → 隐藏态居中；非最大化时钳 `MAIN_WINDOW_MIN_*`。主题底色联动等暗色主题。

## 发布前手工清单（W3 / 最大化）

| 平台    | 场景                       | 期望                                    |
| ------- | -------------------------- | --------------------------------------- |
| Windows | 最大化退出再开             | 仍最大化；装饰/自绘标题栏无裁切         |
| Windows | 外接屏最大化 → 拔线 → 再开 | 不离屏；取消最大化并居中主屏            |
| macOS   | 最大化（zoom）退出再开     | 恢复为最大化态；traffic lights 位置正常 |
| macOS   | 外接屏断开后启动           | 同 Windows：居中回退                    |
| 双端    | 托盘 hide 再开             | 几何不变                                |
