import type { TaskDisplayPageKey } from '@/features/display-options'
import type { TaskPlacement, TaskStatus } from '@/shared/types'

export type TaskListSceneVariant = 'all' | 'standalone'

export type TaskListSubtitleTask = {
	projectId: string | null
	projectName?: string | null
	spaceName?: string
}

export type VariantConfig = {
	displayPageKey: TaskDisplayPageKey
	/** openTaskCreateDialog 草稿；undefined = 无参 */
	createDraft?: {
		status?: TaskStatus
		placement?: TaskPlacement
	}
	supportsProject: boolean
	fallbackSubtitle: string | ((task: TaskListSubtitleTask) => string)
}

export const VARIANT_CONFIG: Record<TaskListSceneVariant, VariantConfig> = {
	all: {
		displayPageKey: 'task:all',
		createDraft: { status: 'todo' },
		supportsProject: true,
		fallbackSubtitle: (task) =>
			task.projectName ? task.projectName : task.projectId ? '项目' : '独立事项',
	},
	standalone: {
		displayPageKey: 'task:standalone',
		createDraft: { placement: 'standalone' },
		supportsProject: false,
		fallbackSubtitle: '独立事项',
	},
}
