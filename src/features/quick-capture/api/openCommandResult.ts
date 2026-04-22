import { invoke } from '@tauri-apps/api/core'

/**
 * Helper 面板打开 Task：实际导航由主 App 接收事件后完成。
 */
export async function openCommandTask(taskId: string) {
	await invoke('helper_open_task', {
		input: {
			task_id: taskId,
		},
	})
}

/**
 * Helper 面板打开 Project：实际导航由主 App 接收事件后完成。
 */
export async function openCommandProject(projectId: string) {
	await invoke('helper_open_project', {
		input: {
			project_id: projectId,
		},
	})
}
