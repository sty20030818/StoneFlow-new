//! Quick Create 面板的稳定规格，集中在一个模块里便于未来调整。

pub const QUICK_CREATE_LABEL: &str = "quick-create";
pub const QUICK_CREATE_TITLE: &str = "Quick Create";

/// 面板加载主 App 前端 bundle 的 Hash 路由，Helper `frontendDist` 指向同一 dist 目录。
pub const QUICK_CREATE_URL: &str = "index.html#/quick-create";

/// Quick Create 视觉 panel 的固定规格。
pub const QUICK_CREATE_PANEL_WIDTH: f64 = 688.0;
pub const QUICK_CREATE_PANEL_HEIGHT: f64 = 408.0;
pub const QUICK_CREATE_PANEL_MIN_HEIGHT: f64 = 292.0;
pub const QUICK_CREATE_PANEL_MAX_HEIGHT: f64 = 640.0;

/// 透明安全区：专门给 CSS 阴影留出可绘制空间。
pub const QUICK_CREATE_SHADOW_PADDING: f64 = 36.0;
/// Windows/Wry 透明窗口在极限高度下会吞掉一部分底部透明绘制区。
/// 这里额外补 30px，让视觉上稳定保留约 36px 的底部安全区。
pub const QUICK_CREATE_WINDOW_VISUAL_BUFFER: f64 = 30.0;

/// 真实窗口尺寸 = 视觉 panel + 透明安全区 * 2。
pub const QUICK_CREATE_WINDOW_WIDTH: f64 =
    QUICK_CREATE_PANEL_WIDTH + QUICK_CREATE_SHADOW_PADDING * 2.0;
pub const QUICK_CREATE_WINDOW_HEIGHT: f64 =
    QUICK_CREATE_PANEL_HEIGHT + QUICK_CREATE_SHADOW_PADDING * 2.0 + QUICK_CREATE_WINDOW_VISUAL_BUFFER;
pub const QUICK_CREATE_WINDOW_MIN_HEIGHT: f64 =
    QUICK_CREATE_PANEL_MIN_HEIGHT + QUICK_CREATE_SHADOW_PADDING * 2.0 + QUICK_CREATE_WINDOW_VISUAL_BUFFER;
pub const QUICK_CREATE_WINDOW_MAX_HEIGHT: f64 =
    QUICK_CREATE_PANEL_MAX_HEIGHT + QUICK_CREATE_SHADOW_PADDING * 2.0 + QUICK_CREATE_WINDOW_VISUAL_BUFFER;

/// 全局快捷键：Option+Space（Raycast 风格；与 Spotlight 的 Cmd+Space 区分开）。
pub const QUICK_CREATE_SHORTCUT: &str = "Option+Space";
