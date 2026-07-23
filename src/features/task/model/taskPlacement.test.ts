import { describe, expect, it } from 'vitest'

import { getTaskPlacement } from '@/features/task/model/taskPlacement'

describe('taskPlacement', () => {
	it('优先把带 projectId 的任务识别为 Project', () => {
		expect(
			getTaskPlacement({
				projectId: 'project-1',
			}),
		).toBe('project')
	})

	it('projectId 为空时识别为独立事项', () => {
		expect(
			getTaskPlacement({
				projectId: null,
			}),
		).toBe('standalone')
	})
})
