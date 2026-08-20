import { fireEvent, screen } from '@testing-library/react'
import { ContextMenu, Sidebar } from '@heroui-pro/react'
import { ListTodoIcon } from 'lucide-react'

import { COMMAND_IDS } from '@/features/command'
import { renderWithRouterContext } from '@/test/renderWithRouter'

import { SidebarNavRow, SidebarProjectNavRow } from './SidebarNavRow'

describe('SidebarNavRow', () => {
	it('Space 路由变化时保持 React Aria collection item 身份稳定', async () => {
		const renderRow = (to: string) => (
			<Sidebar.Provider toggleShortcut={false}>
				<Sidebar.Menu aria-label='导航'>
					<SidebarNavRow
						commandId={COMMAND_IDS.goAllTasks}
						icon={ListTodoIcon}
						label='所有任务'
						to={to}
					/>
				</Sidebar.Menu>
			</Sidebar.Provider>
		)
		const view = await renderWithRouterContext(renderRow('/space-a/tasks'))

		await expect(view.rerender(renderRow('/space-b/tasks'))).resolves.toBeUndefined()
		const row = screen.getByRole('row', { name: '所有任务' })
		expect(row).toHaveAttribute('data-href', '/space-b/tasks')
		expect(row).toHaveAttribute('data-key', `nav:${COMMAND_IDS.goAllTasks}`)
	})

	it('右键菜单打开时把 Open 状态保留在触发器上', async () => {
		await renderWithRouterContext(
			<Sidebar.Provider toggleShortcut={false}>
				<Sidebar.Menu aria-label='导航'>
					<SidebarNavRow
						commandId={COMMAND_IDS.goAllTasks}
						contextMenuContent={
							<ContextMenu.Popover>
								<ContextMenu.Menu aria-label='所有任务操作'>
									<ContextMenu.Item id='archive'>归档</ContextMenu.Item>
								</ContextMenu.Menu>
							</ContextMenu.Popover>
						}
						icon={ListTodoIcon}
						label='所有任务'
						to='/space-a/tasks'
					/>
				</Sidebar.Menu>
			</Sidebar.Provider>,
		)

		const label = screen.getByText('所有任务')
		fireEvent.contextMenu(label)

		expect(await screen.findByRole('menuitem', { name: '归档' })).toBeInTheDocument()
		expect(label.closest('[data-open="true"]')).toBeInTheDocument()
	})

	it('项目路由随 Space 变化时仍以项目 id 保持 collection item 身份', async () => {
		const renderRow = (to: string) => (
			<Sidebar.Provider toggleShortcut={false}>
				<Sidebar.Menu aria-label='项目导航'>
					<SidebarProjectNavRow icon={ListTodoIcon} label='项目 A' projectId='project-a' to={to} />
				</Sidebar.Menu>
			</Sidebar.Provider>
		)
		const view = await renderWithRouterContext(renderRow('/space-a/project/project-a'))

		await expect(view.rerender(renderRow('/space-b/project/project-a'))).resolves.toBeUndefined()
		const row = screen.getByRole('row', { name: '项目 A' })
		expect(row).toHaveAttribute('data-href', '/space-b/project/project-a')
		expect(row).toHaveAttribute('data-key', 'project:project-a')
	})
})
