import { invoke } from '@tauri-apps/api/core'

/**
 * 打开或复用 Quick Capture 独立浮窗。
 */
export async function openQuickCapture() {
	await invoke('open_quick_capture')
}
