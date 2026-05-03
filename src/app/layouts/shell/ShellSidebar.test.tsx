import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'
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
		expect(screen.queryByRole('link', { name: '全部任务' })).not.toBeInTheDocument()
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
})

function renderShellSidebar(settings: Parameters<typeof ShellSidebar>[0]['settings']) {
	return render(
		<MemoryRouter initialEntries={['/space/space-personal/inbox']}>
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
						projects={[
							{
								id: 'project-1',
								label: 'StoneFlow VNext',
							},
						]}
						spaces={[mockSpace]}
						settings={settings}
					/>
				</SidebarProvider>
			</TooltipProvider>
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
