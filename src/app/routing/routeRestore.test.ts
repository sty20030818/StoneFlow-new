import { vi } from 'vitest'

import { normalizeRememberedShellPath, isRememberableShellPath } from './routeRestore'

const getProjectDetailMock = vi.hoisted(() => vi.fn())
const getTaskDetailMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/project/api/projects', () => ({
	getProjectDetail: getProjectDetailMock,
}))

vi.mock('@/features/task/api/tasks', () => ({
	getTaskDetail: getTaskDetailMock,
}))

describe('routeRestore', () => {
	beforeEach(() => {
		getProjectDetailMock.mockReset()
		getTaskDetailMock.mockReset()
	})

	it('判断 rememberable shell path', () => {
		expect(isRememberableShellPath('/all/inbox')).toBe(true)
		expect(isRememberableShellPath('/spaces/space-a/project/project-a')).toBe(true)
		expect(isRememberableShellPath('/spaces/space-a/tasks/task-a')).toBe(true)
		expect(isRememberableShellPath('/spaces/space-a/projects/project-a/detail')).toBe(true)
		expect(isRememberableShellPath('/spaces/inbox')).toBe(true)
		expect(isRememberableShellPath('/space/space-a/project/project-a')).toBe(true)
		expect(isRememberableShellPath('/projects/project-a')).toBe(false)
		expect(isRememberableShellPath('/quick-create')).toBe(false)
	})

	it('对非法 path 返回 fallback', async () => {
		await expect(normalizeRememberedShellPath('/projects/project-a', [], '/all/inbox')).resolves.toBe(
			'/all/inbox',
		)
	})

	it('校验 space project remembered path', async () => {
		getProjectDetailMock.mockResolvedValue({
			id: 'project-a',
			spaceId: 'space-a',
		})

		await expect(
			normalizeRememberedShellPath(
				'/space/space-a/project/project-a',
				[{ id: 'space-a' } as never],
				'/all/inbox',
			),
		).resolves.toBe('/spaces/space-a/project/project-a')
	})

	it('项目不匹配时回退 fallback', async () => {
		getProjectDetailMock.mockResolvedValue({
			id: 'project-a',
			spaceId: 'space-b',
		})

		await expect(
			normalizeRememberedShellPath(
				'/space/space-a/project/project-a',
				[{ id: 'space-a' } as never],
				'/all/inbox',
			),
		).resolves.toBe('/all/inbox')
	})

	it('校验 canonical project detail remembered path', async () => {
		getProjectDetailMock.mockResolvedValue({
			id: 'project-a',
			spaceId: 'space-a',
		})

		await expect(
			normalizeRememberedShellPath(
				'/spaces/space-a/projects/project-a/detail',
				[{ id: 'space-a' } as never],
				'/all/inbox',
			),
		).resolves.toBe('/spaces/space-a/projects/project-a/detail')
	})

	it('校验 canonical task detail remembered path', async () => {
		getTaskDetailMock.mockResolvedValue({
			id: 'task-a',
			spaceId: 'space-a',
		})

		await expect(
			normalizeRememberedShellPath(
				'/spaces/space-a/tasks/task-a',
				[{ id: 'space-a' } as never],
				'/all/inbox',
			),
		).resolves.toBe('/spaces/space-a/tasks/task-a')
	})

	it('任务 detail space 不匹配时回退 fallback', async () => {
		getTaskDetailMock.mockResolvedValue({
			id: 'task-a',
			spaceId: 'space-b',
		})

		await expect(
			normalizeRememberedShellPath(
				'/spaces/space-a/tasks/task-a',
				[{ id: 'space-a' } as never],
				'/all/inbox',
			),
		).resolves.toBe('/all/inbox')
	})
})
