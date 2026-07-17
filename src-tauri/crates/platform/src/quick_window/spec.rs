//! Quick Create 面板的稳定规格，集中在一个模块里便于未来调整。

pub const QUICK_CREATE_LABEL: &str = "quick-create";
pub const QUICK_CREATE_TITLE: &str = "Quick Create";

/// 面板加载主 App 前端 bundle 的 Hash 路由，Helper `frontendDist` 指向同一 dist 目录。
pub const QUICK_CREATE_URL: &str = "index.html#/quick-create";

/// Quick Create 固定壳逻辑尺寸（Launcher 范式；内容区内滚，外窗不随内容涨缩）。
pub const QUICK_CREATE_PANEL_WIDTH: f64 = 720.0;
pub const QUICK_CREATE_PANEL_HEIGHT: f64 = 500.0;

/// 原生窗与内容壳一致；深度用系统 `setHasShadow`，不为 CSS 投影预留透明槽。
pub const QUICK_CREATE_WINDOW_WIDTH: f64 = QUICK_CREATE_PANEL_WIDTH;
pub const QUICK_CREATE_WINDOW_HEIGHT: f64 = QUICK_CREATE_PANEL_HEIGHT;

/// 面板顶部锚点：距当前屏 visibleFrame 顶部的比例。
/// 0.18 ≈ Raycast 偏上；原 0.30 会把 500 高面板压得偏下。
pub const QUICK_CREATE_SCREEN_TOP_OFFSET_RATIO: f64 = 0.18;

/// 全局快捷键：Option+Space（Raycast 风格；与 Spotlight 的 Cmd+Space 区分开）。
pub const QUICK_CREATE_SHORTCUT: &str = "Option+Space";
