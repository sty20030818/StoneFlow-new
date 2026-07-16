import type { EntitySceneTaskBoardConfig } from '@/layout/entity-scene/types'
import type { TaskListItem, TaskStatus } from '@/shared/types'

import type {
	ResolvedTaskDisplayOptions,
	TaskDisplayGroupBy,
	TaskDisplayPageKey,
	TaskDisplayPropertyKey,
} from '@/features/display-options/core'

export type TaskDisplaySection = {
	key: string
	label: string
	tasks: TaskListItem[]
}

export type TaskDisplayApplyContext = {
	pageKey: TaskDisplayPageKey
	includeEmptySections?: boolean
}

export type TaskDisplayBoardPatch = Pick<
	EntitySceneTaskBoardConfig,
	'customSections' | 'statusOrder' | 'hideEmptySections'
>

export type TaskDisplayApplyResult = {
	options: ResolvedTaskDisplayOptions
	orderedItems: TaskListItem[]
	selectionOrderIds: string[]
	sections: TaskDisplaySection[]
	visibleProperties: TaskDisplayPropertyKey[]
	boardPatch: TaskDisplayBoardPatch
}

export type TaskDisplayComparatorContext = {
	pageKey: TaskDisplayPageKey
}

export type TaskDisplayGroupingContext = {
	pageKey: TaskDisplayPageKey
	includeEmptySections: boolean
}

export type TaskDateBucketKey = 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'later' | 'none'

export type TaskDisplayStatusRank = Record<TaskStatus, number>

export type TaskGroupDefinition = {
	key: string
	label: string
	value: string
}

export type TaskDisplayGroupDescriptor = {
	groupBy: TaskDisplayGroupBy
	groups: TaskGroupDefinition[]
}
