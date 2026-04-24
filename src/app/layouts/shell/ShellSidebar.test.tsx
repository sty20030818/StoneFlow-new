import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'

describe('ShellSidebar', () => {
	afterEach(() => {
		window.localStorage.clear()
		useShellLayoutStore.setState({
			hiddenNavItemKeys: [],
		})
	})

	it('渲染来自真实数据层的一级导航 badge', () => {
		renderSidebar({
			currentSpaceId: 'work',
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
			'/space/work/inbox',
		)
		expect(screen.getByRole('link', { name: /Trash1/ })).toHaveAttribute(
			'href',
			'/space/work/trash',
		)
	})

	it('渲染真实项目导航并标记当前项目激活态', () => {
		renderSidebar({
			currentSpaceId: 'work',
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
		expect(activeProjectLink).toHaveAttribute('href', '/space/work/project/project-1')
		expect(activeProjectLink).toHaveAttribute('aria-current', 'page')
		expect(screen.getByRole('link', { name: /产品设计paused/ })).toHaveAttribute(
			'href',
			'/space/work/project/project-2',
		)
		expect(screen.getByRole('link', { name: /子项目收口active/ })).toHaveAttribute(
			'href',
			'/space/work/project/project-child',
		)
		expect(screen.getByRole('link', { name: 'Views' }).className).toContain(
			'hover:bg-(--sf-color-shell-hover)',
		)
		expect(screen.getAllByText('active')[0]).toHaveAttribute('data-variant', 'primary')
		expect(screen.getByText('paused')).toHaveAttribute('data-variant', 'warning')
	})

	it('可以从父项目触发创建子项目', () => {
		const onOpenProjectCreateDialog = vi.fn<(parentProjectId?: string | null) => void>()

		renderSidebar({
			currentSpaceId: 'work',
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
			currentSpaceId: 'work',
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
			currentSpaceId: 'work',
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
			currentSpaceId: 'work',
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
			currentSpaceId: 'work',
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
			currentSpaceId: 'work',
			isProjectsLoading: false,
			onOpenTaskCreateDialog,
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [],
			projectsError: null,
		})

		const spaceTrigger = screen.getByRole('button', { name: '切换 Space' })

		expect(spaceTrigger).toHaveTextContent('工作')
		expect(spaceTrigger.querySelector('[data-space-icon-badge="true"]')?.className).toContain(
			'rounded-full',
		)
		expect(spaceTrigger.querySelector('[data-space-icon-badge="true"]')?.className).toContain(
			'bg-[#5e6ad2]',
		)
		expect(spaceTrigger.closest('div')?.className).toContain('px-5.5')
		expect(document.querySelector('nav')?.className).toContain('px-5.5')
		expect(screen.queryByRole('link', { name: '学习' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '新建任务' }))
		expect(onOpenTaskCreateDialog).toHaveBeenCalledTimes(1)

		fireEvent.pointerDown(spaceTrigger)
		const studySpaceItem = screen.getByRole('menuitem', { name: /学习/ })
		expect(studySpaceItem).toBeInTheDocument()
		expect(studySpaceItem.querySelector('[data-space-icon-badge="true"]')?.className).toContain(
			'bg-[#e58a00]',
		)
		expect(studySpaceItem.className).toContain('hover:bg-(--sf-color-shell-hover)')
		expect(studySpaceItem.className).toContain('data-highlighted:bg-(--sf-color-shell-hover)')
	})

	it('固定导航项右键支持隐藏入口和恢复默认侧栏', () => {
		renderSidebar({
			currentSpaceId: 'work',
			isProjectsLoading: false,
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [],
			projectsError: null,
		})

		fireEvent.contextMenu(screen.getByRole('link', { name: 'Inbox' }))
		fireEvent.click(screen.getByRole('menuitem', { name: '自定义侧边栏' }))
		fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Views' }))

		expect(screen.queryByRole('link', { name: 'Views' })).not.toBeInTheDocument()
		expect(window.localStorage.getItem('stoneflow:shell-nav-visibility:v1')).toContain('focus')

		fireEvent.contextMenu(screen.getByRole('link', { name: 'Inbox' }))
		fireEvent.click(screen.getByRole('menuitem', { name: '自定义侧边栏' }))
		fireEvent.click(screen.getByRole('menuitem', { name: '恢复默认侧栏' }))

		expect(screen.getByRole('link', { name: 'Views' })).toBeInTheDocument()
	})

	it('sidebar 空白区右键保留自定义侧边栏入口', () => {
		renderSidebar({
			currentSpaceId: 'work',
			isProjectsLoading: false,
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [],
			projectsError: null,
		})

		fireEvent.contextMenu(document.querySelector('aside') as HTMLElement)

		expect(screen.getByRole('menuitem', { name: '自定义侧边栏' })).toBeInTheDocument()
		expect(screen.queryByRole('menuitem', { name: '恢复默认侧栏' })).not.toBeInTheDocument()
	})
})

function renderSidebar(props: ComponentProps<typeof ShellSidebar>) {
	return render(
		<MemoryRouter initialEntries={['/space/work/project/project-1']}>
			<Routes>
				<Route element={<ShellSidebar {...props} />} path='/space/:spaceId/project/:projectId' />
			</Routes>
		</MemoryRouter>,
	)
}
