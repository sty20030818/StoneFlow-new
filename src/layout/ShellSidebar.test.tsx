import { useLocation } from '@tanstack/react-router'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { ShellSidebar } from '@/layout/ShellSidebar'
import { resolveRememberedPathForScope } from '@/app/navigation'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import { SubmitRegistryProvider } from '@/features/submit'
import { SyncStatusProvider } from '@/features/sync'
import { SidebarProvider } from '@/shared/components/base/sidebar'
import { TooltipProvider } from '@/shared/components/base/tooltip'
import { renderWithRouterContext } from '@/test/renderWithRouter'

vi.mock('@/app/navigation', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/navigation')>()
	return {
		...actual,
		resolveRememberedPathForScope: vi.fn(actual.resolveRememberedPathForScope),
	}
})

const mockedResolveRememberedPathForScope = vi.mocked(resolveRememberedPathForScope)

describe('ShellSidebar', () => {
	beforeEach(() => {
		mockedResolveRememberedPathForScope.mockImplementation(async ({ defaultPath }) => defaultPath)
	})

	it('按 settings 渲染主导航；App 侧栏不再展示设置入口', () => {
		renderShellSidebar({
			mainItems: {
				allTasks: { visible: false, order: 200 },
				views: { visible: true, order: 300 },
				projectOverview: { visible: true, order: 400 },
			},
			projectSection: {
				visible: true,
				order: 500,
				collapsed: false,
				showCounts: true,
				showCompleted: true,
				maxVisible: null,
			},
			footerItems: {
				archive: { visible: true, order: 900 },
				trash: { visible: true, order: 1000 },
			},
			width: 256,
			desktopPreference: 'expanded',
		})

		expect(screen.getByRole('link', { name: '独立事项' })).toBeInTheDocument()
		expect(screen.queryByRole('link', { name: '所有任务' })).not.toBeInTheDocument()
		expect(screen.getByRole('link', { name: '视图' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '项目总览' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '归档' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '回收站' })).toBeInTheDocument()
		expect(screen.queryByRole('link', { name: '设置' })).not.toBeInTheDocument()
	})

	it('All scope 下隐藏项目总览与项目列表（含独立事项），保留所有任务与视图', () => {
		renderShellSidebar(
			{
				mainItems: {
					allTasks: { visible: true, order: 200 },
					views: { visible: true, order: 300 },
					projectOverview: { visible: true, order: 400 },
				},
				projectSection: {
					visible: true,
					order: 500,
					collapsed: false,
					showCounts: true,
					showCompleted: true,
					maxVisible: null,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
				width: 256,
				desktopPreference: 'expanded',
			},
			[{ id: 'project-1', label: 'StoneFlow VNext' }],
			{
				currentScope: { type: 'all' },
				currentSpaceId: null,
			},
		)

		expect(screen.getByRole('link', { name: '所有任务' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '视图' })).toBeInTheDocument()
		expect(screen.queryByRole('link', { name: '项目总览' })).not.toBeInTheDocument()
		expect(screen.queryByRole('link', { name: '独立事项' })).not.toBeInTheDocument()
		expect(screen.queryByRole('link', { name: 'StoneFlow VNext' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '切换 Space' })).toHaveAccessibleName('切换 Space')
		expect(screen.getByText('所有空间')).toBeInTheDocument()
	})

	it('项目 badge 会显示在 sidebar 项目行上', () => {
		renderShellSidebar(
			{
				mainItems: {
					allTasks: { visible: true, order: 200 },
					views: { visible: true, order: 300 },
					projectOverview: { visible: true, order: 400 },
				},
				projectSection: {
					visible: true,
					order: 500,
					collapsed: false,
					showCounts: true,
					showCompleted: true,
					maxVisible: null,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
				width: 256,
				desktopPreference: 'expanded',
			},
			[
				{
					id: 'project-1',
					label: 'StoneFlow VNext',
					badge: '7',
				},
			],
		)

		expect(screen.getByText('7')).toBeInTheDocument()
	})

	it('Space 删除会打开统一确认弹窗，并默认聚焦确认按钮', async () => {
		const onDeleteSpace = vi.fn(async () => mockSpaceRemovalResult(null))
		renderShellSidebar(
			{
				mainItems: {
					allTasks: { visible: true, order: 200 },
					views: { visible: true, order: 300 },
					projectOverview: { visible: true, order: 400 },
				},
				projectSection: {
					visible: true,
					order: 500,
					collapsed: false,
					showCounts: true,
					showCompleted: true,
					maxVisible: null,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
				width: 256,
				desktopPreference: 'expanded',
			},
			[{ id: 'project-1', label: 'StoneFlow VNext' }],
			{
				onDeleteSpace,
				spaces: [{ ...mockSpace, isDefault: false }],
			},
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '切换 Space' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '编辑空间' }))
		fireEvent.pointerMove(await screen.findByRole('menuitem', { name: '删除' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '删除' }))

		const dialog = await screen.findByRole('alertdialog')
		expect(dialog).toHaveFocus()
		const confirmButton = screen.getByRole('button', { name: '移入回收站' })

		fireEvent.click(confirmButton)

		await waitFor(() => {
			expect(onDeleteSpace).toHaveBeenCalledWith('space-personal')
		})
	})

	it('当前 Space 是默认空间时不允许归档或删除', async () => {
		const onArchiveSpace = vi.fn(async () => mockSpaceRemovalResult('space-personal'))
		const onDeleteSpace = vi.fn(async () => mockSpaceRemovalResult('space-personal'))
		renderShellSidebar(
			{
				mainItems: {
					allTasks: { visible: true, order: 200 },
					views: { visible: true, order: 300 },
					projectOverview: { visible: true, order: 400 },
				},
				projectSection: {
					visible: true,
					order: 500,
					collapsed: false,
					showCounts: true,
					showCompleted: true,
					maxVisible: null,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
				width: 256,
				desktopPreference: 'expanded',
			},
			[],
			{
				onArchiveSpace,
				onDeleteSpace,
				spaces: [mockSpace],
			},
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '切换 Space' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '编辑空间' }))

		const archiveItem = await screen.findByRole('menuitem', { name: '归档' })
		const deleteItem = await screen.findByRole('menuitem', { name: '删除' })
		expect(archiveItem).toHaveAttribute('aria-disabled', 'true')
		expect(deleteItem).toHaveAttribute('aria-disabled', 'true')

		fireEvent.click(archiveItem)
		fireEvent.click(deleteItem)

		expect(onArchiveSpace).not.toHaveBeenCalled()
		expect(onDeleteSpace).not.toHaveBeenCalled()
	})

	it('Space 新建和编辑弹窗可从切换菜单打开', async () => {
		renderShellSidebar({
			mainItems: {
				allTasks: { visible: true, order: 200 },
				views: { visible: true, order: 300 },
				projectOverview: { visible: true, order: 400 },
			},
			projectSection: {
				visible: true,
				order: 500,
				collapsed: false,
				showCounts: true,
				showCompleted: true,
				maxVisible: null,
			},
			footerItems: {
				archive: { visible: true, order: 900 },
				trash: { visible: true, order: 1000 },
			},
			width: 256,
			desktopPreference: 'expanded',
		})

		fireEvent.pointerDown(screen.getByRole('button', { name: '切换 Space' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '新建空间' }))
		expect(await screen.findByRole('dialog', { name: '新建 Space' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Close' }))
		await waitFor(() => {
			expect(screen.queryByRole('dialog', { name: '新建 Space' })).not.toBeInTheDocument()
		})

		fireEvent.pointerDown(screen.getByRole('button', { name: '切换 Space' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '编辑空间' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '编辑当前空间' }))
		expect(await screen.findByRole('dialog', { name: '编辑 Space' })).toBeInTheDocument()
	})

	it('项目区和 footer 一起位于 AppScrollArea 滚动容器内，内容不足时 footer 仍可贴底', () => {
		renderShellSidebar({
			mainItems: {
				allTasks: { visible: true, order: 200 },
				views: { visible: true, order: 300 },
				projectOverview: { visible: true, order: 400 },
			},
			projectSection: {
				visible: true,
				order: 500,
				collapsed: false,
				showCounts: true,
				showCompleted: true,
				maxVisible: null,
			},
			footerItems: {
				archive: { visible: true, order: 900 },
				trash: { visible: true, order: 1000 },
			},
			width: 256,
			desktopPreference: 'expanded',
		})

		const projectLink = screen.getByRole('link', { name: 'StoneFlow VNext' })
		const scrollContainer = projectLink.closest('[data-scroll-container="true"]')
		const footerLink = screen.getByRole('link', { name: '归档' })
		const sidebarContent = projectLink.closest('[data-slot="sidebar-content"]')
		const footer = footerLink.closest('[data-slot="sidebar-footer"]')

		expect(scrollContainer).toHaveAttribute('data-scroll-container', 'true')
		expect(sidebarContent).toHaveClass('overflow-y-hidden')
		expect(footerLink.closest('[data-scroll-container="true"]')).toBe(scrollContainer)
		expect(footer).toHaveClass('mt-auto')
	})

	it('从顶部 Space 下拉选择其他 space 后会导航到该 space 的工作页', async () => {
		renderShellSidebar(
			{
				mainItems: {
					allTasks: { visible: true, order: 200 },
					views: { visible: true, order: 300 },
					projectOverview: { visible: true, order: 400 },
				},
				projectSection: {
					visible: true,
					order: 500,
					collapsed: false,
					showCounts: true,
					showCompleted: true,
					maxVisible: null,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
				width: 256,
				desktopPreference: 'expanded',
			},
			[],
			{
				spaces: [
					mockSpace,
					{
						...mockSpace,
						id: 'space-work',
						name: '工作',
						isDefault: false,
					},
				],
			},
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '切换 Space' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '工作' }))

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/space-work/standalone')
		})
	})

	it('删除当前非默认空间后会跳到默认 Space 的任务页', async () => {
		const onDeleteSpace = vi.fn(async () => mockSpaceRemovalResult('space-work'))
		renderShellSidebar(
			{
				mainItems: {
					allTasks: { visible: true, order: 200 },
					views: { visible: true, order: 300 },
					projectOverview: { visible: true, order: 400 },
				},
				projectSection: {
					visible: true,
					order: 500,
					collapsed: false,
					showCounts: true,
					showCompleted: true,
					maxVisible: null,
				},
				footerItems: {
					archive: { visible: true, order: 900 },
					trash: { visible: true, order: 1000 },
				},
				width: 256,
				desktopPreference: 'expanded',
			},
			[],
			{
				onDeleteSpace,
				spaces: [
					{ ...mockSpace, isDefault: false },
					{
						...mockSpace,
						id: 'space-work',
						name: '工作',
						isDefault: true,
					},
				],
			},
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '切换 Space' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '编辑空间' }))
		fireEvent.pointerMove(await screen.findByRole('menuitem', { name: '删除' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '删除' }))
		fireEvent.click(await screen.findByRole('button', { name: '移入回收站' }))

		await waitFor(() => {
			expect(onDeleteSpace).toHaveBeenCalledWith('space-personal')
		})
		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/space-work/tasks')
		})
	})
})

function renderShellSidebar(
	settings: Parameters<typeof ShellSidebar>[0]['settings'],
	projects: Parameters<typeof ShellSidebar>[0]['projects'] = [
		{
			id: 'project-1',
			label: 'StoneFlow VNext',
		},
	],
	overrides?: Partial<Parameters<typeof ShellSidebar>[0]>,
) {
	return renderWithRouterContext(
		<SubmitRegistryProvider>
			<DangerConfirmProvider>
				<SyncStatusProvider>
					<TooltipProvider>
						<SidebarProvider desktopPreference='expanded' sidebarWidth={settings.width}>
							<LocationProbe />
							<ShellSidebar
								currentScope={{ type: 'space', spaceId: 'space-personal' }}
								currentSpaceId='space-personal'
								onArchiveSpace={async () => mockSpaceRemovalResult(null)}
								onCreateSpace={async () => mockSpace}
								onDeleteSpace={async () => mockSpaceRemovalResult(null)}
								onOpenProjectCreateDialog={() => undefined}
								onResetMainItemsVisibility={() => undefined}
								onSetDefaultSpace={async () => mockSpace}
								onUpdateItemVisibility={() => undefined}
								onUpdateSpace={async () => mockSpace}
								projects={projects}
								spaces={[mockSpace]}
								settings={settings}
								{...overrides}
							/>
						</SidebarProvider>
					</TooltipProvider>
				</SyncStatusProvider>
			</DangerConfirmProvider>
		</SubmitRegistryProvider>,
		{
			initialEntry: '/space-personal/standalone',
		},
	)
}

function LocationProbe() {
	const location = useLocation()

	return (
		<div data-testid='location'>
			{location.pathname}
			{location.searchStr}
		</div>
	)
}

const mockSpace = {
	id: 'space-personal',
	name: '个人',
	iconKey: 'user',
	colorKey: 'blue',
	isDefault: true,
	position: 100,
	archivedAt: null,
	deletedAt: null,
	createdAt: '2026-04-30T00:00:00.000Z',
	updatedAt: '2026-04-30T00:00:00.000Z',
}

function mockSpaceRemovalResult(defaultSpaceId: string | null) {
	return {
		space: mockSpace,
		defaultSpaceId,
		affectedProjectCount: 0,
		affectedTaskCount: 0,
	}
}
