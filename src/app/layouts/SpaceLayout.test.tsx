import { waitFor } from '@testing-library/react'
import { beforeEach, vi } from 'vitest'

import { ShellRouteProvider } from '@/app/layouts/shell/model/ShellRouteContext'
import { parseShellRoute } from '@/app/navigation/shellRoute'
import { renderWithRouterContext } from '@/test-utils/renderWithRouter'
import { SpaceLayout } from './SpaceLayout'

const setActiveScopeMock = vi.hoisted(() => vi.fn<(scope: unknown) => Promise<void>>())
const useWorkspaceSyncMock = vi.hoisted(() => vi.fn())
const shellLayoutPropsSpy = vi.hoisted(() => vi.fn())

const shellNavState = vi.hoisted(() => ({
	currentScopeType: 'all' as 'all' | 'space',
	currentSpaceId: null as string | null,
	activeSection: 'inbox' as const,
	setCurrentScope: vi.fn(),
	setActiveSection: vi.fn(),
}))

const spaceState = vi.hoisted(() => ({
	spaces: [{ id: 'space-a', name: '工作', isDefault: true }],
}))

vi.mock('./shell/model/useShellNavStore', () => ({
	selectCurrentScopeType: (state: typeof shellNavState) => state.currentScopeType,
	selectCurrentSpaceId: (state: typeof shellNavState) => state.currentSpaceId,
	selectActiveSection: (state: typeof shellNavState) => state.activeSection,
	useShellNavStore: (selector: (state: typeof shellNavState) => unknown) => selector(shellNavState),
}))

vi.mock('./shell/ShellLayout', () => ({
	ShellLayout: ({ children, ...props }: { children: React.ReactNode }) => {
		shellLayoutPropsSpy(props)
		return <div>{children}</div>
	},
}))

vi.mock('@/features/space/api/spaces', () => ({
	setActiveScope: (scope: unknown) => setActiveScopeMock(scope),
}))

vi.mock('@/features/space/query', () => ({
	useSpaces: () => ({
		spaces: spaceState.spaces,
		status: 'ready',
		error: null,
		refetch: vi.fn(),
	}),
}))

vi.mock('@/features/workspace/model/useWorkspaceSync', () => ({
	useWorkspaceSync: (scope: unknown) => useWorkspaceSyncMock(scope),
}))

describe('SpaceLayout', () => {
	beforeEach(() => {
		setActiveScopeMock.mockReset()
		setActiveScopeMock.mockResolvedValue(undefined)
		useWorkspaceSyncMock.mockClear()
		shellLayoutPropsSpy.mockClear()
		spaceState.spaces = [{ id: 'space-a', name: '工作', isDefault: true }]
		shellNavState.currentScopeType = 'all'
		shellNavState.currentSpaceId = null
		shellNavState.activeSection = 'inbox'
		shellNavState.setCurrentScope.mockReset()
		shellNavState.setActiveSection.mockReset()
	})

	it('用结构化 shell route 同步 scope、section', async () => {
		await renderSpaceLayout('/spaces/space-a/projects/project-a')

		await waitFor(() => {
			expect(shellNavState.setCurrentScope).toHaveBeenCalledWith('space', 'space-a')
			expect(shellNavState.setActiveSection).toHaveBeenCalledWith('projects')
			expect(setActiveScopeMock).toHaveBeenCalledWith({ type: 'space', spaceId: 'space-a' })
		})

		expect(useWorkspaceSyncMock).toHaveBeenCalledWith({ type: 'space', spaceId: 'space-a' })
		expect(shellLayoutPropsSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				activeSection: 'inbox',
				currentScope: { type: 'space', spaceId: 'space-a' },
				currentSpaceId: 'space-a',
				shellRoute: expect.objectContaining({
					section: 'projects',
					projectId: 'project-a',
					fullPath: '/spaces/space-a/projects/project-a',
				}),
			}),
		)
	})

	it('同步恢复后当前路由 Space 不存在时跳到可见默认 Space 的同一栏目', async () => {
		spaceState.spaces = [{ id: 'space-new', name: '个人', isDefault: true }]

		const { router } = await renderSpaceLayout('/spaces/space-old/projects')

		await waitFor(() => {
			expect(router.state.location.pathname).toBe('/spaces/space-new/projects')
		})
	})
})

function renderSpaceLayout(initialEntry: string) {
	return renderWithRouterContext(
		<ShellRouteProvider shellRoute={parseShellRoute(initialEntry)}>
			<SpaceLayout />
		</ShellRouteProvider>,
		{
			initialEntry,
		},
	)
}
