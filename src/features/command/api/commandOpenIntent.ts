import { invoke } from '@tauri-apps/api/core'

import type { CommandOpenPayload } from '@/shared/events'

type PendingCommandOpenResponse = {
	kind: 'task' | 'project'
	id: string
	spaceId: string
	projectId: string | null
	placement: 'project' | 'standalone'
}

/**
 * 读取主窗口尚未消费的打开意图（命令/外部唤起 → 导航）。
 * 所有权在 command，不在 space。
 */
export async function takePendingCommandOpenIntent(): Promise<CommandOpenPayload | null> {
	return invoke<PendingCommandOpenResponse | null>('take_pending_command_open_intent')
}
