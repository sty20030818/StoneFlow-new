import type { TaskDisplayPageKey } from '@/features/display-options'
import type { TaskPlacement, TaskStatus } from '@/shared/types'

export type TaskListSceneVariant = 'all' | 'standalone'

export type VariantConfig = {
	displayPageKey: TaskDisplayPageKey
	placement: { kind: 'all' | 'standalone' }
	emptyTitle: string
	emptyDescription: string
	/** openTaskCreateDialog 草稿；undefined = 无参 */
	createDraft?: {
		status?: TaskStatus
		placement?: TaskPlacement
	}
	initialShowCompleted?: boolean
	supportsProject: boolean
	fallbackSubtitle: string | ((task: { projectId: string | null }) => string)
	showStatusPills: 'all' | 'status-only'
}

export const VARIANT_CONFIG: Record<TaskListSceneVariant, VariantConfig> = {
	all: {
		displayPageKey: 'task:all',
		placement: { kind: 'all' },
		emptyTitle: '当前没有任务',
		emptyDescription:
			'这里本来会显示符合当前条件的任务，不过现在还是空的。点「创建任务」先记下一项，后面再慢慢整理也来得及。',
		createDraft: { status: 'todo' },
		supportsProject: true,
		fallbackSubtitle: (task) => (task.projectId ? '项目' : '独立事项'),
		showStatusPills: 'all',
	},
	standalone: {
		displayPageKey: 'task:standalone',
		placement: { kind: 'standalone' },
		emptyTitle: '当前没有独立事项',
		emptyDescription:
			'这里会放那些还没归属到项目里的任务，现在暂时还是空的。点「创建任务」先记下来，之后再决定要不要放进某个项目。',
		createDraft: { placement: 'standalone' },
		supportsProject: false,
		fallbackSubtitle: '独立事项',
		showStatusPills: 'status-only',
	},
}

export const ALL_TASK_FILTERS: Array<'all' | 'standalone' | TaskStatus> = [
	'all',
	'standalone',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

export const STANDALONE_STATUS_FILTERS: Array<'all' | TaskStatus> = [
	'all',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]
