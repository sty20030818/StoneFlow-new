#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    desktop_app::run(tauri::generate_context!());
}
