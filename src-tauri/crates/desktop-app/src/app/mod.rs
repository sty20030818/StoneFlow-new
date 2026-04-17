use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
struct HealthcheckPayload {
  status: &'static str,
  app: &'static str,
}

#[tauri::command]
fn healthcheck() -> HealthcheckPayload {
  HealthcheckPayload {
    status: "ok",
    app: "desktop-app",
  }
}

/// 启动 StoneFlow 的 Tauri 宿主。
pub fn builder() -> tauri::Builder<tauri::Wry> {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![healthcheck])
}
