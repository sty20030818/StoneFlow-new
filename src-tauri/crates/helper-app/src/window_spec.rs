//! Quick Capture 面板的稳定规格，集中在一个模块里便于未来调整。

pub const QUICK_CAPTURE_LABEL: &str = "quick-capture";
pub const QUICK_CAPTURE_TITLE: &str = "Quick Capture";

/// 面板加载主 App 前端 bundle 的 Hash 路由，Helper `frontendDist` 指向同一 dist 目录。
pub const QUICK_CAPTURE_URL: &str = "index.html#/quick-capture";

/// 卡片本体无阴影；窗口只略大于卡片（预留 ~4px 抗锯齿边）。
pub const QUICK_CAPTURE_WINDOW_WIDTH: f64 = 700.0;
pub const QUICK_CAPTURE_WINDOW_HEIGHT: f64 = 420.0;

/// 全局快捷键：Option+Space（Raycast 风格；与 Spotlight 的 Cmd+Space 区分开）。
pub const QUICK_CAPTURE_SHORTCUT: &str = "Option+Space";
