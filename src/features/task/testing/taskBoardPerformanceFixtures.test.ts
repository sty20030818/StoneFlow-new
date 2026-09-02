import { describe, expect, it } from 'vitest'

import {
	DEFAULT_TASK_BOARD_PERFORMANCE_SEED,
	TASK_BOARD_PERFORMANCE_LOADED_COUNTS,
	TASK_BOARD_PERFORMANCE_PAGE_SIZE,
	TASK_BOARD_PERFORMANCE_PROJECT_OPTIONS,
	TASK_BOARD_PERFORMANCE_SPACES,
	createTaskBoardPerformanceLoadedFixture,
	createTaskBoardPerformancePagingSession,
} from './taskBoardPerformanceFixtures'

describe('taskBoardPerformanceFixtures', () => {
	it('为全部基准规模生成确定性的富 Row', () => {
		for (const count of TASK_BOARD_PERFORMANCE_LOADED_COUNTS) {
			const fixture = createTaskBoardPerformanceLoadedFixture(count)
			expect(fixture.tasks).toHaveLength(count)
			expect(new Set(fixture.tasks.map((task) => task.id))).toHaveLength(count)
			expect(fixture).toMatchObject({
				seed: DEFAULT_TASK_BOARD_PERFORMANCE_SEED,
				totalCount: count,
				hasNextPage: false,
			})
		}

		const first = createTaskBoardPerformanceLoadedFixture(600)
		const second = createTaskBoardPerformanceLoadedFixture(600)
		expect(second.tasks).toEqual(first.tasks)
		expect(first.tasks.some((task) => task.projectId === null)).toBe(true)
		expect(first.tasks.some((task) => task.projectId !== null)).toBe(true)
		expect(first.tasks.some((task) => task.dueAt !== null)).toBe(true)
		expect(first.tasks.some((task) => task.plannedAt !== null)).toBe(true)
		expect(first.tasks.some((task) => task.remindAt !== null)).toBe(true)
		expect(TASK_BOARD_PERFORMANCE_PROJECT_OPTIONS).toHaveLength(20)
		expect(TASK_BOARD_PERFORMANCE_SPACES).toHaveLength(4)
	})

	it('分页 session 复用并发请求，并在一次错误后重试到 exhausted', async () => {
		const session = createTaskBoardPerformancePagingSession({ failOnceAtPage: 2 })
		expect(session.getSnapshot()).toMatchObject({
			state: 'idle',
			loadedPageCount: 1,
			totalCount: 600,
			hasNextPage: true,
		})
		expect(session.getSnapshot().tasks).toHaveLength(TASK_BOARD_PERFORMANCE_PAGE_SIZE)

		const failedRequest = session.fetchNextPage()
		const duplicateRequest = session.fetchNextPage()
		expect(duplicateRequest).toBe(failedRequest)
		await expect(failedRequest).rejects.toThrow('性能分页第 2 页注入失败')
		expect(session.getSnapshot()).toMatchObject({
			state: 'error',
			loadedPageCount: 1,
			fetchRequestCount: 1,
			duplicateFetchCount: 1,
		})

		await session.fetchNextPage()
		await session.fetchNextPage()
		const exhausted = await session.fetchNextPage()
		expect(exhausted).toMatchObject({
			state: 'exhausted',
			loadedPageCount: 4,
			fetchRequestCount: 4,
			duplicateFetchCount: 1,
			hasNextPage: false,
		})
		expect(exhausted.tasks).toEqual(createTaskBoardPerformanceLoadedFixture(600).tasks)

		await session.fetchNextPage()
		expect(session.getSnapshot().fetchRequestCount).toBe(4)

		const partialSession = createTaskBoardPerformancePagingSession({ totalCount: 320 })
		await partialSession.fetchNextPage()
		const partialFinalPage = await partialSession.fetchNextPage()
		expect(partialFinalPage).toMatchObject({
			state: 'exhausted',
			loadedPageCount: 3,
			fetchRequestCount: 2,
		})
		expect(partialFinalPage.tasks).toHaveLength(320)
	})
})
