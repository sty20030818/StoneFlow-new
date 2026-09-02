import type { TaskListItem, TaskStatus } from '@/shared/types'

import type { TaskBoardCustomSection } from '../model/taskBoardModel'

const TASK_STATUSES = [
	'todo',
	'doing',
	'waiting',
	'done',
	'canceled',
] as const satisfies readonly TaskStatus[]
const TASK_PRIORITIES = [0, 1, 2, 3, 4] as const
const BASE_TIME_MS = Date.parse('2026-01-01T00:00:00.000Z')

export const DEFAULT_TASK_BOARD_PERFORMANCE_SEED = 20_260_812

export type TaskBoardPerformanceFixture = {
	seed: number
	tasks: TaskListItem[]
	customSections?: TaskBoardCustomSection[]
	totalCount: number
	hasNextPage: boolean
}

export function createGroupedTaskBoardPerformanceFixture(
	seed = DEFAULT_TASK_BOARD_PERFORMANCE_SEED,
): TaskBoardPerformanceFixture & { customSections: TaskBoardCustomSection[] } {
	const normalizedSeed = seed >>> 0
	const tasks: TaskListItem[] = []
	const customSections: TaskBoardCustomSection[] = []

	for (let groupIndex = 0; groupIndex < 20; groupIndex += 1) {
		const groupNumber = String(groupIndex + 1).padStart(2, '0')
		const sectionTasks: TaskListItem[] = []

		for (let rowIndex = 0; rowIndex < 100; rowIndex += 1) {
			const absoluteIndex = groupIndex * 100 + rowIndex
			const rowNumber = String(rowIndex + 1).padStart(3, '0')
			const task = createFixtureTask({
				seed: normalizedSeed,
				index: absoluteIndex,
				id: `fixture-${normalizedSeed}-group-${groupNumber}-task-${rowNumber}`,
				title: `性能任务 ${groupNumber}-${rowNumber}`,
			})
			sectionTasks.push(task)
			tasks.push(task)
		}

		customSections.push({
			key: `performance-group-${groupNumber}`,
			label: `性能分组 ${groupNumber}`,
			tasks: sectionTasks,
		})
	}

	return {
		seed: normalizedSeed,
		tasks,
		customSections,
		totalCount: 2_000,
		hasNextPage: false,
	}
}

export function createPagedTaskBoardPerformanceFixture(
	seed = DEFAULT_TASK_BOARD_PERFORMANCE_SEED,
): TaskBoardPerformanceFixture {
	const normalizedSeed = seed >>> 0
	const tasks = Array.from({ length: 200 }, (_, index) => {
		const taskNumber = String(index + 1).padStart(5, '0')
		return createFixtureTask({
			seed: normalizedSeed,
			index,
			id: `fixture-${normalizedSeed}-paged-task-${taskNumber}`,
			title: `分页性能任务 ${taskNumber}`,
		})
	})

	return {
		seed: normalizedSeed,
		tasks,
		totalCount: 10_000,
		hasNextPage: true,
	}
}

function createFixtureTask({
	seed,
	index,
	id,
	title,
}: {
	seed: number
	index: number
	id: string
	title: string
}): TaskListItem {
	const status = TASK_STATUSES[(seed + index) % TASK_STATUSES.length]!
	const timestamp = new Date(BASE_TIME_MS + index * 60_000).toISOString()
	const projectNumber = (index % 20) + 1
	const hasProject = index % 5 !== 0

	return {
		id,
		spaceId: `space-${(index % 4) + 1}`,
		spaceName: `空间 ${(index % 4) + 1}`,
		spaceSlug: `space-${(index % 4) + 1}`,
		projectId: hasProject ? `project-${projectNumber}` : null,
		projectName: hasProject ? `项目 ${projectNumber}` : null,
		title,
		status,
		statusChangedAt: timestamp,
		priority: TASK_PRIORITIES[index % TASK_PRIORITIES.length]!,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: status === 'done' ? timestamp : null,
		canceledAt: status === 'canceled' ? timestamp : null,
		archivedAt: null,
		createdAt: timestamp,
		updatedAt: timestamp,
	}
}
