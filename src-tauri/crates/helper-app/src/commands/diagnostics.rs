use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Clone, Serialize)]
pub struct QuickCreateErrorPayload {
    #[serde(rename = "type")]
    pub type_: &'static str,
    pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickLayoutDiagnosticsInput {
    pub phase: String,
    pub target_height: f64,
    pub viewport_height: f64,
    pub device_pixel_ratio: f64,
    pub visual_viewport_width: f64,
    pub visual_viewport_height: f64,
    pub visual_viewport_scale: f64,
    pub document_client_height: f64,
    pub document_scroll_height: f64,
    pub body_client_height: f64,
    pub body_scroll_height: f64,
    pub root_client_height: f64,
    pub root_scroll_height: f64,
    pub surface_offset_height: f64,
    pub surface_scroll_height: f64,
    pub content_offset_height: f64,
    pub content_scroll_height: f64,
    pub footer_offset_height: f64,
    pub footer_scroll_height: f64,
}

#[tauri::command]
pub async fn helper_quick_report_layout_diagnostics(
    app_handle: tauri::AppHandle,
    input: HelperQuickLayoutDiagnosticsInput,
) -> Result<(), QuickCreateErrorPayload> {
    let native_metrics = app_handle
        .get_webview_window(crate::window_spec::QUICK_CREATE_LABEL)
        .map(|window| {
            let scale_factor = window.scale_factor().unwrap_or(1.0);
            let inner = window
                .inner_size()
                .map(|size| format!("{}×{}", size.width, size.height))
                .unwrap_or_else(|error| format!("err:{error}"));
            let outer = window
                .outer_size()
                .map(|size| format!("{}×{}", size.width, size.height))
                .unwrap_or_else(|error| format!("err:{error}"));
            let webview = window
                .as_ref()
                .size()
                .map(|size| format!("{}×{}", size.width, size.height))
                .unwrap_or_else(|error| format!("err:{error}"));

            format!("native(scale={scale_factor:.2} inner={inner} outer={outer} webview={webview})")
        })
        .unwrap_or_else(|| "native(window=missing)".to_owned());

    log::debug!(
        "helper: quick create layout diagnostics phase={} target={:.1} viewport={:.1} dpr={:.3} visualViewport(width/height/scale)={:.1}/{:.1}/{:.3} document(client/scroll)={:.1}/{:.1} body(client/scroll)={:.1}/{:.1} root(client/scroll)={:.1}/{:.1} surface(offset/scroll)={:.1}/{:.1} content(offset/scroll)={:.1}/{:.1} footer(offset/scroll)={:.1}/{:.1} {}",
        input.phase,
        input.target_height,
        input.viewport_height,
        input.device_pixel_ratio,
        input.visual_viewport_width,
        input.visual_viewport_height,
        input.visual_viewport_scale,
        input.document_client_height,
        input.document_scroll_height,
        input.body_client_height,
        input.body_scroll_height,
        input.root_client_height,
        input.root_scroll_height,
        input.surface_offset_height,
        input.surface_scroll_height,
        input.content_offset_height,
        input.content_scroll_height,
        input.footer_offset_height,
        input.footer_scroll_height,
        native_metrics,
    );

    Ok(())
}
