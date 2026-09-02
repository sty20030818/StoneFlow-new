import type { ProjectOption } from '@/features/project'
import type { Space, TaskListItem, TaskStatus } from '@/shared/types'

const TASK_STATUSES = [
	'todo',
	'doing',
	'waiting',
	'done',
	'canceled',
] as const satisfies readonly TaskStatus[]
const TASK_PRIORITIES = [0, 1, 2, 3, 4] as const
const SPACE_VISUALS = [
	{ colorKey: 'blue', iconKey: 'briefcase' },
	{ colorKey: 'green', iconKey: 'leaf' },
	{ colorKey: 'amber', iconKey: 'sparkles' },
	{ colorKey: 'rose', iconKey: 'target' },
] as const
const BASE_TIME_MS = Date.parse('2026-01-01T00:00:00.000Z')
const MINUTE_MS = 60_000

export const DEFAULT_TASK_BOARD_PERFORMANCE_SEED = 20_260_812
export const TASK_BOARD_PERFORMANCE_PAGE_SIZE = 150
export const TASK_BOARD_PERFORMANCE_LOADED_COUNTS = [150, 300, 600, 2_000, 10_000] as const

export const TASK_BOARD_PERFORMANCE_SPACES: Space[] = SPACE_VISUALS.map(
	({ colorKey, iconKey }, index) => ({
		id: `space-${index + 1}`,
		name: `性能空间 ${index + 1}`,
		iconKey,
		colorKey,
		isDefault: index === 0,
		position: index,
		archivedAt: null,
		deletedAt: null,
		createdAt: new Date(BASE_TIME_MS).toISOString(),
		updatedAt: new Date(BASE_TIME_MS).toISOString(),
	}),
)

export const TASK_BOARD_PERFORMANCE_PROJECT_OPTIONS: ProjectOption[] = Array.from(
	{ length: 20 },
	(_, index) => ({
		id: `project-${index + 1}`,
		spaceId: `space-${(index % TASK_BOARD_PERFORMANCE_SPACES.length) + 1}`,
		name: `性能项目 ${index + 1}`,
	}),
)

export type TaskBoardPerformanceFixture = {
	seed: number
	tasks: TaskListItem[]
	totalCount: number
	hasNextPage: boolean
}

export type TaskBoardPerformancePagingSnapshot = TaskBoardPerformanceFixture & {
	state: 'idle' | 'loading' | 'error' | 'exhausted'
	error: string | null
	loadedPageCount: number
	fetchRequestCount: number
	duplicateFetchCount: number
}

export type TaskBoardPerformancePagingSession = {
	getSnapshot: () => TaskBoardPerformancePagingSnapshot
	fetchNextPage: () => Promise<TaskBoardPerformancePagingSnapshot>
}

export function createTaskBoardPerformanceLoadedFixture(
	loadedTaskCount: number,
	seed = DEFAULT_TASK_BOARD_PERFORMANCE_SEED,
): TaskBoardPerformanceFixture {
	assertTaskCount(loadedTaskCount, 'loadedTaskCount')
	const normalizedSeed = seed >>> 0

	return {
		seed: normalizedSeed,
		tasks: createFixtureTasks(normalizedSeed, 0, loadedTaskCount),
		totalCount: loadedTaskCount,
		hasNextPage: false,
	}
}

export function createTaskBoardPerformancePagingSession({
	seed = DEFAULT_TASK_BOARD_PERFORMANCE_SEED,
	totalCount = 600,
	failOnceAtPage,
}: {
	seed?: number
	totalCount?: number
	failOnceAtPage?: number
} = {}): TaskBoardPerformancePagingSession {
	assertTaskCount(totalCount, 'totalCount')
	if (
		failOnceAtPage !== undefined &&
		(!Number.isSafeInteger(failOnceAtPage) || failOnceAtPage < 2)
	) {
		throw new RangeError('failOnceAtPage 必须是大于等于 2 的安全整数')
	}

	const normalizedSeed = seed >>> 0
	let tasks = createFixtureTasks(
		normalizedSeed,
		0,
		Math.min(TASK_BOARD_PERFORMANCE_PAGE_SIZE, totalCount),
	)
	let fetchRequestCount = 0
	let duplicateFetchCount = 0
	let failedPage: number | null = null
	let inFlight: Promise<TaskBoardPerformancePagingSnapshot> | null = null
	let snapshot = buildPagingSnapshot('idle')

	function buildPagingSnapshot(
		state: TaskBoardPerformancePagingSnapshot['state'],
		error: string | null = null,
	): TaskBoardPerformancePagingSnapshot {
		const exhausted = tasks.length >= totalCount
		return {
			seed: normalizedSeed,
			tasks,
			totalCount,
			hasNextPage: !exhausted,
			state: exhausted ? 'exhausted' : state,
			error,
			loadedPageCount: Math.ceil(tasks.length / TASK_BOARD_PERFORMANCE_PAGE_SIZE),
			fetchRequestCount,
			duplicateFetchCount,
		}
	}

	function fetchNextPage() {
		if (inFlight) {
			duplicateFetchCount += 1
			snapshot = buildPagingSnapshot('loading')
			return inFlight
		}
		if (!snapshot.hasNextPage) return Promise.resolve(snapshot)

		fetchRequestCount += 1
		snapshot = buildPagingSnapshot('loading')
		const nextPage = snapshot.loadedPageCount + 1
		const request = Promise.resolve().then(() => {
			if (failOnceAtPage === nextPage && failedPage !== nextPage) {
				failedPage = nextPage
				const error = `性能分页第 ${nextPage} 页注入失败`
				snapshot = buildPagingSnapshot('error', error)
				throw new Error(error)
			}

			const nextCount = Math.min(TASK_BOARD_PERFORMANCE_PAGE_SIZE, totalCount - tasks.length)
			tasks = [...tasks, ...createFixtureTasks(normalizedSeed, tasks.length, nextCount)]
			snapshot = buildPagingSnapshot('idle')
			return snapshot
		})
		inFlight = request
		void request.then(
			() => {
				if (inFlight === request) inFlight = null
			},
			() => {
				if (inFlight === request) inFlight = null
			},
		)
		return request
	}

	return {
		getSnapshot: () => snapshot,
		fetchNextPage,
	}
}

function createFixtureTasks(seed: number, startIndex: number, count: number): TaskListItem[] {
	return Array.from({ length: count }, (_, offset) => {
		const index = startIndex + offset
		return createFixtureTask(seed, index)
	})
}

function createFixtureTask(seed: number, index: number): TaskListItem {
	const variant = (seed + index) >>> 0
	const status = TASK_STATUSES[variant % TASK_STATUSES.length]!
	const timestampMs = BASE_TIME_MS + index * MINUTE_MS
	const timestamp = new Date(timestampMs).toISOString()
	const projectIndex = variant % TASK_BOARD_PERFORMANCE_PROJECT_OPTIONS.length
	const project = TASK_BOARD_PERFORMANCE_PROJECT_OPTIONS[projectIndex]!
	const space = TASK_BOARD_PERFORMANCE_SPACES[projectIndex % TASK_BOARD_PERFORMANCE_SPACES.length]!
	const hasProject = variant % 5 !== 0
	const plannedAt = variant % 3 === 0 ? new Date(timestampMs + 180 * MINUTE_MS).toISOString() : null
	const dueAt = variant % 4 === 0 ? new Date(timestampMs + 1_440 * MINUTE_MS).toISOString() : null
	const reminderTarget = plannedAt ?? dueAt
	const taskNumber = String(index + 1).padStart(5, '0')
	const titleSuffix = variant % 7 === 0 ? ' · 包含较长标题以覆盖真实截断与布局成本' : ''

	return {
		id: `fixture-${seed}-task-${taskNumber}`,
		spaceId: space.id,
		spaceName: space.name,
		spaceSlug: space.id,
		projectId: hasProject ? project.id : null,
		projectName: hasProject ? project.name : null,
		title: `性能任务 ${taskNumber}${titleSuffix}`,
		status,
		statusChangedAt: timestamp,
		priority: TASK_PRIORITIES[variant % TASK_PRIORITIES.length]!,
		dueAt,
		plannedAt,
		remindAt:
			reminderTarget && variant % 2 === 0
				? new Date(Date.parse(reminderTarget) - 30 * MINUTE_MS).toISOString()
				: null,
		completedAt: status === 'done' ? timestamp : null,
		canceledAt: status === 'canceled' ? timestamp : null,
		archivedAt: null,
		createdAt: timestamp,
		updatedAt: timestamp,
	}
}

function assertTaskCount(value: number, name: string) {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new RangeError(`${name} 必须是非负安全整数`)
	}
}
