import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'

describe('ShellSidebar', () => {
	it('渲染真实项目导航并标记当前项目激活态', () => {
		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: false,
			projects: [
				{ id: 'project-1', label: '执行层', badge: 'active' },
				{ id: 'project-2', label: '产品设计', badge: 'paused' },
			],
			projectsError: null,
		})

		const activeProjectLink = screen.getByRole('link', { name: /执行层active/ })
		expect(activeProjectLink).toHaveAttribute('href', '/space/default/project/project-1')
		expect(activeProjectLink).toHaveAttribute('aria-current', 'page')
		expect(screen.getByRole('link', { name: /产品设计paused/ })).toHaveAttribute(
			'href',
			'/space/default/project/project-2',
		)
	})

	it('展示项目加载态', () => {
		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: true,
			projects: [],
			projectsError: null,
		})

		expect(screen.getByText('正在加载项目...')).toBeInTheDocument()
	})

	it('展示项目空态', () => {
		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: false,
			projects: [],
			projectsError: null,
		})

		expect(screen.getByText('当前 Space 还没有项目')).toBeInTheDocument()
	})

	it('展示项目加载失败提示', () => {
		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: false,
			projects: [],
			projectsError: '项目导航加载失败',
		})

		expect(screen.getByText('项目导航加载失败')).toBeInTheDocument()
	})
})

function renderSidebar(props: ComponentProps<typeof ShellSidebar>) {
	return render(
		<MemoryRouter initialEntries={['/space/default/project/project-1']}>
			<Routes>
				<Route element={<ShellSidebar {...props} />} path='/space/:spaceId/project/:projectId' />
			</Routes>
		</MemoryRouter>,
	)
}
