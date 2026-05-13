import { useMemo } from 'react'

import type { QuickCreateDerivedState } from '@/features/quick-create/domain/quickCreateDomainTypes'
import {
	formatDateLabel,
	formatStatusLabel,
} from '@/features/quick-create/model/quickCreateFormatters'
import type { QuickCreatePanelState, QuickCreateResultItem } from '@/features/quick-create/model/types'
import { formatTaskPlacementLabel } from '@/features/task/model/taskPlacement'
import { formatTaskPriorityLabel } from '@/features/task/model/taskPriority'

const QUICK_CREATE_MAX_ROWS_PER_BOARD = 3

export function useQuickCreateDerivedState(state: QuickCreatePanelState): QuickCreateDerivedState {
	const normalizedTitle = state.draft.title.trim()
	const hasTitle = normalizedTitle.length > 0
	const isSearchingMode = normalizedTitle.length > 0
	const isShowingRecent = !isSearchingMode || state.searchView === 'recent'
	const isSearchEmpty = isSearchingMode && state.searchView === 'empty'

	const displayTasks = useMemo(() => {
		const sourceTasks = isShowingRecent
			? (state.initialState?.recentTasks ?? [])
			: state.searchView === 'results'
				? state.searchResults.tasks
				: []

		return sourceTasks.slice(0, QUICK_CREATE_MAX_ROWS_PER_BOARD)
	}, [
		isShowingRecent,
		state.initialState?.recentTasks,
		state.searchResults.tasks,
		state.searchView,
	])

	const displayProjects = useMemo(() => {
		const sourceProjects = isShowingRecent
			? (state.initialState?.recentProjects ?? [])
			: state.searchView === 'results'
				? state.searchResults.projects
				: []

		return sourceProjects.slice(0, QUICK_CREATE_MAX_ROWS_PER_BOARD)
	}, [
		isShowingRecent,
		state.initialState?.recentProjects,
		state.searchResults.projects,
		state.searchView,
	])

	const flatItems = useMemo<QuickCreateResultItem[]>(
		() => [
			...displayTasks.map((item) => ({ kind: 'task' as const, ...item })),
			...displayProjects.map((item) => ({ kind: 'project' as const, ...item })),
		],
		[displayProjects, displayTasks],
	)

	const currentSpace =
		state.initialState?.spaces.find((space) => space.id === state.draft.spaceId) ?? null

	const projectOptions = useMemo(() => {
		if (!state.projectSearch.trim()) {
			return state.projectOptions
		}

		const normalizedQuery = state.projectSearch.trim().toLowerCase()
		return state.projectOptions.filter((option) => {
			if (option.kind !== 'project') {
				return true
			}

			return option.name.toLowerCase().includes(normalizedQuery)
		})
	}, [state.projectOptions, state.projectSearch])

	const placementLabel = useMemo(() => {
		if (state.draft.placement.kind === 'project') {
			return (
				state.projectOptions.find(
					(option) => option.kind === 'project' && option.id === state.draft.placement.projectId,
				)?.name ?? '指定项目'
			)
		}

		return formatTaskPlacementLabel(state.draft.placement.kind)
	}, [state.draft.placement, state.projectOptions])

	const createMeta = useMemo(() => {
		const parts = [
			formatTaskPriorityLabel(state.draft.priority),
			formatStatusLabel(state.draft.status),
			currentSpace ? `${currentSpace.name} / ${placementLabel}` : placementLabel,
		]

		if (state.draft.dueAt) {
			parts.push(`截止 ${formatDateLabel(state.draft.dueAt)}`)
		}
		if (state.draft.scheduledAt) {
			parts.push(`计划 ${formatDateLabel(state.draft.scheduledAt)}`)
		}
		if (state.draft.reminderAt) {
			parts.push(`提醒 ${formatDateLabel(state.draft.reminderAt)}`)
		}

		return parts.join(' · ')
	}, [
		currentSpace,
		placementLabel,
		state.draft.dueAt,
		state.draft.priority,
		state.draft.reminderAt,
		state.draft.scheduledAt,
		state.draft.status,
	])

	return {
		activeResultIndex:
			state.focusTarget !== 'none' && state.focusTarget !== 'create'
				? state.focusTarget.index
				: -1,
		continuousToastVisible: state.continuousCreateCount > 0 && !hasTitle,
		createMeta,
		displayProjects,
		displayTasks,
		enterLabel:
			state.focusTarget !== 'none' && state.focusTarget !== 'create' ? '打开' : '创建',
		flatItems,
		hasTitle,
		isCreateFocused: state.focusTarget === 'create',
		isSearchEmpty,
		isSearchingMode,
		isShowingRecent,
		placementLabel,
		projectOptions,
		spaceName: currentSpace?.name ?? '加载中...',
	}
}
