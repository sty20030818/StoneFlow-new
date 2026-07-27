import { invoke } from '@tauri-apps/api/core'

/** 主窗口完成首次可交互渲染后，通知 runtime 后台预热独立 Launcher。 */
export function notifyMainSurfaceReady() {
	return invoke('app_main_surface_ready')
}
