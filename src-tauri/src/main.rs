// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// MSVC link.exe 会把「正在创建库」打到 stdout；中文系统下 rustc 1.97 未过滤该文案。
#![cfg_attr(all(windows, target_env = "msvc"), allow(linker_messages))]

fn main() {
    app_lib::run();
}
