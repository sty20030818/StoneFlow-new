#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    desktop_app::builder()
        .run(tauri::generate_context!())
        .expect("failed to run StoneFlow Tauri application");
}
