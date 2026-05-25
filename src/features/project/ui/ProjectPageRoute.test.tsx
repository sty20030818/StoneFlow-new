import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectPageRoute } from './ProjectPageRoute'

const getProjectDetailMock = vi.hoisted(() => vi.fn())
const projectPagePropsSpy = vi.hoisted(() => vi.fn())

const spaceState = vi.hoisted(() => ({
	spaces: [{ id: 'space-1', name: '工作' }],
}))

vi.mock('@/features/project/api/projects', () => ({
	getProjectDetail: (projectId: string) => getProjectDetailMock(projectId),
}))

vi.mock('@/features/space/model/useSpaceStore', () => ({
	selectSpaces: (state: typeof spaceState) => state.spaces,
	useSpaceStore: (selector: (state: typeof spaceState) => unknown) => selector(spaceState),
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
		projectPagePropsSpy.mockClear()
		spaceState.spaces = [{ id: 'space-1', name: '工作' }]
	})

	it('canonical 项目详情路由能打开项目页面', async () => {
		mockProjectDetail()

		renderProjectPageRoute('/spaces/space-1/projects/project-1/detail')

		expect(await screen.findByText('Project page body')).toBeInTheDocument()
		expect(projectPagePropsSpy).toHaveBeenCalledWith({
			scopeOverride: { type: 'space', spaceId: 'space-1' },
		})
		expect(screen.getByTestId('location')).toHaveTextContent(
			'/spaces/space-1/projects/project-1/detail',
		)
	})

	it('canonical spaceId 不匹配时 replace 到实体真实空间', async () => {
		mockProjectDetail()

		renderProjectPageRoute('/spaces/wrong-space/projects/project-1/detail')

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent(
				'/spaces/space-1/projects/project-1/detail',
			)
		})
	})

	it('未知项目进入错误态', async () => {
		getProjectDetailMock.mockRejectedValue(new Error('not found'))

		renderProjectPageRoute('/spaces/space-1/projects/missing-project/detail')

		expect(await screen.findByText('项目不可用')).toBeInTheDocument()
		expect(screen.getByText('not found')).toBeInTheDocument()
	})

	it('不可见项目进入错误态', async () => {
		spaceState.spaces = [{ id: 'space-2', name: '生活' }]
		mockProjectDetail()

		renderProjectPageRoute('/spaces/space-1/projects/project-1/detail')

		expect(await screen.findByText('项目不可用')).toBeInTheDocument()
		expect(screen.getByText('当前项目不可见，可能已被归档、删除，或当前账号无权访问。')).toBeInTheDocument()
	})
})

function mockProjectDetail() {
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
}

function renderProjectPageRoute(initialEntry: string) {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route element={<RouteProbe />} path='*' />
			</Routes>
		</MemoryRouter>,
	)
}

function RouteProbe() {
	const location = useLocation()

	return (
		<>
			<div data-testid='location'>
				{location.pathname}
				{location.search}
			</div>
			<Routes>
				<Route element={<ProjectPageRoute />} path='/spaces/:spaceId/projects/:projectId/detail' />
			</Routes>
		</>
	)
}
