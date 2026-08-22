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
	emptyTitle: string
	emptyDescription: string
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
		emptyTitle: '当前没有任务',
		emptyDescription:
			'这里本来会显示符合当前条件的任务，不过现在还是空的。点「创建任务」先记下一项，后面再慢慢整理也来得及。',
		createDraft: { status: 'todo' },
		supportsProject: true,
		fallbackSubtitle: (task) =>
			task.projectName ? task.projectName : task.projectId ? '项目' : '独立事项',
	},
	standalone: {
		displayPageKey: 'task:standalone',
		emptyTitle: '当前没有独立事项',
		emptyDescription:
			'这里会放那些还没归属到项目里的任务，现在暂时还是空的。点「创建任务」先记下来，之后再决定要不要放进某个项目。',
		createDraft: { placement: 'standalone' },
		supportsProject: false,
		fallbackSubtitle: '独立事项',
	},
}
