import { describe, expect, it } from 'vitest'

import {
	createGroupedTaskBoardPerformanceFixture,
	createPagedTaskBoardPerformanceFixture,
} from './taskBoardPerformanceFixtures'

describe('taskBoardPerformanceFixtures', () => {
	it('生成 2,000 个任务，并均匀分入 20 个分组', () => {
		const fixture = createGroupedTaskBoardPerformanceFixture(20260812)

		expect(fixture.seed).toBe(20260812)
		expect(fixture.tasks).toHaveLength(2_000)
		expect(fixture.loadedCount).toBe(2_000)
		expect(fixture.totalCount).toBe(2_000)
		expect(fixture.hasNextPage).toBe(false)
		expect(fixture.customSections).toHaveLength(20)
		expect(fixture.customSections.every((section) => section.tasks.length === 100)).toBe(true)
		expect(fixture.customSections.flatMap((section) => section.tasks)).toEqual(fixture.tasks)
		expect(new Set(fixture.tasks.map((task) => task.id)).size).toBe(2_000)
		expect(fixture.tasks.at(0)?.id).toBe('fixture-20260812-group-01-task-001')
		expect(fixture.tasks.at(-1)?.id).toBe('fixture-20260812-group-20-task-100')
	})

	it('生成 200 个已加载任务，并保留 10,000 的服务端总量', () => {
		const fixture = createPagedTaskBoardPerformanceFixture(20260812)

		expect(fixture.seed).toBe(20260812)
		expect(fixture.tasks).toHaveLength(200)
		expect(fixture.loadedCount).toBe(200)
		expect(fixture.totalCount).toBe(10_000)
		expect(fixture.hasNextPage).toBe(true)
		expect(new Set(fixture.tasks.map((task) => task.id)).size).toBe(200)
		expect(fixture.tasks.at(0)?.id).toBe('fixture-20260812-paged-task-00001')
		expect(fixture.tasks.at(-1)?.id).toBe('fixture-20260812-paged-task-00200')
	})

	it('相同 seed 完全可重复，不同 seed 产生不同稳定 ID', () => {
		const first = createGroupedTaskBoardPerformanceFixture(7)
		const repeated = createGroupedTaskBoardPerformanceFixture(7)
		const changed = createGroupedTaskBoardPerformanceFixture(8)

		expect(repeated).toEqual(first)
		expect(changed.tasks[0]?.id).not.toBe(first.tasks[0]?.id)
		expect(createPagedTaskBoardPerformanceFixture(7)).toEqual(
			createPagedTaskBoardPerformanceFixture(7),
		)
	})
})
