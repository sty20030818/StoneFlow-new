import { useMemo } from 'react'

import type { LauncherDerivedState } from './launcherDomainTypes'
import { formatDateLabel, formatStatusLabel } from '../model/launcherFormatters'
import type {
	LauncherPanelState,
	LauncherProjectItem,
	LauncherResultItem,
	LauncherTaskItem,
} from '../model/types'
import { interleaveTaskProjectResults } from '../model/interleaveResults'
import { formatTaskPlacementLabel } from '@/features/task'
import { formatTaskPriorityLabel } from '@/features/task'

const RECENT_TASK_LIMIT = 5
const RECENT_PROJECT_LIMIT = 5
export const SEARCH_RESULT_LIMIT = 20

export function useLauncherDerivedState(state: LauncherPanelState): LauncherDerivedState {
	const normalizedTitle = state.draft.title.trim()
	const hasTitle = normalizedTitle.length > 0
	const isSearchingMode = normalizedTitle.length > 0
	const isShowingRecent = !isSearchingMode || state.searchView === 'recent'
	const isSearchEmpty =
		isSearchingMode && (state.searchView === 'empty' || state.searchError !== null)

	const displayTasks = useMemo(() => {
		if (isShowingRecent) {
			return (state.initialState?.recentTasks ?? []).slice(0, RECENT_TASK_LIMIT)
		}
		if (state.searchView === 'results') {
			return state.searchResults.tasks
		}
		return [] as LauncherTaskItem[]
	}, [
		isShowingRecent,
		state.initialState?.recentTasks,
		state.searchResults.tasks,
		state.searchView,
	])

	const displayProjects = useMemo(() => {
		if (isShowingRecent) {
			return (state.initialState?.recentProjects ?? []).slice(0, RECENT_PROJECT_LIMIT)
		}
		if (state.searchView === 'results') {
			return state.searchResults.projects
		}
		return [] as LauncherProjectItem[]
	}, [
		isShowingRecent,
		state.initialState?.recentProjects,
		state.searchResults.projects,
		state.searchView,
	])

	const flatItems = useMemo<LauncherResultItem[]>(() => {
		if (isShowingRecent) {
			return [
				...displayTasks.map((item) => ({ kind: 'task' as const, ...item })),
				...displayProjects.map((item) => ({ kind: 'project' as const, ...item })),
			]
		}
		return interleaveTaskProjectResults(displayTasks, displayProjects).slice(0, SEARCH_RESULT_LIMIT)
	}, [displayProjects, displayTasks, isShowingRecent])

	const mode = useMemo(() => {
		if (isShowingRecent) {
			return displayTasks.length === 0 && displayProjects.length === 0
				? ('recent-empty' as const)
				: ('recent' as const)
		}
		if (isSearchEmpty) {
			return 'search-empty' as const
		}
		return 'search' as const
	}, [displayProjects.length, displayTasks.length, isSearchEmpty, isShowingRecent])

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
			state.focusTarget !== 'none' && state.focusTarget !== 'create' ? state.focusTarget.index : -1,
		continuousToastVisible: state.continuousCreateCount > 0 && !hasTitle,
		createMeta,
		displayProjects,
		displayTasks,
		enterLabel: state.focusTarget !== 'none' && state.focusTarget !== 'create' ? '打开' : '创建',
		flatItems,
		hasTitle,
		isCreateFocused: state.focusTarget === 'create',
		isSearchEmpty,
		isSearchingMode,
		isShowingRecent,
		mode,
		placementLabel,
		projectOptions,
		spaceName: currentSpace?.name ?? '加载中...',
	}
}
