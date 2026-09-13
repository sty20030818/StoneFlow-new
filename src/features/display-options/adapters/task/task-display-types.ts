import type { TaskListItem, TaskStatus } from '@/shared/types'

import type {
	ResolvedTaskDisplayOptions,
	TaskDisplayPropertyKey,
} from '@/features/display-options/core'

export type TaskDisplayLeafSection = {
	key: string
	label: string
	tasks: TaskListItem[]
	/** 仅状态组的创建预填等领域动作使用，不充当通用组身份。 */
	status?: TaskStatus
}

export type TaskDisplaySection = TaskDisplayLeafSection & {
	/** 有子组时，主组 tasks 包含全部已加载后代；叶组只持有自己的成员。 */
	children?: TaskDisplayLeafSection[]
}

export type TaskDisplayApplyResult = {
	options: ResolvedTaskDisplayOptions
	orderedItems: TaskListItem[]
	selectionOrderIds: string[]
	sections: TaskDisplaySection[]
	visibleProperties: TaskDisplayPropertyKey[]
}
