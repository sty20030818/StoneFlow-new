import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { Button, Modal, Popover } from '@heroui/react'
import { ContextMenu, Sheet } from '@heroui-pro/react'

import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import { UserAppMenu } from '@/layout/header/UserAppMenu'

const shortcutRegistry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

describe('Shell Overlay focus matrix', () => {
	it('Tooltip → Menu：打开菜单关闭 Tooltip，外点关闭，Escape 恢复普通 trigger', async () => {
		renderWithShortcuts(
			<>
				<UserAppMenu onOpenAbout={vi.fn()} onOpenChangelog={vi.fn()} onRunCommand={vi.fn()} />
				<button data-testid='outside-target' type='button'>
					外部目标
				</button>
			</>,
		)
		const trigger = screen.getByRole('button', { name: '应用菜单' })

		fireEvent.pointerMove(trigger, { pointerType: 'mouse' })
		fireEvent.pointerEnter(trigger, { pointerType: 'mouse' })
		expect(await screen.findByRole('tooltip')).toHaveTextContent('应用菜单')

		fireEvent.pointerDown(trigger, { pointerType: 'mouse' })
		fireEvent.pointerUp(trigger, { pointerType: 'mouse' })
		expect(await screen.findByRole('menu', { name: '应用菜单' })).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())

		const outsideTarget = screen.getByTestId('outside-target')
		fireEvent.pointerDown(outsideTarget, { pointerType: 'mouse' })
		fireEvent.pointerUp(outsideTarget, { pointerType: 'mouse' })
		fireEvent.click(outsideTarget)
		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

		fireEvent.keyDown(document, { key: 'Tab' })
		trigger.focus()
		fireEvent.keyDown(trigger, { key: 'Enter' })
		fireEvent.keyUp(trigger, { key: 'Enter' })
		await screen.findByRole('menu', { name: '应用菜单' })
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
		fireEvent.keyDown(screen.getByRole('menuitem', { name: /设置/ }), { key: 'Escape' })
		await waitFor(() => {
			expect(screen.queryByRole('menu')).not.toBeInTheDocument()
			expect(trigger).toHaveFocus()
		})
	})

	it('Popover → Dialog：Escape 只关闭最高层 Dialog 并恢复 Popover 内 trigger', async () => {
		render(<PopoverDialogProbe />)
		const dialogTrigger = await screen.findByRole('button', { name: '打开 Dialog' })

		dialogTrigger.focus()
		fireEvent.click(dialogTrigger)
		const dialog = await screen.findByRole('dialog', { name: '嵌套 Dialog' })
		fireEvent.keyDown(dialog, { key: 'Escape' })

		await waitFor(() => {
			expect(screen.queryByRole('dialog', { name: '嵌套 Dialog' })).not.toBeInTheDocument()
			expect(screen.getByRole('dialog', { name: '操作 Popover' })).toBeInTheDocument()
			expect(dialogTrigger).toHaveFocus()
		})
	})

	it('ContextMenu submenu：两次 Escape 依次关闭子菜单与根菜单', async () => {
		render(<ContextMenuProbe />)
		fireEvent.contextMenu(screen.getByTestId('context-target'), { clientX: 20, clientY: 20 })
		const rootMenu = await screen.findByRole('menu', { name: '根菜单' })
		const submenuTrigger = screen.getByRole('menuitem', { name: /更多/ })

		submenuTrigger.focus()
		fireEvent.keyDown(submenuTrigger, { key: 'ArrowRight' })
		const submenu = await screen.findByRole('menu', { name: /更多/ })
		fireEvent.keyDown(submenu, { key: 'Escape' })

		await waitFor(() => {
			expect(screen.queryByRole('menu', { name: /更多/ })).not.toBeInTheDocument()
			expect(rootMenu).toBeInTheDocument()
		})

		fireEvent.keyDown(rootMenu, { key: 'Escape' })
		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
	})

	it('Sheet：Escape 关闭并恢复普通 trigger', async () => {
		render(<SheetProbe />)
		const trigger = screen.getByRole('button', { name: '打开 Sheet' })

		trigger.focus()
		fireEvent.click(trigger)
		const dialog = await screen.findByRole('dialog', { name: '共享 Sheet' })
		fireEvent.keyDown(dialog, { key: 'Escape' })

		await waitFor(() => {
			expect(screen.queryByRole('dialog', { name: '共享 Sheet' })).not.toBeInTheDocument()
			expect(trigger).toHaveFocus()
		})
	})
})

function renderWithShortcuts(ui: React.ReactNode) {
	return render(
		<ShortcutRegistryProvider registry={shortcutRegistry}>{ui}</ShortcutRegistryProvider>,
	)
}

function PopoverDialogProbe() {
	const [dialogOpen, setDialogOpen] = useState(false)

	return (
		<>
			<Popover isOpen>
				<Button>Popover trigger</Button>
				<Popover.Content>
					<Popover.Dialog aria-label='操作 Popover'>
						<Button onPress={() => setDialogOpen(true)}>打开 Dialog</Button>
					</Popover.Dialog>
				</Popover.Content>
			</Popover>
			<Modal.Backdrop isOpen={dialogOpen} onOpenChange={(nextOpen) => setDialogOpen(nextOpen)}>
				<Modal.Container>
					<Modal.Dialog aria-label='嵌套 Dialog'>Dialog 内容</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</>
	)
}

function ContextMenuProbe() {
	return (
		<ContextMenu>
			<ContextMenu.Trigger data-testid='context-target'>右键目标</ContextMenu.Trigger>
			<ContextMenu.Popover>
				<ContextMenu.Menu aria-label='根菜单'>
					<ContextMenu.SubmenuTrigger>
						<ContextMenu.Item id='more' textValue='更多'>
							更多
							<ContextMenu.SubmenuIndicator />
						</ContextMenu.Item>
						<ContextMenu.Popover placement='right top'>
							<ContextMenu.Menu aria-label='子菜单'>
								<ContextMenu.Item id='rename' textValue='重命名'>
									重命名
								</ContextMenu.Item>
							</ContextMenu.Menu>
						</ContextMenu.Popover>
					</ContextMenu.SubmenuTrigger>
				</ContextMenu.Menu>
			</ContextMenu.Popover>
		</ContextMenu>
	)
}

function SheetProbe() {
	return (
		<Sheet>
			<Sheet.Trigger>
				<Button>打开 Sheet</Button>
			</Sheet.Trigger>
			<Sheet.Backdrop>
				<Sheet.Content>
					<Sheet.Dialog>
						<Sheet.Heading>共享 Sheet</Sheet.Heading>
						<Sheet.Body>Sheet 内容</Sheet.Body>
					</Sheet.Dialog>
				</Sheet.Content>
			</Sheet.Backdrop>
		</Sheet>
	)
}
