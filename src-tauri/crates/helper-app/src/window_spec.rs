//! Quick Create 面板的稳定规格，集中在一个模块里便于未来调整。

pub const QUICK_CREATE_LABEL: &str = "quick-create";
pub const QUICK_CREATE_TITLE: &str = "Quick Create";

/// 面板加载主 App 前端 bundle 的 Hash 路由，Helper `frontendDist` 指向同一 dist 目录。
pub const QUICK_CREATE_URL: &str = "index.html#/quick-create";

/// Quick Create 视觉 panel 的固定规格。
pub const QUICK_CREATE_PANEL_WIDTH: f64 = 688.0;
pub const QUICK_CREATE_PANEL_HEIGHT: f64 = 408.0;

/// 透明安全区：专门给 CSS 阴影留出可绘制空间。
pub const QUICK_CREATE_SHADOW_PADDING: f64 = 36.0;

/// 视觉 panel 顶部默认停在屏幕工作区 20% 处，更接近命令入口而不是普通居中对话框。
pub const QUICK_CREATE_PANEL_TOP_RATIO: f64 = 0.2;

/// 真实窗口尺寸 = 视觉 panel + 透明安全区 * 2。
pub const QUICK_CREATE_WINDOW_WIDTH: f64 =
    QUICK_CREATE_PANEL_WIDTH + QUICK_CREATE_SHADOW_PADDING * 2.0;
pub const QUICK_CREATE_WINDOW_HEIGHT: f64 =
    QUICK_CREATE_PANEL_HEIGHT + QUICK_CREATE_SHADOW_PADDING * 2.0;

/// 全局快捷键：Option+Space（Raycast 风格；与 Spotlight 的 Cmd+Space 区分开）。
pub const QUICK_CREATE_SHORTCUT: &str = "Option+Space";
