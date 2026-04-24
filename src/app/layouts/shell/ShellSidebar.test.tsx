import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'
import { SidebarProvider } from '@/shared/ui/base/sidebar'
import { TooltipProvider } from '@/shared/ui/base/tooltip'

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
		expect(screen.getByRole('link', { name: 'Views' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
			'href',
			'/space/work/settings',
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

		const activeProjectLink = screen.getByRole('link', { name: '执行层' })
		expect(activeProjectLink).toHaveAttribute('href', '/space/work/project/project-1')
		expect(activeProjectLink).toHaveAttribute('aria-current', 'page')
		expect(activeProjectLink.querySelector('svg')).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '产品设计' })).toHaveAttribute(
			'href',
			'/space/work/project/project-2',
		)
		fireEvent.click(screen.getByRole('button', { name: '展开子项目' }))
		expect(screen.getByRole('link', { name: '子项目收口' })).toHaveAttribute(
			'href',
			'/space/work/project/project-child',
		)
		expect(screen.getByRole('link', { name: 'Views' }).className).toContain(
			'hover:bg-(--sf-color-shell-hover)',
		)
		expect(screen.queryByText('active')).not.toBeInTheDocument()
		expect(screen.queryByText('paused')).not.toBeInTheDocument()
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

	it('移除项目行尾快捷按钮，项目管理改由右键菜单承接', () => {
		renderSidebar({
			currentSpaceId: 'work',
			isProjectsLoading: false,
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [{ id: 'project-1', label: '执行层', badge: 'active', children: [] }],
			projectsError: null,
		})

		expect(screen.queryByRole('button', { name: '在 执行层 下创建子项目' })).not.toBeInTheDocument()
	})

	it('项目项右键仍可打开项目管理菜单', () => {
		renderSidebar({
			currentSpaceId: 'work',
			isProjectsLoading: false,
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [{ id: 'project-1', label: '执行层', badge: 'active', children: [] }],
			projectsError: null,
		})

		fireEvent.contextMenu(screen.getByRole('link', { name: '执行层' }))

		expect(screen.getByRole('menuitem', { name: '打开项目' })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: '新建子项目' })).toBeInTheDocument()
	})

	it('使用 Space 下拉替代顶部 tabs', () => {
		renderSidebar({
			currentSpaceId: 'work',
			isProjectsLoading: false,
			onOpenTaskCreateDialog: vi.fn<() => void>(),
			onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
			projects: [],
			projectsError: null,
		})

		const spaceTrigger = screen.getByRole('button', { name: '切换 Space' })

		expect(spaceTrigger).toHaveTextContent('工作')
		expect(spaceTrigger.querySelector('[data-space-icon-badge="true"]')?.className).toContain(
			'rounded-lg',
		)
		expect(spaceTrigger.querySelector('[data-space-icon-badge="true"]')?.className).toContain(
			'bg-[#5e6ad2]',
		)
		expect(document.querySelector('[data-slot="sidebar-header"]')?.className).toContain('px-3')
		expect(document.querySelectorAll('[data-slot="sidebar-group"]')[0]?.className).toContain('px-3')
		expect(screen.queryByRole('link', { name: '学习' })).not.toBeInTheDocument()

		fireEvent.pointerDown(spaceTrigger)
		const studySpaceItem = screen.getByRole('menuitem', { name: /学习/ })
		expect(studySpaceItem).toBeInTheDocument()
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
		expect(screen.getByRole('link', { name: 'Trash' })).toBeInTheDocument()
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

	it('自定义侧边栏仅控制 Inbox 和 Views，不包含 Footer 入口', () => {
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

		expect(screen.getByRole('menuitemcheckbox', { name: 'Inbox' })).toBeInTheDocument()
		expect(screen.getByRole('menuitemcheckbox', { name: 'Views' })).toBeInTheDocument()
		expect(screen.queryByRole('menuitemcheckbox', { name: 'Trash' })).not.toBeInTheDocument()
		expect(screen.queryByRole('menuitemcheckbox', { name: 'Settings' })).not.toBeInTheDocument()
	})

	it('在 Trash 路由下高亮 Footer 的 Trash 入口', () => {
		renderSidebar(
			{
				currentSpaceId: 'work',
				isProjectsLoading: false,
				onOpenTaskCreateDialog: vi.fn<() => void>(),
				onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
				projects: [],
				projectsError: null,
			},
			'/space/work/trash',
		)

		expect(screen.getByRole('link', { name: 'Trash' })).toHaveAttribute('aria-current', 'page')
		expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('aria-current')
	})

	it('在 Settings 路由下高亮 Footer 的 Settings 入口', () => {
		renderSidebar(
			{
				currentSpaceId: 'work',
				isProjectsLoading: false,
				onOpenTaskCreateDialog: vi.fn<() => void>(),
				onOpenProjectCreateDialog: vi.fn<(parentProjectId?: string | null) => void>(),
				projects: [],
				projectsError: null,
			},
			'/space/work/settings',
		)

		expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
	})
})

function renderSidebar(
	props: ComponentProps<typeof ShellSidebar>,
	initialEntry = '/space/work/project/project-1',
) {
	return render(
		<TooltipProvider>
			<SidebarProvider>
				<MemoryRouter initialEntries={[initialEntry]}>
					<Routes>
						<Route element={<ShellSidebar {...props} />} path='/space/:spaceId/*' />
					</Routes>
				</MemoryRouter>
			</SidebarProvider>
		</TooltipProvider>,
	)
}
