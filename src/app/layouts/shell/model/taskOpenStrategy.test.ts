import { describe, expect, it } from 'vitest'

import { resolveCommandOpenTargetPath, resolveShellDetailState } from './taskOpenStrategy'

describe('taskOpenStrategy', () => {
	it('外部 task 打开一律进入独立详情页', () => {
		expect(
			resolveCommandOpenTargetPath({
				kind: 'task',
				id: 'task-1',
				spaceId: 'space-1',
				projectId: 'project-1',
				placement: 'project',
			}),
		).toBe('/spaces/space-1/tasks/task-1')

		expect(
			resolveCommandOpenTargetPath({
				kind: 'task',
				id: 'task-2',
				spaceId: 'space-2',
				projectId: null,
				placement: 'inbox',
			}),
		).toBe('/spaces/space-2/tasks/task-2')
	})

	it('project 打开行为保持原来的项目页目标', () => {
		expect(
			resolveCommandOpenTargetPath({
				kind: 'project',
				id: 'project-1',
				spaceId: 'space-1',
				projectId: null,
				placement: 'project',
			}),
		).toBe('/spaces/space-1/projects/project-1')
	})

	it('task route 也被视为 detail context', () => {
		expect(
			resolveShellDetailState({
				activeDetailKind: null,
				routeKind: 'task',
			}),
		).toEqual({
			isDetailOpen: true,
			detailEntityType: 'task',
		})

		expect(
			resolveShellDetailState({
				activeDetailKind: 'project',
				routeKind: 'shell-section',
			}),
		).toEqual({
			isDetailOpen: true,
			detailEntityType: 'project',
		})

		expect(
			resolveShellDetailState({
				activeDetailKind: null,
				routeKind: 'shell-section',
			}),
		).toEqual({
			isDetailOpen: false,
			detailEntityType: undefined,
		})
	})
})
