import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	closeEntityDrawerTarget,
	openEntityDrawerTarget,
	resolveEntityPageTarget,
} from './entityDetailNavigation'

const getTaskDetailMock = vi.hoisted(() => vi.fn())
const getProjectDetailMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/task', () => ({
	getTaskDetail: (taskId: string) => getTaskDetailMock(taskId),
}))

vi.mock('@/features/project', () => ({
	getProjectDetail: (projectId: string) => getProjectDetailMock(projectId),
}))

describe('entityDetailNavigation', () => {
	beforeEach(() => {
		getTaskDetailMock.mockReset()
		getProjectDetailMock.mockReset()
	})

	it('首次打开 Drawer 使用 push', () => {
		expect(
			openEntityDrawerTarget(
				{ pathname: '/work/standalone', search: '' },
				{ kind: 'task', id: 'task-a' },
			),
		).toEqual({
			pathname: '/work/standalone',
			search: '?task=task-a',
			replace: false,
		})
	})

	it('切换 task 使用 replace', () => {
		expect(
			openEntityDrawerTarget(
				{ pathname: '/work/standalone', search: '?task=task-a' },
				{ kind: 'task', id: 'task-b' },
			),
		).toEqual({
			pathname: '/work/standalone',
			search: '?task=task-b',
			replace: true,
		})
	})

	it('关闭 Drawer 使用 replace', () => {
		expect(
			closeEntityDrawerTarget({ pathname: '/views', search: '?view=today&task=task-a' }),
		).toEqual({
			pathname: '/views',
			search: '?view=today',
			replace: true,
		})
	})

	it('解析 canonical task detail page target', async () => {
		getTaskDetailMock.mockResolvedValue({
			id: 'task/a',
			spaceId: 'space/a',
		})

		await expect(resolveEntityPageTarget({ kind: 'task', id: 'task/a' })).resolves.toEqual({
			pathname: '/space%2Fa/tasks/task%2Fa',
			search: '',
			replace: false,
		})
	})

	it('解析 canonical project detail page target', async () => {
		getProjectDetailMock.mockResolvedValue({
			id: 'project/a',
			spaceId: 'space-a',
		})

		await expect(resolveEntityPageTarget({ kind: 'project', id: 'project/a' })).resolves.toEqual({
			pathname: '/space-a/projects/project%2Fa',
			search: '',
			replace: false,
		})
	})
})
