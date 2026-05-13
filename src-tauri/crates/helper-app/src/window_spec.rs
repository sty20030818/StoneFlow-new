//! Quick Create 面板的稳定规格，集中在一个模块里便于未来调整。

pub const QUICK_CREATE_LABEL: &str = "quick-create";
pub const QUICK_CREATE_TITLE: &str = "Quick Create";

/// 面板加载主 App 前端 bundle 的 Hash 路由，Helper `frontendDist` 指向同一 dist 目录。
pub const QUICK_CREATE_URL: &str = "index.html#/quick-create";

/// Quick Create 视觉 panel 的固定规格。
pub const QUICK_CREATE_PANEL_WIDTH: f64 = 688.0;
pub const QUICK_CREATE_PANEL_HEIGHT: f64 = 408.0;
pub const QUICK_CREATE_PANEL_MIN_HEIGHT: f64 = 292.0;
pub const QUICK_CREATE_SHADOW_PADDING: f64 = 36.0;

/// 原生窗口尺寸 = 视觉 panel 尺寸 + CSS 阴影透明安全区。
///
/// Quick Create 的阴影由前端 box-shadow 绘制，WebView 必须保留透明安全区，
/// 否则阴影会被窗口边界裁切。
pub const QUICK_CREATE_WINDOW_WIDTH: f64 =
    QUICK_CREATE_PANEL_WIDTH + QUICK_CREATE_SHADOW_PADDING * 2.0;
pub const QUICK_CREATE_WINDOW_HEIGHT: f64 =
    QUICK_CREATE_PANEL_HEIGHT + QUICK_CREATE_SHADOW_PADDING * 2.0;
pub const QUICK_CREATE_WINDOW_MIN_HEIGHT: f64 =
    QUICK_CREATE_PANEL_MIN_HEIGHT + QUICK_CREATE_SHADOW_PADDING * 2.0;

/// 面板顶部锚点：距离当前屏幕可见区域顶部 45%。
///
/// Quick Create 高度会随内容向下展开，顶部位置不能跟着高度变化。
pub const QUICK_CREATE_SCREEN_TOP_OFFSET_RATIO: f64 = 0.3;

/// 全局快捷键：Option+Space（Raycast 风格；与 Spotlight 的 Cmd+Space 区分开）。
pub const QUICK_CREATE_SHORTCUT: &str = "Option+Space";
