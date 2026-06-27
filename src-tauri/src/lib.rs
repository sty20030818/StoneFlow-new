#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Some(exit_code) = stoneflow_runtime::sync::run_sync_worker_from_cli() {
        std::process::exit(exit_code);
    }

    stoneflow_runtime::run(tauri::generate_context!());
}
