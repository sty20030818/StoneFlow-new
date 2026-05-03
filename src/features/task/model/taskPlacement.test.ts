import { describe, expect, it } from 'vitest'

import { getTaskPlacement } from '@/features/task/model/taskPlacement'

describe('taskPlacement', () => {
	it('优先把带 projectId 的任务识别为 Project', () => {
		expect(
			getTaskPlacement({
				projectId: 'project-1',
				inboxAt: '2026-05-03T10:00:00Z',
			}),
		).toBe('project')
	})

	it('把 projectId 为空且 inboxAt 有值的任务识别为 Inbox', () => {
		expect(
			getTaskPlacement({
				projectId: null,
				inboxAt: '2026-05-03T10:00:00Z',
			}),
		).toBe('inbox')
	})

	it('只在 projectId 和 inboxAt 都为空时识别为 No Project', () => {
		expect(
			getTaskPlacement({
				projectId: null,
				inboxAt: null,
			}),
		).toBe('noProject')
	})
})
