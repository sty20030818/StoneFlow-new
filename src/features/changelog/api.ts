import { invoke } from '@tauri-apps/api/core'

/** 读取独立远端 changelog；无内容或网络失败时由展示层决定回退。 */
export async function getChangelog(): Promise<string | null> {
	return invoke<string | null>('get_changelog')
}
