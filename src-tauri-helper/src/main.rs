// 在 release 模式下阻止 Windows 打开多余的控制台窗口。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    stoneflow_helper_app::builder()
        .run(tauri::generate_context!())
        .expect("failed to run StoneFlow Helper");
}
