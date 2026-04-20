import { invoke } from '@tauri-apps/api/core'

import type { FocusViewRecord } from '@/features/focus/model/types'

type ListFocusViewsCommandInput = {
	spaceSlug: string
}

type FocusViewResponse = {
	id: string
	key: FocusViewRecord['key']
	name: string
	sort_order: number
	is_enabled: boolean
}

type FocusViewListResponse = {
	views: FocusViewResponse[]
}

/**
 * 查询当前 Space 的系统 Focus 视图列表。
 */
export async function listFocusViews(input: ListFocusViewsCommandInput) {
	const payload = await invoke<FocusViewListResponse>('list_focus_views', {
		input: {
			space_slug: input.spaceSlug,
		},
	})

	return payload.views.map((view) => ({
		id: view.id,
		key: view.key,
		name: view.name,
		sortOrder: view.sort_order,
		isEnabled: view.is_enabled,
	})) satisfies FocusViewRecord[]
}
