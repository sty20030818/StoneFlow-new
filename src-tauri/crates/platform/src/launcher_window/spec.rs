//! Launcher 面板的稳定规格，集中在一个模块里便于未来调整。

pub const LAUNCHER_LABEL: &str = "launcher";
pub const LAUNCHER_TITLE: &str = "Launcher";

/// 面板加载主 App 前端 bundle 的 Hash 路由。
pub const LAUNCHER_URL: &str = "index.html#/launcher";

/// Launcher 固定壳逻辑尺寸（内容区内滚，外窗不随内容涨缩）。
pub const LAUNCHER_PANEL_WIDTH: f64 = 720.0;
pub const LAUNCHER_PANEL_HEIGHT: f64 = 500.0;

/// 原生窗与内容壳一致；深度用系统 shadow，不为 CSS 投影预留透明槽。
pub const LAUNCHER_WINDOW_WIDTH: f64 = LAUNCHER_PANEL_WIDTH;
pub const LAUNCHER_WINDOW_HEIGHT: f64 = LAUNCHER_PANEL_HEIGHT;

/// 外圆角：macOS 原生感 16；Windows 对齐 DWM 视觉 8。FE 通过 --launcher-panel-radius 同步。
#[cfg(target_os = "macos")]
pub const LAUNCHER_PANEL_RADIUS: f64 = 16.0;
#[cfg(not(target_os = "macos"))]
pub const LAUNCHER_PANEL_RADIUS: f64 = 8.0;

/// 面板顶部锚点：距当前屏 visibleFrame 顶部的比例。
pub const LAUNCHER_SCREEN_TOP_OFFSET_RATIO: f64 = 0.18;

/// 全局快捷键：唤起 / 关闭 Launcher。
///
/// - macOS：`Option+Space`（产品约定）
/// - Windows：`Alt+Space`（与 macOS 手感对齐；若与系统窗体菜单冲突以本机实测为准）
/// - 其它：`Control+Shift+Space`
#[cfg(target_os = "macos")]
pub const LAUNCHER_SHORTCUT: &str = "Option+Space";
#[cfg(target_os = "windows")]
pub const LAUNCHER_SHORTCUT: &str = "Alt+Space";
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub const LAUNCHER_SHORTCUT: &str = "Control+Shift+Space";
