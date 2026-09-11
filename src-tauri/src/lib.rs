// MSVC link.exe 会把 cdylib 的 implib 创建信息打到 stdout；仅 Windows 关闭该误报。
#![cfg_attr(all(windows, target_env = "msvc"), allow(linker_messages))]

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    stoneflow_runtime::run(tauri::generate_context!());
}
