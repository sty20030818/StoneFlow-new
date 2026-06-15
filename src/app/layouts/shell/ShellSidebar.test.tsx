import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'
import { resolveRememberedPathForScope } from '@/app/layouts/shell/model/shellDevicePreferences'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import { SubmitRegistryProvider } from '@/features/submit/model'
import { SidebarProvider } from '@/shared/ui/base/sidebar'
import { TooltipProvider } from '@/shared/ui/base/tooltip'

vi.mock('@/app/layouts/shell/model/shellDevicePreferences', async () => {
	const actual = await vi.importActual<
		typeof import('@/app/layouts/shell/model/shellDevicePreferences')
	>('@/app/layouts/shell/model/shellDevicePreferences')

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

	it('按 settings 渲染主导航，并把设置固定放在回收站之后', () => {
		renderShellSidebar({
			mainItems: {
				inbox: { visible: true, order: 100 },
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

		expect(screen.getByRole('link', { name: '收件箱' })).toBeInTheDocument()
		expect(screen.queryByRole('link', { name: '所有任务' })).not.toBeInTheDocument()
		expect(screen.getByRole('link', { name: '视图' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '项目总览' })).toBeInTheDocument()
		const archiveLink = screen.getByRole('link', { name: '归档' })
		const trashLink = screen.getByRole('link', { name: '回收站' })
		const settingsLink = screen.getByRole('link', { name: '设置' })

		expect(archiveLink).toBeInTheDocument()
		expect(trashLink).toBeInTheDocument()
		expect(settingsLink).toBeInTheDocument()
		expect(
			trashLink.compareDocumentPosition(settingsLink) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy()
	})

	it('项目 badge 会显示在 sidebar 项目行上', () => {
		renderShellSidebar(
			{
				mainItems: {
					inbox: { visible: true, order: 100 },
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
		const onDeleteSpace = vi.fn(async () => mockSpace)
		renderShellSidebar(
			{
				mainItems: {
					inbox: { visible: true, order: 100 },
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

	it('Space 新建和编辑弹窗可从切换菜单打开', async () => {
		renderShellSidebar({
			mainItems: {
				inbox: { visible: true, order: 100 },
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
				inbox: { visible: true, order: 100 },
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
					inbox: { visible: true, order: 100 },
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
			expect(screen.getByTestId('location')).toHaveTextContent('/spaces/space-work/inbox')
		})
	})

	it('删除当前空间后会跳到剩余默认空间的收件箱', async () => {
		const onDeleteSpace = vi.fn(async () => mockSpace)
		renderShellSidebar(
			{
				mainItems: {
					inbox: { visible: true, order: 100 },
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
			expect(screen.getByTestId('location')).toHaveTextContent('/spaces/space-work/inbox')
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
	return render(
		<MemoryRouter initialEntries={['/spaces/space-personal/inbox']}>
			<SubmitRegistryProvider>
				<DangerConfirmProvider>
					<TooltipProvider>
						<SidebarProvider desktopPreference='expanded' sidebarWidth={settings.width}>
							<LocationProbe />
							<ShellSidebar
								currentScope={{ type: 'space', spaceId: 'space-personal' }}
								currentSpaceId='space-personal'
								onArchiveSpace={async () => mockSpace}
								onCreateSpace={async () => mockSpace}
								onDeleteSpace={async () => mockSpace}
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
				</DangerConfirmProvider>
			</SubmitRegistryProvider>
		</MemoryRouter>,
	)
}

function LocationProbe() {
	const location = useLocation()

	return (
		<div data-testid='location'>
			{location.pathname}
			{location.search}
		</div>
	)
}

const mockSpace = {
	id: 'space-personal',
	name: '个人',
	iconKey: 'user',
	colorKey: 'blue',
	isDefault: true,
	sortOrder: 100,
	archivedAt: null,
	deletedAt: null,
	createdAt: '2026-04-30T00:00:00.000Z',
	updatedAt: '2026-04-30T00:00:00.000Z',
}
