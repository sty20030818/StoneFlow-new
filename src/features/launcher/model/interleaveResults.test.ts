import { describe, expect, it } from 'vitest'

import { interleaveTaskProjectResults } from './interleaveResults'
import type { LauncherProjectItem, LauncherTaskItem } from './types'

function task(id: string): LauncherTaskItem {
	return {
		id,
		spaceId: 'space-1',
		spaceName: 'Space',
		projectId: null,
		projectName: null,
		inboxAt: null,
		title: id,
		note: null,
		priority: 0,
		status: 'todo',
		updatedAt: '2026-01-01T00:00:00.000Z',
		completedAt: null,
	}
}

function project(id: string): LauncherProjectItem {
	return {
		id,
		spaceId: 'space-1',
		spaceName: 'Space',
		name: id,
		note: null,
		updatedAt: '2026-01-01T00:00:00.000Z',
		completedAt: null,
	}
}

describe('interleaveTaskProjectResults', () => {
	it('按 task/project 交错混排并保序', () => {
		const result = interleaveTaskProjectResults(
			[task('t1'), task('t2'), task('t3')],
			[project('p1'), project('p2')],
		)

		expect(result.map((item) => `${item.kind}:${item.id}`)).toEqual([
			'task:t1',
			'project:p1',
			'task:t2',
			'project:p2',
			'task:t3',
		])
	})

	it('一侧为空时返回另一侧保序结果', () => {
		expect(interleaveTaskProjectResults([task('t1')], []).map((item) => item.id)).toEqual(['t1'])
		expect(interleaveTaskProjectResults([], [project('p1')]).map((item) => item.id)).toEqual(['p1'])
	})
})
