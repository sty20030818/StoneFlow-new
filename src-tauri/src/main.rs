// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Some(exit_code) = stoneflow_runtime::sync::run_sync_worker_from_cli() {
        std::process::exit(exit_code);
    }

    app_lib::run();
}
