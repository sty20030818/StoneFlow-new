import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import { SidebarProvider } from '@/shared/ui/base/sidebar'
import { TooltipProvider } from '@/shared/ui/base/tooltip'

describe('ShellSidebar', () => {
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
		<MemoryRouter initialEntries={['/space/space-personal/inbox']}>
			<DangerConfirmProvider>
				<TooltipProvider>
					<SidebarProvider desktopPreference='expanded' sidebarWidth={settings.width}>
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
		</MemoryRouter>,
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
