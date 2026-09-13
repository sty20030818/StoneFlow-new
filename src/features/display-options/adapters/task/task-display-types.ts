import type { TaskListItem, TaskStatus } from '@/shared/types'

import type {
	ResolvedTaskDisplayOptions,
	TaskDisplayPropertyKey,
} from '@/features/display-options/core'

export type TaskDisplaySection = {
	key: string
	label: string
	tasks: TaskListItem[]
	/** 仅状态组的创建预填等领域动作使用，不充当通用组身份。 */
	status?: TaskStatus
}

export type TaskDisplayApplyResult = {
	options: ResolvedTaskDisplayOptions
	orderedItems: TaskListItem[]
	selectionOrderIds: string[]
	sections: TaskDisplaySection[]
	visibleProperties: TaskDisplayPropertyKey[]
}
