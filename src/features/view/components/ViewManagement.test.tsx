import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useLocation } from '@tanstack/react-router'

import { parseShellRoute, ShellRouteProvider } from '@/app/navigation'
import { BulkActionProvider } from '@/features/bulk-action'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import { CommandSelectionProvider } from '@/features/selection'
import { TaskPreviewProvider } from '@/features/task'
import type { View } from '@/shared/types'
import { renderWithMatchedRoute } from '@/test/renderWithRouter'
import { TestInteractionProviders } from '@/test/TestInteractionProviders'

import { ViewsPage } from './ViewsPage'
import { SavedViewPage } from './SavedViewPage'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock, isTauri: () => false }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => vi.fn()) }))

it('详情删除的迟到成功只移除旧 View，不把用户从新详情拉回 Library', async () => {
	const pending = Promise.withResolvers<void>()
	let records: View[] = [savedView(), { ...savedView(), id: 'view-2', name: '另一页的视图' }]
	invokeMock.mockImplementation(
		async (command: string, args?: { input?: { viewId?: string }; viewId?: string }) => {
			switch (command) {
				case 'list_views':
					return structuredClone(records)
				case 'list_sidebar_projects':
				case 'list_visible_spaces':
					return []
				case 'run_task_view':
					return {
						view: records.find((view) => view.id === args!.input!.viewId),
						items: [],
						totalCount: 0,
						nextCursor: null,
					}
				case 'delete_view':
					await pending.promise
					records = records.filter((view) => view.id !== args!.viewId)
					return undefined
				default:
					throw new Error(`未定义的测试 IPC：${command}`)
			}
		},
	)
	const { router } = await renderWithMatchedRoute(<DetailTestPage />, {
		path: '/all/views/$viewId',
		initialEntry: '/all/views/view-1',
		wrap: (children) => <TestInteractionProviders>{children}</TestInteractionProviders>,
	})
	fireEvent.click(await screen.findByRole('button', { name: '视图操作' }))
	fireEvent.click(await screen.findByRole('menuitem', { name: '删除保存视图' }))
	await act(async () => {
		await router.navigate({
			to: '/$scopeKey/views/$viewId',
			params: { scopeKey: 'all', viewId: 'view-2' },
		})
	})
	expect(await screen.findByRole('radio', { name: '另一页的视图' })).toBeChecked()
	await act(async () => pending.resolve())
	await waitFor(() => expect(records.map((view) => view.id)).toEqual(['view-2']))
	expect(router.state.location.pathname).toBe('/all/views/view-2')
	expect(screen.getByRole('radio', { name: '另一页的视图' })).toBeChecked()
})

it('真实 Library 经 IPC 重命名和删除失败后保留记录，键盘重试后更新列表', async () => {
	let records: View[] = [savedView()]
	let renameAttempts = 0
	let deleteAttempts = 0
	invokeMock.mockImplementation(
		async (command: string, args?: { input?: { name?: string }; viewId?: string }) => {
			switch (command) {
				case 'list_views':
					return structuredClone(records)
				case 'list_sidebar_projects':
					return []
				case 'update_view':
					if (++renameAttempts === 1) throw new Error('同步写入失败，请重试')
					records = [{ ...records[0]!, name: args!.input!.name! }]
					return structuredClone(records[0])
				case 'delete_view':
					if (++deleteAttempts === 1) throw new Error('暂时无法删除')
					records = records.filter((view) => view.id !== args!.viewId)
					return undefined
				default:
					throw new Error(`未定义的测试 IPC：${command}`)
			}
		},
	)
	await renderWithMatchedRoute(<ViewsPage />, {
		path: '/all/views',
		initialEntry: '/all/views',
		wrap: (children) => (
			<TestInteractionProviders>
				<ShellRouteProvider shellRoute={parseShellRoute('/all/views')}>
					{children}
				</ShellRouteProvider>
			</TestInteractionProviders>
		),
	})
	const row = await screen.findByRole('row', { name: /原来的名称/ })
	const trigger = within(row).getByRole('button', { name: '视图操作' })
	fireEvent.click(trigger)
	pressEnter(await screen.findByRole('menuitem', { name: '编辑保存视图' }))
	const name = await screen.findByRole('textbox', { name: '名称' })
	fireEvent.change(name, { target: { value: '键盘修改的新名称' } })
	fireEvent.submit(name.closest('form')!)
	expect(await screen.findByRole('alert')).toHaveTextContent('同步写入失败，请重试')
	expect(name).toHaveValue('键盘修改的新名称')
	expect(records[0]!.name).toBe('原来的名称')
	fireEvent.submit(name.closest('form')!)
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	const updatedRow = await screen.findByRole('row', { name: /键盘修改的新名称/ })
	expect(records[0]!.filters).toEqual(savedView().filters)
	expect(renameAttempts).toBe(2)
	const updatedTrigger = within(updatedRow).getByRole('button', { name: '视图操作' })
	// ListView 恢复当前行的集合焦点，保留方向键导航的起点。
	await waitFor(() => expect(updatedRow).toHaveFocus())
	fireEvent.click(updatedTrigger)
	pressEnter(await screen.findByRole('menuitem', { name: '删除保存视图' }))
	expect(await screen.findByRole('alert')).toHaveTextContent('暂时无法删除')
	expect(records).toHaveLength(1)
	expect(updatedRow).toBeInTheDocument()
	const retry = screen.getByRole('menuitem', { name: '重试删除' })
	fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' })
	await waitFor(() => expect(retry).toHaveFocus())
	pressEnter(retry)
	expect(await screen.findByText('还没有保存视图')).toBeInTheDocument()
	expect(records).toHaveLength(0)
	expect(deleteAttempts).toBe(2)
})

function pressEnter(element: HTMLElement) {
	fireEvent.keyDown(element, { key: 'Enter' })
	fireEvent.keyUp(element, { key: 'Enter' })
}

function DetailTestPage() {
	const location = useLocation()
	return (
		<ShellRouteProvider shellRoute={parseShellRoute(location.pathname)}>
			<CommandSelectionProvider>
				<TaskPreviewProvider>
					<DangerConfirmProvider>
						<BulkActionProvider actions={[]}>
							<SavedViewPage />
						</BulkActionProvider>
					</DangerConfirmProvider>
				</TaskPreviewProvider>
			</CommandSelectionProvider>
		</ShellRouteProvider>
	)
}

function savedView(): View {
	return {
		id: 'view-1',
		name: '原来的名称',
		scope: { type: 'all' },
		context: { kind: 'all' },
		baseViewKey: 'active',
		filters: { clauses: [{ id: 'status', field: 'status', op: 'is', values: ['todo'] }] },
		position: 1,
		createdAt: '2026-09-13T00:00:00Z',
		updatedAt: '2026-09-13T00:00:00Z',
	}
}
