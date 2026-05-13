use serde::Deserialize;
use tauri::{LogicalSize, Manager, Size};

use crate::{
    runtime::{QuickPopupPhase, QuickPopupRuntimeState},
    window_controller,
    window_spec::{QUICK_CREATE_LABEL, QUICK_CREATE_WINDOW_MIN_HEIGHT, QUICK_CREATE_WINDOW_WIDTH},
};

use super::QuickCreateErrorPayload;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickResizeWindowInput {
    pub height: f64,
    #[serde(default)]
    pub device_pixel_ratio: Option<f64>,
}

#[tauri::command]
pub async fn helper_quick_resize_window(
    app_handle: tauri::AppHandle,
    runtime: tauri::State<'_, QuickPopupRuntimeState>,
    input: HelperQuickResizeWindowInput,
) -> Result<(), QuickCreateErrorPayload> {
    let Some(window) = app_handle.get_webview_window(QUICK_CREATE_LABEL) else {
        return Err(QuickCreateErrorPayload {
            type_: "Internal",
            message: "quick create 窗口未初始化".to_owned(),
        });
    };

    let snapshot = runtime.snapshot().await;
    if snapshot.phase != QuickPopupPhase::WaitingLayout && snapshot.phase != QuickPopupPhase::Visible
    {
        return Err(QuickCreateErrorPayload {
            type_: "Internal",
            message: format!("quick create 当前阶段不允许 resize: {:?}", snapshot.phase),
        });
    }

    let native_scale_factor = window.scale_factor().unwrap_or(1.0);
    let css_to_native_logical_ratio =
        quick_create_css_to_native_logical_ratio(input.device_pixel_ratio, native_scale_factor);
    let target_css_height = input.height.max(QUICK_CREATE_WINDOW_MIN_HEIGHT);
    let target_window_width = QUICK_CREATE_WINDOW_WIDTH * css_to_native_logical_ratio;
    let target_window_height = target_css_height * css_to_native_logical_ratio;

    log::debug!(
        "helper: quick create resize 请求 css_size={:.1}×{:.1} dpr={} native_scale={:.3} ratio={:.4} -> applied_logical={:.1}×{:.1}",
        QUICK_CREATE_WINDOW_WIDTH,
        input.height,
        format_optional_f64(input.device_pixel_ratio),
        native_scale_factor,
        css_to_native_logical_ratio,
        target_window_width,
        target_window_height
    );

    window
        .set_min_size(Some(Size::Logical(LogicalSize::new(
            QUICK_CREATE_WINDOW_WIDTH * css_to_native_logical_ratio,
            QUICK_CREATE_WINDOW_MIN_HEIGHT * css_to_native_logical_ratio,
        ))))
        .map_err(|error| QuickCreateErrorPayload {
            type_: "Internal",
            message: format!("设置 quick create 最小窗口尺寸失败: {error}"),
        })?;

    let controller = window_controller::build_controller(app_handle.clone());
    controller
        .apply_height(target_window_height)
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message,
        })?;

    Ok(())
}

#[tauri::command]
pub async fn helper_quick_present_window(
    app_handle: tauri::AppHandle,
    runtime: tauri::State<'_, QuickPopupRuntimeState>,
) -> Result<(), QuickCreateErrorPayload> {
    runtime
        .mark_presenting()
        .await
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?;

    let controller = window_controller::build_controller(app_handle);
    controller.present().map_err(|message| QuickCreateErrorPayload {
        type_: "Internal",
        message,
    })?;

    Ok(())
}

#[tauri::command]
pub async fn helper_quick_frontend_ready(
    runtime: tauri::State<'_, QuickPopupRuntimeState>,
) -> Result<(), QuickCreateErrorPayload> {
    runtime.mark_frontend_ready().await;
    log::debug!("helper: quick create 前端监听器已就绪");
    Ok(())
}

#[tauri::command]
pub async fn helper_quick_frontend_unready(
    runtime: tauri::State<'_, QuickPopupRuntimeState>,
) -> Result<(), QuickCreateErrorPayload> {
    runtime.mark_frontend_unready().await;
    log::debug!("helper: quick create 前端监听器已卸载");
    Ok(())
}

fn quick_create_css_to_native_logical_ratio(
    device_pixel_ratio: Option<f64>,
    native_scale_factor: f64,
) -> f64 {
    let safe_native_scale_factor = positive_or_one(native_scale_factor);
    let safe_device_pixel_ratio = device_pixel_ratio
        .filter(|ratio| ratio.is_finite() && *ratio > 0.0)
        .unwrap_or(safe_native_scale_factor);

    safe_device_pixel_ratio / safe_native_scale_factor
}

fn positive_or_one(value: f64) -> f64 {
    if value.is_finite() && value > 0.0 {
        value
    } else {
        1.0
    }
}

fn format_optional_f64(value: Option<f64>) -> String {
    value
        .map(|value| format!("{value:.3}"))
        .unwrap_or_else(|| "missing".to_owned())
}
