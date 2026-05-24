import { vi } from 'vitest'

import { normalizeRememberedShellPath, isRememberableShellPath } from './routeRestore'

const getProjectDetailMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/project/api/projects', () => ({
	getProjectDetail: getProjectDetailMock,
}))

describe('routeRestore', () => {
	beforeEach(() => {
		getProjectDetailMock.mockReset()
	})

	it('判断 rememberable shell path', () => {
		expect(isRememberableShellPath('/spaces/inbox')).toBe(true)
		expect(isRememberableShellPath('/space/space-a/project/project-a')).toBe(true)
		expect(isRememberableShellPath('/projects/project-a')).toBe(false)
		expect(isRememberableShellPath('/quick-create')).toBe(false)
	})

	it('对非法 path 返回 fallback', async () => {
		await expect(
			normalizeRememberedShellPath('/projects/project-a', [], '/spaces/inbox'),
		).resolves.toBe('/spaces/inbox')
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
				'/spaces/inbox',
			),
		).resolves.toBe('/space/space-a/project/project-a')
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
				'/spaces/inbox',
			),
		).resolves.toBe('/spaces/inbox')
	})
})
