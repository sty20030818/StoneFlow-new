import { fireEvent, render, screen } from '@testing-library/react'
import { ContextMenu } from '@heroui-pro/react'

import { ShellMain } from './ShellMain'

vi.mock('@/features/entity-detail', () => ({
	EntityDetailDrawerHost: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/features/task', () => ({
	TaskPreview: () => null,
	useTaskPreviewController: () => ({
		closePreview: vi.fn(),
		previewState: { open: false },
	}),
}))

function renderShellMain(
	children: React.ReactNode = (
		<>
			<button type='button'>页面按钮</button>
			<div data-testid='blank'>空白区</div>
		</>
	),
) {
	const onOpenTaskCreateDialog = vi.fn()
	render(
		<ShellMain
			activeDetail={null}
			isCompact={false}
			isDrawerOpen={false}
			onCloseDrawer={() => undefined}
			onOpenProjectCreateDialog={() => undefined}
			onOpenTaskCreateDialog={onOpenTaskCreateDialog}
		>
			{children}
		</ShellMain>,
	)
	return { onOpenTaskCreateDialog }
}

describe('ShellMain', () => {
	it('只在主内容空白区打开全局菜单', async () => {
		const { onOpenTaskCreateDialog } = renderShellMain()

		fireEvent.contextMenu(screen.getByRole('button', { name: '页面按钮' }), {
			clientX: 20,
			clientY: 20,
		})
		expect(screen.queryByRole('menuitem', { name: '新建任务' })).not.toBeInTheDocument()

		fireEvent.contextMenu(screen.getByTestId('blank'), { clientX: 20, clientY: 20 })
		const createTask = await screen.findByRole('menuitem', { name: '新建任务' })
		fireEvent.click(createTask)
		expect(onOpenTaskCreateDialog).toHaveBeenCalledOnce()
	})

	it('内嵌右键菜单先于全局菜单处理', async () => {
		const onInnerAction = vi.fn()
		renderShellMain(
			<ContextMenu>
				<ContextMenu.Trigger>
					<div data-shell-task-card data-testid='task-row'>
						任务行
					</div>
				</ContextMenu.Trigger>
				<ContextMenu.Popover>
					<ContextMenu.Menu aria-label='任务操作'>
						<ContextMenu.Item onAction={onInnerAction}>编辑任务</ContextMenu.Item>
					</ContextMenu.Menu>
				</ContextMenu.Popover>
			</ContextMenu>,
		)

		fireEvent.contextMenu(screen.getByTestId('task-row'), { clientX: 20, clientY: 20 })
		const editTask = await screen.findByRole('menuitem', { name: '编辑任务' })
		expect(screen.queryByRole('menuitem', { name: '新建任务' })).not.toBeInTheDocument()

		fireEvent.click(editTask)
		expect(onInnerAction).toHaveBeenCalledOnce()
	})
})
