import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'

describe('ShellSidebar', () => {
	it('渲染来自真实数据层的一级导航 badge', () => {
		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: false,
			navBadges: {
				inbox: '7',
				trash: '1',
			},
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [],
			projectsError: null,
		})

		expect(screen.getByRole('link', { name: /Inbox7/ })).toHaveAttribute(
			'href',
			'/space/default/inbox',
		)
		expect(screen.getByRole('link', { name: /Trash1/ })).toHaveAttribute(
			'href',
			'/space/default/trash',
		)
	})

	it('渲染真实项目导航并标记当前项目激活态', () => {
		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: false,
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [
				{
					id: 'project-1',
					label: '执行层',
					badge: 'active',
					children: [{ id: 'project-child', label: '子项目收口', badge: 'active' }],
				},
				{ id: 'project-2', label: '产品设计', badge: 'paused', children: [] },
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
		expect(screen.getByRole('link', { name: /子项目收口active/ })).toHaveAttribute(
			'href',
			'/space/default/project/project-child',
		)
		expect(screen.getByRole('link', { name: 'Focus' }).className).toContain(
			'hover:bg-(--sf-color-shell-hover)',
		)
		expect(screen.getAllByText('active')[0]).toHaveAttribute('data-variant', 'primary')
		expect(screen.getByText('paused')).toHaveAttribute('data-variant', 'warning')
	})

	it('可以从父项目触发创建子项目', () => {
		const onOpenProjectCreateDialog = vi.fn<(parentProjectId?: string | null) => void>()

		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: false,
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog,
			projects: [{ id: 'project-1', label: '执行层', badge: 'active', children: [] }],
			projectsError: null,
		})

		fireEvent.click(screen.getByRole('button', { name: '在 执行层 下创建子项目' }))

		expect(onOpenProjectCreateDialog).toHaveBeenCalledWith('project-1')
	})

	it('展示项目加载态', () => {
		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: true,
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [],
			projectsError: null,
		})

		expect(screen.getByText('正在加载项目...')).toBeInTheDocument()
	})

	it('展示项目空态', () => {
		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: false,
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [],
			projectsError: null,
		})

		expect(screen.getByText('当前 Space 还没有项目')).toBeInTheDocument()
	})

	it('展示项目加载失败提示', () => {
		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: false,
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [],
			projectsError: '项目导航加载失败',
		})

		expect(screen.getByText('项目导航加载失败')).toBeInTheDocument()
	})

	it('提供项目创建入口且不再渲染重复 Projects 一级导航', () => {
		const onOpenProjectCreateDialog = vi.fn<(parentProjectId?: string | null) => void>()

		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: false,
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog,
			projects: [],
			projectsError: null,
		})

		fireEvent.click(screen.getByRole('button', { name: '创建项目' }))

		expect(onOpenProjectCreateDialog).toHaveBeenCalledTimes(1)
		expect(screen.queryByRole('link', { name: 'Projects' })).not.toBeInTheDocument()
	})

	it('使用 Space 下拉和右侧圆形新建任务入口替代顶部 tabs', () => {
		const onOpenTaskCreateDialog = vi.fn<() => void>()

		renderSidebar({
			currentSpaceId: 'default',
			isProjectsLoading: false,
			onOpenTaskCreateDialog,
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [],
			projectsError: null,
		})

		const spaceTrigger = screen.getByRole('button', { name: '切换 Space' })

		expect(spaceTrigger).toHaveTextContent('工作')
		expect(screen.queryByRole('link', { name: '学习' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '新建任务' }))
		expect(onOpenTaskCreateDialog).toHaveBeenCalledTimes(1)

		fireEvent.pointerDown(spaceTrigger)
		expect(screen.getByRole('menuitem', { name: /学习/ })).toBeInTheDocument()
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
