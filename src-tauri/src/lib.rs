#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    stoneflow_runtime::run(tauri::generate_context!());
}
