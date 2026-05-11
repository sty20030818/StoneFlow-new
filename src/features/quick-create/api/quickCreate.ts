import { invoke } from '@tauri-apps/api/core'

import type {
	QuickCreateInitialState,
	QuickCreatePlacement,
	QuickCreateProjectsBySpace,
	QuickCreateSearchResponse,
} from '@/features/quick-create/model/types'

export type QuickCreateInput = {
	spaceId: string | null
	placement: QuickCreatePlacement
	title: string
	note: string | null
	status: string | null
	priority: number | null
	dueAt: string | null
	scheduledAt: string | null
	reminderAt: string | null
}

export type QuickOpenTargetInput = {
	kind: 'task' | 'project'
	id: string
}

export async function resizeWindow(height: number) {
	return invoke('helper_quick_resize_window', {
		input: { height },
	})
}

export async function getInitialState() {
	return invoke<QuickCreateInitialState>('helper_quick_get_initial_state')
}

export async function listProjectsBySpace(spaceId: string) {
	return invoke<QuickCreateProjectsBySpace>('helper_quick_list_projects_by_space', {
		input: { spaceId },
	})
}

export async function search(query: string, limit = 3) {
	return invoke<QuickCreateSearchResponse>('helper_quick_search', {
		input: {
			query,
			limit,
		},
	})
}

export async function create(input: QuickCreateInput) {
	return invoke('helper_quick_create', { input })
}

export async function createAndOpen(input: QuickCreateInput) {
	return invoke('helper_quick_create_and_open', { input })
}

export async function openTarget(input: QuickOpenTargetInput) {
	return invoke('helper_quick_open_target', { input })
}
