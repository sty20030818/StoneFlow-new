import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectPageRoute } from './ProjectPageRoute'

const getProjectDetailMock = vi.hoisted(() => vi.fn())
const setActiveScopeMock = vi.hoisted(() => vi.fn<(scope: unknown) => Promise<void>>())
const useWorkspaceSyncMock = vi.hoisted(() => vi.fn<(scope: unknown) => void>())

const shellLayoutPropsSpy = vi.hoisted(() => vi.fn())
const projectPagePropsSpy = vi.hoisted(() => vi.fn())

const shellNavState = vi.hoisted(() => ({
	currentScopeType: 'all' as 'all' | 'space',
	currentSpaceId: null as string | null,
	activeSection: 'inbox' as const,
	setCurrentScope: vi.fn(),
	setActiveSection: vi.fn(),
}))

const spaceState = vi.hoisted(() => ({
	spaces: [{ id: 'space-1', name: '工作' }],
}))

vi.mock('@/features/project/api/projects', () => ({
	getProjectDetail: (projectId: string) => getProjectDetailMock(projectId),
}))

vi.mock('@/features/space/api/spaces', () => ({
	setActiveScope: (scope: unknown) => setActiveScopeMock(scope),
}))

vi.mock('@/features/workspace/model/useWorkspaceSync', () => ({
	useWorkspaceSync: (scope: unknown) => useWorkspaceSyncMock(scope),
}))

vi.mock('@/app/layouts/shell/model/useShellNavStore', () => ({
	selectCurrentScopeType: (state: typeof shellNavState) => state.currentScopeType,
	selectCurrentSpaceId: (state: typeof shellNavState) => state.currentSpaceId,
	selectActiveSection: (state: typeof shellNavState) => state.activeSection,
	useShellNavStore: (selector: (state: typeof shellNavState) => unknown) => selector(shellNavState),
}))

vi.mock('@/features/space/model/useSpaceStore', () => ({
	selectSpaces: (state: typeof spaceState) => state.spaces,
	useSpaceStore: (selector: (state: typeof spaceState) => unknown) => selector(spaceState),
}))

vi.mock('@/app/layouts/shell/ShellLayout', () => ({
	ShellLayout: ({
		children,
		...props
	}: {
		children: React.ReactNode
		activeSection: string
		currentScope: unknown
		currentSpaceId: string | null
	}) => {
		shellLayoutPropsSpy(props)
		return <div data-testid='shell-layout'>{children}</div>
	},
}))

vi.mock('@/features/project/ui/ProjectPage', () => ({
	ProjectPage: (props: unknown) => {
		projectPagePropsSpy(props)
		return <div>Project page body</div>
	},
}))

describe('ProjectPageRoute', () => {
	beforeEach(() => {
		getProjectDetailMock.mockReset()
		setActiveScopeMock.mockReset()
		setActiveScopeMock.mockResolvedValue(undefined)
		useWorkspaceSyncMock.mockClear()
		shellLayoutPropsSpy.mockClear()
		projectPagePropsSpy.mockClear()
		shellNavState.currentScopeType = 'all'
		shellNavState.currentSpaceId = null
		shellNavState.activeSection = 'inbox'
		shellNavState.setCurrentScope.mockReset()
		shellNavState.setActiveSection.mockReset()
		spaceState.spaces = [{ id: 'space-1', name: '工作' }]
	})

	it('已知项目能打开并同步 scope', async () => {
		getProjectDetailMock.mockResolvedValue({
			id: 'project-1',
			spaceId: 'space-1',
			name: '项目 A',
			description: null,
			dueAt: null,
			sortOrder: 1,
			completedAt: null,
			archivedAt: null,
			deletedAt: null,
			createdAt: '2026-05-24T00:00:00Z',
			updatedAt: '2026-05-24T00:00:00Z',
		})

		renderProjectPageRoute('/projects/project-1')

		expect(await screen.findByText('Project page body')).toBeInTheDocument()
		expect(shellLayoutPropsSpy).toHaveBeenCalledWith({
			activeSection: 'project',
			currentScope: { type: 'space', spaceId: 'space-1' },
			currentSpaceId: 'space-1',
		})
		expect(projectPagePropsSpy).toHaveBeenCalledWith({
			scopeOverride: { type: 'space', spaceId: 'space-1' },
		})

		await waitFor(() => {
			expect(shellNavState.setCurrentScope).toHaveBeenCalledWith('space', 'space-1')
			expect(shellNavState.setActiveSection).toHaveBeenCalledWith('project')
			expect(setActiveScopeMock).toHaveBeenCalledWith({ type: 'space', spaceId: 'space-1' })
		})
	})

	it('未知项目进入错误态', async () => {
		getProjectDetailMock.mockRejectedValue(new Error('not found'))

		renderProjectPageRoute('/projects/missing-project')

		expect(await screen.findByText('项目不可用')).toBeInTheDocument()
		expect(screen.getByText('not found')).toBeInTheDocument()
	})

	it('不可见项目回退为 all scope', async () => {
		spaceState.spaces = [{ id: 'space-2', name: '生活' }]
		getProjectDetailMock.mockResolvedValue({
			id: 'project-1',
			spaceId: 'space-1',
			name: '项目 A',
			description: null,
			dueAt: null,
			sortOrder: 1,
			completedAt: null,
			archivedAt: null,
			deletedAt: null,
			createdAt: '2026-05-24T00:00:00Z',
			updatedAt: '2026-05-24T00:00:00Z',
		})

		renderProjectPageRoute('/projects/project-1')

		expect(await screen.findByText('Project page body')).toBeInTheDocument()
		expect(shellLayoutPropsSpy).toHaveBeenCalledWith({
			activeSection: 'project',
			currentScope: { type: 'all' },
			currentSpaceId: null,
		})
		expect(projectPagePropsSpy).toHaveBeenCalledWith({
			scopeOverride: { type: 'all' },
		})

		await waitFor(() => {
			expect(shellNavState.setCurrentScope).not.toHaveBeenCalled()
			expect(shellNavState.setActiveSection).toHaveBeenCalledWith('project')
			expect(setActiveScopeMock).toHaveBeenCalledWith({ type: 'all' })
		})
	})
})

function renderProjectPageRoute(initialEntry: string) {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route element={<ProjectPageRoute />} path='/projects/:projectId' />
			</Routes>
		</MemoryRouter>,
	)
}
