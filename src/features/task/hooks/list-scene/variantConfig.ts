import type { EntitySceneVariant, EntitySceneTaskBoardConfig } from '@/features/entity-scene'
import type { TaskDisplayPageKey } from '@/features/display-options'
import type { TaskPlacement, TaskStatus } from '@/shared/types'

export type TaskListSceneVariant = 'inbox' | 'all' | 'no-project'

export type VariantConfig = {
	displayPageKey: TaskDisplayPageKey
	placement: { kind: 'inbox' | 'all' | 'noProject' }
	sceneVariant: EntitySceneVariant
	boardVariant: EntitySceneTaskBoardConfig['variant']
	emptyTitle: string
	emptyDescription: string
	/** openTaskCreateDialog 草稿；undefined = 无参 */
	createDraft?: {
		status?: TaskStatus
		placement?: TaskPlacement
	}
	initialShowCompleted?: boolean
	supportsProject: boolean
	/** inbox：按当前 space 过滤 project options */
	filterProjectsBySpace: boolean
	fallbackSubtitle: string | ((task: { inboxAt: string | null }) => string)
	showStatusPills: 'all' | 'status-only' | 'inbox-count'
}

export const VARIANT_CONFIG: Record<TaskListSceneVariant, VariantConfig> = {
	inbox: {
		displayPageKey: 'task:inbox',
		placement: { kind: 'inbox' },
		sceneVariant: 'inbox',
		boardVariant: 'inbox',
		emptyTitle: 'Inbox 已清空',
		emptyDescription:
			'新捕获的任务都会先来到这里，现在这一批已经整理完了。点「创建任务」也可以先记一条，之后再决定把它放去哪里。',
		createDraft: undefined,
		initialShowCompleted: false,
		supportsProject: true,
		filterProjectsBySpace: true,
		fallbackSubtitle: '收件箱',
		showStatusPills: 'inbox-count',
	},
	all: {
		displayPageKey: 'task:all',
		placement: { kind: 'all' },
		sceneVariant: 'tasks',
		boardVariant: 'tasks',
		emptyTitle: '当前没有任务',
		emptyDescription:
			'这里本来会显示符合当前条件的任务，不过现在还是空的。点「创建任务」先记下一项，后面再慢慢整理也来得及。',
		createDraft: { status: 'todo' },
		supportsProject: true,
		filterProjectsBySpace: false,
		fallbackSubtitle: (task) => (task.inboxAt ? '收件箱' : '独立事项'),
		showStatusPills: 'all',
	},
	'no-project': {
		displayPageKey: 'task:no-project',
		placement: { kind: 'noProject' },
		sceneVariant: 'no-project',
		boardVariant: 'no-project',
		emptyTitle: '当前没有独立事项',
		emptyDescription:
			'这里会放那些还没归属到项目里的任务，现在暂时还是空的。点「创建任务」先记下来，之后再决定要不要放进某个项目。',
		createDraft: { placement: 'noProject' },
		supportsProject: false,
		filterProjectsBySpace: false,
		fallbackSubtitle: '独立事项',
		showStatusPills: 'status-only',
	},
}

export const ALL_TASK_FILTERS: Array<'all' | 'noProject' | TaskStatus> = [
	'all',
	'noProject',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

export const NO_PROJECT_FILTERS: Array<'all' | TaskStatus> = [
	'all',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]
