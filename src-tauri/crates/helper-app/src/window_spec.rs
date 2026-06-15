//! Quick Create 面板规格：复用 platform 常量，保留 Helper 专属快捷键清单。

pub use stoneflow_platform::quick_window::spec::*;

/// Helper 拥有的系统级快捷键清单。
///
/// 应用内快捷键属于主窗口前端 CommandRuntime，不应进入 Helper。
pub const HELPER_SYSTEM_SHORTCUTS: &[&str] = &[QUICK_CREATE_SHORTCUT];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn helper_should_only_own_option_space_system_shortcut() {
        assert_eq!(HELPER_SYSTEM_SHORTCUTS, ["Option+Space"]);
    }

    #[test]
    fn helper_manifest_should_not_depend_on_main_app_business_crates() {
        let manifest = include_str!("../Cargo.toml");
        let active_lines = manifest
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty() && !line.starts_with('#'));

        for line in active_lines {
            assert!(
                !line.starts_with("sea-orm")
                    && !line.starts_with("sea-orm-migration")
                    && !line.starts_with("stoneflow-core")
                    && !line.starts_with("stoneflow-entity")
                    && !line.starts_with("stoneflow-migration"),
                "Helper 不应直接依赖主应用业务 crate: {line}",
            );
        }
    }
}
